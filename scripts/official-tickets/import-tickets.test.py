import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys

spec = importlib.util.spec_from_file_location('importer', Path(__file__).with_name('import-tickets.py'))
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class ImportTests(unittest.TestCase):
    def test_answers_require_unique_bound_evidence_and_valid_index(self):
        evidence = {'documentSha256': 'abc', 'section': '16.1', 'entries': [
            {'question': 1, 'answer': 2, 'page': 4, 'status': 'source_checked', 'method': 'test'}]}
        self.assertEqual(importer.answer_for(evidence, 'abc', '16.1', 1, 3)['index'], 1)
        self.assertIsNone(importer.answer_for(evidence, 'changed', '16.1', 1, 3))
        self.assertIsNone(importer.answer_for(evidence, 'abc', '16.2', 1, 3))
        self.assertIsNone(importer.answer_for(evidence, 'abc', '16.1', 1, 1))
        evidence['entries'] *= 2
        self.assertIsNone(importer.answer_for(evidence, 'abc', '16.1', 1, 3))

    def test_classifier_does_not_claim_image_understanding(self):
        self.assertEqual(importer.classify('Який сигнал світлофора?', False)['mode'], '2d-only')
        self.assertEqual(importer.classify('Який сигнал світлофора?', True)['mode'], 'candidate-3d')
        self.assertEqual(importer.classify('Що зображено?', True)['mode'], 'undetermined')

    @unittest.skipUnless((importer.ROOT / 'source-pdfs/POLOTNO-NAKAZ_04_09_2025.pdf').exists(), 'Local source PDF not installed')
    def test_real_import_retry_and_missing_answer_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'imported.json'
            images = Path(folder) / 'images'
            args = ['import', '--output', str(output), '--images', str(images)]
            with patch.object(sys, 'argv', args):
                importer.main()
            original = output.read_bytes()
            rows = json.loads(original)
            self.assertEqual([row['number'] for row in rows], list(range(1, 11)))
            self.assertTrue(all(len(row['images']) == 1 for row in rows))
            self.assertTrue(all(row['status'] == 'needs_review' and row['scene'] is None for row in rows))
            with patch.object(sys, 'argv', args + ['--ticket', '4']):
                importer.main()
            self.assertEqual(output.read_bytes(), original)
            self.assertEqual(len(list(images.iterdir())), 10)
            with patch.object(sys, 'argv', args + ['--answer-evidence', str(Path(folder) / 'missing.json')]):
                importer.main()
            self.assertTrue(all(row['answer'] is None and 'answer_unresolved' in row['issues'] for row in json.loads(output.read_text())))


if __name__ == '__main__':
    unittest.main()
