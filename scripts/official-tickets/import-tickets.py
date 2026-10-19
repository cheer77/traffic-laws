#!/usr/bin/env python3
"""Bounded, reproducible PDF import. Never invent answers or image semantics."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
QUESTION = re.compile(r"^(\d+)\.\s+(.+)")
OPTION = re.compile(r"^(\d+)\)\s*(.*)")
SECTION = re.compile(r"^(\d+(?:\.\d+)?)\.\s+([А-ЯІЇЄҐ][А-ЯІЇЄҐ ()’'–-]+)$")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def extract(document, section: str, start: int, end: int):
    """Read ordered lines and embedded images; assign by question bounds, never image index."""
    current = None
    active = False
    entries = []
    for page_index in range(start - 1, end):
        page = document[page_index]
        blocks = page.get_text('dict')['blocks']
        events = []
        for block in blocks:
            if block['type'] == 1:
                events.append((block['bbox'][1], 'image', block))
            elif block['type'] == 0:
                for line in block['lines']:
                    text = ''.join(span['text'] for span in line['spans']).strip()
                    if text:
                        events.append((line['bbox'][1], 'text', {'text': text, 'bbox': line['bbox']}))
        for _, kind, value in sorted(events, key=lambda event: event[0]):
            if kind == 'text':
                text = value['text']
                # Printed page number is outside question content.
                if text == str(page_index + 1):
                    continue
                heading = SECTION.fullmatch(text)
                if heading:
                    if current:
                        entries.append(current)
                        current = None
                    active = heading[1] == section
                    continue
                if not active:
                    continue
                question = QUESTION.match(text)
                if question:
                    if current:
                        entries.append(current)
                    current = {'number': int(question[1]), 'question': question[2], 'options': [],
                               'images': [], 'page': page_index + 1, 'evidence': [], 'errors': []}
                elif current:
                    option = OPTION.match(text)
                    if option:
                        if int(option[1]) != len(current['options']) + 1:
                            current['errors'].append('nonsequential_options')
                        current['options'].append(option[2])
                    elif current['options']:
                        current['options'][-1] += ' ' + text
                    else:
                        current['question'] += ' ' + text
                if current:
                    current['evidence'].append({'page': page_index + 1, **value})
            elif active and current:
                current['images'].append({'page': page_index + 1, **value})
    if current:
        entries.append(current)
    return entries


def classify(question: str, has_image: bool) -> dict:
    spatial = re.search(r'перехрест|повор|поверт|дорогу|переваг|світлофор|маневр|напрям', question, re.I)
    if not has_image:
        return {'mode': '2d-only', 'reason': 'Немає ілюстрації для достовірної реконструкції.',
                'imageAnalysis': 'not_applicable'}
    if spatial:
        return {'mode': 'candidate-3d', 'reason': 'Текст описує просторову ситуацію та має оригінальну ілюстрацію. Зміст рисунка ще не проаналізовано.',
                'imageAnalysis': 'pending'}
    return {'mode': 'undetermined', 'reason': 'Потрібен аналіз змісту ілюстрації; поки доступний лише оригінал 2D.',
            'imageAnalysis': 'pending'}


def answer_for(evidence: dict, answer_hash: str, section: str, number: int, option_count: int):
    if evidence.get('documentSha256') != answer_hash or evidence.get('section') != section:
        return None
    rows = [row for row in evidence.get('entries', []) if row.get('question') == number]
    if len(rows) != 1:
        return None
    row = rows[0]
    if (type(row.get('answer')) is not int or not 1 <= row['answer'] <= option_count
            or row.get('status') != 'source_checked' or not row.get('page')
            or not row.get('method')):
        return None
    return {'index': row['answer'] - 1, 'page': row['page'], 'method': row['method'],
            'documentSha256': answer_hash, 'status': 'source_checked'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--questions', type=Path, default=ROOT / 'source-pdfs/POLOTNO-NAKAZ_04_09_2025.pdf')
    parser.add_argument('--answers', type=Path, default=ROOT / 'source-pdfs/Numer_-vidpovidej-do-nakazu.pdf')
    parser.add_argument('--answer-evidence', type=Path, default=ROOT / 'scripts/official-tickets/answer-evidence.json')
    parser.add_argument('--section', default='16.1')
    parser.add_argument('--start-page', type=int, default=173)
    parser.add_argument('--end-page', type=int, default=176)
    parser.add_argument('--limit', type=int, default=10)
    parser.add_argument('--ticket', type=int, help='Retry one question; preserve other records from the same source')
    parser.add_argument('--output', type=Path, default=ROOT / 'apps/web/src/features/official-tickets/imported.json')
    parser.add_argument('--images', type=Path, default=ROOT / 'apps/web/public/official-import')
    args = parser.parse_args()
    if not re.fullmatch(r'\d+(?:\.\d+)?', args.section) or args.limit < 1:
        parser.error('Invalid section or limit')
    question_hash = digest(args.questions.read_bytes())
    answer_hash = digest(args.answers.read_bytes())
    evidence = json.loads(args.answer_evidence.read_text()) if args.answer_evidence.exists() else {}
    if evidence.get('questionDocumentSha256') != question_hash:
        evidence = {}
    document = pymupdf.open(args.questions)
    if not 1 <= args.start_page <= args.end_page <= len(document):
        parser.error('Invalid page range')
    extracted = extract(document, args.section, args.start_page, args.end_page)
    selected = [item for item in extracted if item['number'] == args.ticket] if args.ticket else extracted[:args.limit]
    if not selected or len({item['number'] for item in selected}) != len(selected):
        raise ValueError('Missing or duplicate question IDs; no output replaced')
    records = []
    args.images.mkdir(parents=True, exist_ok=True)
    for item in selected:
        number = item['number']
        identifier = f"ua-{args.section.replace('.', '-')}-{number:02}"
        errors = item['errors']
        if len(item['options']) < 2:
            errors.append('missing_options')
        images = []
        for block in item['images']:
            content_hash = digest(block['image'])
            name = content_hash + '.' + block['ext']
            (args.images / name).write_bytes(block['image'])
            images.append({'src': '/official-import/' + name, 'sha256': content_hash,
                           'width': block['width'], 'height': block['height'],
                           'sourcePage': block['page'], 'bbox': list(block['bbox'])})
        if len(images) > 1:
            errors.append('multiple_images_require_association_review')
        answer = None if errors else answer_for(evidence, answer_hash, args.section, number, len(item['options']))
        if not answer:
            errors.append('answer_unresolved')
        classification = classify(item['question'], bool(images))
        reasons = list(errors)
        if classification['mode'] != '2d-only':
            reasons.append('vision_adapter_not_connected')
        reasons.append('explanation_legal_review_pending')
        history = [{'stage': 'extracted', 'result': 'failed' if errors else 'passed', 'issues': list(errors)},
                   {'stage': 'classified', 'result': 'passed', 'issues': []}]
        if classification['mode'] != '2d-only':
            history.append({'stage': 'analyzing', 'result': 'blocked', 'issues': ['vision_adapter_not_connected']})
        history.append({'stage': 'needs_review', 'result': 'blocked', 'issues': reasons})
        records.append({'schemaVersion': 1, 'id': identifier, 'section': args.section, 'number': number,
                        'question': item['question'], 'options': item['options'], 'images': images,
                        'answer': answer, 'classification': classification, 'status': 'needs_review',
                        'issues': reasons, 'history': history, 'scene': None,
                        'explanation': {'status': 'unverified', 'text': None, 'references': []},
                        'source': {'questionDocument': args.questions.name, 'questionSha256': question_hash,
                                   'answerDocument': args.answers.name, 'answerSha256': answer_hash,
                                   'page': item['page'], 'editionStatus': 'not_independently_verified'},
                        'textEvidence': item['evidence']})
    if args.ticket and args.output.exists():
        previous = json.loads(args.output.read_text())
        if any(row['source']['questionSha256'] != question_hash or row['source']['answerSha256'] != answer_hash for row in previous):
            raise ValueError('Source changed: rerun the full selection, not a partial retry')
        merged = {row['id']: row for row in previous}
        merged.update({row['id']: row for row in records})
        records = sorted(merged.values(), key=lambda row: (row['section'], row['number']))
    write_json(args.output, records)
    print(json.dumps({'records': len(records), 'ready3d': 0, 'needsReview': len(records),
                      'answersResolved': sum(row['answer'] is not None for row in records)}))


if __name__ == '__main__':
    main()
