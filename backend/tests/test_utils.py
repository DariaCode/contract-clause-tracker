"""Unit tests for sentence segmentation."""

from app.utils import split_sentences


def _texts(content: str) -> list[str]:
    return [t for t, _, _ in split_sentences(content)]


def test_offsets_map_back_to_source():
    content = "First sentence. Second sentence."
    for text, start, end in split_sentences(content):
        assert content[start:end] == text


def test_splits_multiple_sentences():
    texts = _texts("The party shall pay. The party shall not compete.")
    assert texts == ["The party shall pay.", "The party shall not compete."]


def test_markdown_heading_stays_whole():
    texts = _texts("## 1. Liability\n\nThe provider is not liable.")
    assert "## 1. Liability" in texts
    assert "Liability" not in texts  # not split off the numbered heading


def test_abbreviations_and_decimals_do_not_split():
    texts = _texts("Fees are 3.5% of revenue, e.g. monthly. Next clause.")
    assert texts[0] == "Fees are 3.5% of revenue, e.g. monthly."
    assert texts[1] == "Next clause."


def test_blank_lines_are_ignored():
    assert _texts("\n\n  \n") == []
