"""Plain-text / markdown sentence segmentation.

The brief states a clause is always a single sentence, so labeling operates on
sentences. We keep the splitter deliberately simple and dependency-free:

  * Block boundaries (blank lines, markdown headings, list items) end a
    sentence — contracts are full of headings and enumerated lists that have no
    terminal punctuation.
  * Within a block we split on `.`, `!`, `?` followed by whitespace and a new
    capital/quote/digit, while protecting common abbreviations and decimal
    numbers so "e.g." and "3.5%" don't break a sentence.

We return character offsets so the original document can be re-highlighted
exactly. This is intentionally swappable for a real NLP segmenter (e.g. spaCy)
later — see the README's "Extending this" notes.
"""

import re

# A sentinel that stands in for a "."-that-isn't-a-sentence-end during
# splitting. It is the same width as "." so character offsets are preserved.
_DOT = "\x00"

_ABBREVIATIONS = [
    "e.g.",
    "i.e.",
    "etc.",
    "vs.",
    "No.",
    "Inc.",
    "Ltd.",
    "Co.",
    "Corp.",
    "U.S.",
    "cf.",
    "al.",
    "Art.",
    "Sec.",
    "Mr.",
    "Mrs.",
    "Dr.",
]

# Split point: terminal punctuation, then whitespace, then the start of the
# next sentence (capital letter, digit, quote or markdown marker).
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[\"'A-Z0-9])")
# A period between two digits is a decimal, not a sentence end.
_DECIMAL = re.compile(r"(?<=\d)\.(?=\d)")


def _protect(text: str) -> str:
    """Replace non-terminal periods with a same-length sentinel."""
    for abbr in _ABBREVIATIONS:
        text = text.replace(abbr, abbr.replace(".", _DOT))
    return _DECIMAL.sub(_DOT, text)


def split_sentences(text: str) -> list[tuple[str, int, int]]:
    """Split `text` into (sentence, start_char, end_char) tuples.

    Offsets index into the original `text`. Whitespace-only fragments are
    dropped. Markdown markers (`#`, `-`, `*`, `>`) are preserved in the stored
    text so the frontend can still render them.
    """
    results: list[tuple[str, int, int]] = []
    cursor = 0  # absolute offset of the current block within `text`

    for block in re.split(r"\n\s*\n", text):
        block_start = text.find(block, cursor)
        if block_start == -1:  # pragma: no cover - defensive
            block_start = cursor
        cursor = block_start + len(block)

        # Treat each line as its own boundary so headings / list items split.
        line_offset = block_start
        for line in block.split("\n"):
            if line.strip():
                _split_line(text, line, line_offset, results)
            line_offset += len(line) + 1  # +1 for the consumed "\n"

    return results


def _split_line(
    text: str, line: str, line_offset: int, out: list[tuple[str, int, int]]
) -> None:
    # Markdown headings are kept whole — "## 1. Liability" is a title, not two
    # sentences, so don't break it on the "1."
    if line.lstrip().startswith("#"):
        stripped = line.strip()
        start = text.find(stripped, line_offset)
        if start == -1:  # pragma: no cover - defensive
            start = line_offset
        out.append((stripped, start, start + len(stripped)))
        return

    # Split on the protected copy, but slice offsets from the original `text`
    # so stored sentences keep their real characters.
    protected = _protect(line)
    search_from = line_offset
    for match in _SENTENCE_END.split(protected):
        stripped = match.strip()
        if not stripped:
            continue
        start = text.find(stripped.replace(_DOT, "."), search_from)
        if start == -1:  # pragma: no cover - defensive
            start = search_from
        real = text[start : start + len(stripped)]
        end = start + len(real)
        out.append((real, start, end))
        search_from = end
