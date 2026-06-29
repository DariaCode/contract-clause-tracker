"""Seed the standard label catalog and the demo contracts so the UI is useful
out of the box.

Label names/colours match the product design's palette. The demo documents are
plain `.txt` / `.md` files under ``sample_contracts/`` — drop another file in
that folder and it is picked up on the next fresh start.
"""

from pathlib import Path

from sqlalchemy.orm import Session

from . import crud, models

# (name, color, hotkey, is_custom). Three standard labels plus four seeded as
# custom examples, so the "CUSTOM" badge is visible in the dashboard out of the
# box. Hotkeys 1–7 power the labeling popover's quick-pick.
DEFAULT_LABELS = [
    ("Limitation of Liability", "#1d4ed8", "1", False),
    ("Termination for Convenience", "#0e7490", "2", False),
    ("Non-Compete", "#b45309", "3", False),
    ("Indemnification", "#6d28d9", "4", True),
    ("Confidentiality", "#047857", "5", True),
    ("Governing Law", "#475569", "6", True),
    ("Payment Terms", "#ca8a04", "7", True),
]

# Maps a sample file's extension to the stored content type — the same mapping
# the upload endpoint uses, so seeded docs are indistinguishable from uploads.
_CONTENT_TYPES = {".txt": "text", ".md": "markdown", ".markdown": "markdown"}
_SAMPLES_DIR = Path(__file__).resolve().parent.parent / "sample_contracts"


def seed_labels(db: Session) -> None:
    if db.query(models.Label).count() > 0:
        return
    db.add_all(
        models.Label(name=name, color=color, hotkey=hotkey, is_custom=is_custom)
        for name, color, hotkey, is_custom in DEFAULT_LABELS
    )
    db.commit()


def seed_documents(db: Session) -> None:
    """Create a document per file in ``sample_contracts/`` (once, on an empty DB).

    Title/filename/content_type mirror what an upload would produce, and the
    body is split into sentences via the same path, so the demo data behaves
    exactly like user-uploaded contracts.
    """
    if db.query(models.Document).count() > 0:
        return
    for path in sorted(_SAMPLES_DIR.glob("*")):
        content_type = _CONTENT_TYPES.get(path.suffix.lower())
        if content_type is None:
            continue
        crud.create_document(
            db,
            title=path.stem,
            filename=path.name,
            content_type=content_type,
            content=path.read_text(encoding="utf-8"),
        )
