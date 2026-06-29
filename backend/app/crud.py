"""Data-access layer. Keeps DB queries out of the route handlers."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .utils import split_sentences

# --- Labels ---------------------------------------------------------------


def list_labels(db: Session) -> list[models.Label]:
    # Order by id (creation order) so seeded labels keep a stable position.
    return db.scalars(select(models.Label).order_by(models.Label.id)).all()


def list_labels_with_usage(db: Session) -> list[schemas.LabelUsage]:
    """Labels plus how many distinct documents reference each (management page)."""
    rows = db.execute(
        select(
            models.Annotation.label_id,
            func.count(func.distinct(models.Sentence.document_id)),
        )
        .join(models.Sentence, models.Annotation.sentence_id == models.Sentence.id)
        .group_by(models.Annotation.label_id)
    ).all()
    counts = dict(rows)
    return [
        schemas.LabelUsage(
            id=label.id,
            name=label.name,
            color=label.color,
            hotkey=label.hotkey,
            is_custom=label.is_custom,
            documents_count=counts.get(label.id, 0),
        )
        for label in list_labels(db)
    ]


def create_label(db: Session, payload: schemas.LabelCreate) -> models.Label:
    label = models.Label(
        name=payload.name,
        color=payload.color,
        hotkey=payload.hotkey or None,
        is_custom=True,
    )
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


def update_label(
    db: Session, label: models.Label, payload: schemas.LabelUpdate
) -> models.Label:
    fields = payload.model_dump(exclude_unset=True)
    if "name" in fields:
        label.name = fields["name"]
    if "color" in fields:
        label.color = fields["color"]
    if "hotkey" in fields:
        label.hotkey = fields["hotkey"] or None
    db.commit()
    db.refresh(label)
    return label


def get_label(db: Session, label_id: int) -> models.Label | None:
    return db.get(models.Label, label_id)


def label_with_hotkey(
    db: Session, hotkey: str | None, exclude_id: int | None = None
) -> models.Label | None:
    """The label that already owns ``hotkey`` (if any). Empty hotkeys are free."""
    if not hotkey:
        return None
    stmt = select(models.Label).where(models.Label.hotkey == hotkey)
    if exclude_id is not None:
        stmt = stmt.where(models.Label.id != exclude_id)
    return db.scalars(stmt).first()


def delete_label(db: Session, label: models.Label) -> None:
    db.delete(label)
    db.commit()


# --- Documents ------------------------------------------------------------


def create_document(
    db: Session, *, title: str, filename: str, content_type: str, content: str
) -> models.Document:
    document = models.Document(
        title=title, filename=filename, content_type=content_type, content=content
    )
    for position, (text, start, end) in enumerate(split_sentences(content)):
        document.sentences.append(
            models.Sentence(
                position=position, text=text, start_char=start, end_char=end
            )
        )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def get_document(db: Session, document_id: int) -> models.Document | None:
    stmt = (
        select(models.Document)
        .where(models.Document.id == document_id)
        .options(
            selectinload(models.Document.sentences)
            .selectinload(models.Sentence.annotations)
            .selectinload(models.Annotation.label)
        )
    )
    return db.scalars(stmt).first()


def delete_document(db: Session, document: models.Document) -> None:
    db.delete(document)
    db.commit()


def list_document_summaries(
    db: Session, *, search: str | None = None, label_id: int | None = None
) -> list[schemas.DocumentSummary]:
    """Return dashboard summaries, optionally filtered by text or label.

    `search` matches the title, body, or any applied label's name
    (case-insensitive). `label_id` keeps only documents that contain at least
    one sentence annotated with that label.
    """
    stmt = select(models.Document).order_by(models.Document.created_at.desc())

    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(models.Document.title).like(like)
            | func.lower(models.Document.content).like(like)
            | models.Document.sentences.any(
                models.Sentence.annotations.any(
                    models.Annotation.label.has(
                        func.lower(models.Label.name).like(like)
                    )
                )
            )
        )

    if label_id is not None:
        stmt = stmt.where(
            models.Document.sentences.any(
                models.Sentence.annotations.any(models.Annotation.label_id == label_id)
            )
        )

    documents = db.scalars(
        stmt.options(
            selectinload(models.Document.sentences).selectinload(
                models.Sentence.annotations
            )
        )
    ).all()
    return [_summarize(doc) for doc in documents]


def _summarize(doc: models.Document) -> schemas.DocumentSummary:
    counts: dict[int, schemas.LabelCount] = {}
    annotation_count = 0
    for sentence in doc.sentences:
        for annotation in sentence.annotations:
            annotation_count += 1
            label = annotation.label
            if label.id not in counts:
                counts[label.id] = schemas.LabelCount(
                    id=label.id, name=label.name, color=label.color, count=0
                )
            counts[label.id].count += 1
    return schemas.DocumentSummary(
        id=doc.id,
        title=doc.title,
        filename=doc.filename,
        content_type=doc.content_type,
        created_at=doc.created_at,
        sentence_count=len(doc.sentences),
        annotation_count=annotation_count,
        labels=sorted(counts.values(), key=lambda c: c.name),
    )


def group_by_label(
    summaries: list[schemas.DocumentSummary],
) -> list[schemas.DocumentGroup]:
    """Bucket document summaries by label. A document with multiple labels
    appears in each relevant bucket; unlabeled docs go to a trailing `None`
    group."""
    buckets: dict[int, schemas.DocumentGroup] = {}
    unlabeled: list[schemas.DocumentSummary] = []

    for summary in summaries:
        if not summary.labels:
            unlabeled.append(summary)
            continue
        for label in summary.labels:
            if label.id not in buckets:
                buckets[label.id] = schemas.DocumentGroup(label=label, documents=[])
            buckets[label.id].documents.append(summary)

    groups = sorted(buckets.values(), key=lambda g: g.label.name)
    if unlabeled:
        groups.append(schemas.DocumentGroup(label=None, documents=unlabeled))
    return groups


# --- Annotations ----------------------------------------------------------


def get_sentence(db: Session, sentence_id: int) -> models.Sentence | None:
    return db.get(models.Sentence, sentence_id)


def create_annotation(
    db: Session, payload: schemas.AnnotationCreate
) -> models.Annotation:
    annotation = models.Annotation(
        sentence_id=payload.sentence_id, label_id=payload.label_id
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


def find_annotation(
    db: Session, sentence_id: int, label_id: int
) -> models.Annotation | None:
    return db.scalars(
        select(models.Annotation).where(
            models.Annotation.sentence_id == sentence_id,
            models.Annotation.label_id == label_id,
        )
    ).first()


def get_annotation(db: Session, annotation_id: int) -> models.Annotation | None:
    return db.get(models.Annotation, annotation_id)


def delete_annotation(db: Session, annotation: models.Annotation) -> None:
    db.delete(annotation)
    db.commit()
