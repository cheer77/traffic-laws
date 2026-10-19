#!/usr/bin/env python3
"""Extract the first ten Section 16.1 illustrations without recompressing them."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import pymupdf


SOURCE_PAGE_AND_IMAGE_INDEX = {
    1: (173, 2),
    2: (174, 0),
    3: (174, 1),
    4: (174, 2),
    5: (175, 0),
    6: (175, 1),
    7: (175, 2),
    8: (176, 0),
    9: (176, 1),
    10: (176, 2),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    document = pymupdf.open(args.source)
    args.output.mkdir(parents=True, exist_ok=True)

    for question, (page_number, image_index) in SOURCE_PAGE_AND_IMAGE_INDEX.items():
        page = document[page_number - 1]
        images = [block for block in page.get_text("dict")["blocks"] if block["type"] == 1]
        if image_index >= len(images):
            raise RuntimeError(f"Page {page_number} has only {len(images)} embedded images")
        image = images[image_index]
        extension = image["ext"]
        output = args.output / f"16-1-{question:02}.{extension}"
        output.write_bytes(image["image"])
        digest = hashlib.sha256(image["image"]).hexdigest()
        print(
            f"question={question} page={page_number} bbox={image['bbox']} "
            f"size={image['width']}x{image['height']} sha256={digest} file={output}"
        )


if __name__ == "__main__":
    main()
