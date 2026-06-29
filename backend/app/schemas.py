"""Pydantic schemas — the API request/response contracts.

These mirror the TypeScript interfaces in the Angular `core/models.ts`.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Labels ---------------------------------------------------------------


class LabelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    color: str = Field(default="#6366f1", max_length=9)
    hotkey: str | None = Field(default=None, max_length=1)


class LabelUpdate(BaseModel):
    """PATCH body — only the provided fields are updated."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    color: str | None = Field(default=None, max_length=9)
    hotkey: str | None = Field(default=None, max_length=1)


class Label(ORMModel):
    id: int
    name: str
    color: str
    hotkey: str | None = None
    is_custom: bool = False


class LabelUsage(Label):
    """A label plus how many documents reference it (for the management page)."""

    documents_count: int = 0


# --- Annotations (a label applied to a sentence) --------------------------


class AnnotationCreate(BaseModel):
    sentence_id: int
    label_id: int


class Annotation(ORMModel):
    id: int
    sentence_id: int
    label: Label
    created_at: datetime


# --- Sentences ------------------------------------------------------------


class Sentence(ORMModel):
    id: int
    position: int
    text: str
    start_char: int
    end_char: int
    annotations: list[Annotation] = []


# --- Documents ------------------------------------------------------------


class LabelCount(BaseModel):
    """A label plus how many sentences in the document carry it."""

    id: int
    name: str
    color: str
    count: int


class DocumentSummary(BaseModel):
    """Lightweight document view used by the dashboard list."""

    id: int
    title: str
    filename: str
    content_type: str
    created_at: datetime
    sentence_count: int
    annotation_count: int
    labels: list[LabelCount] = []


class DocumentDetail(ORMModel):
    """Full document with its sentences and their annotations (the editor view)."""

    id: int
    title: str
    filename: str
    content_type: str
    content: str
    created_at: datetime
    sentences: list[Sentence] = []


class DocumentGroup(BaseModel):
    """A group of documents bucketed by a label (or 'Unlabeled')."""

    label: LabelCount | None
    documents: list[DocumentSummary]


class DocumentListResponse(BaseModel):
    """Flat list, or grouped buckets when `group_by=label`."""

    documents: list[DocumentSummary] | None = None
    groups: list[DocumentGroup] | None = None
