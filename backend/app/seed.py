"""Seed the standard label catalog so the UI is useful out of the box.

Names and colours match the product design's label palette.
"""

from sqlalchemy.orm import Session

from . import models

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


def seed_labels(db: Session) -> None:
    if db.query(models.Label).count() > 0:
        return
    db.add_all(
        models.Label(name=name, color=color, hotkey=hotkey, is_custom=is_custom)
        for name, color, hotkey, is_custom in DEFAULT_LABELS
    )
    db.commit()
