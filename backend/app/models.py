"""SQLAlchemy ORM models — the domain schema.

Domain:
    A *Document* (uploaded contract) is split into ordered *Sentences*.
    Each Sentence can carry one or more *Annotations*, where an Annotation links
    the sentence to a *Label* (e.g. "Limitation of Liability").

We store sentences as rows (rather than re-splitting on every request) so that
annotations are stable references and the dashboard can aggregate efficiently.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    filename: Mapped[str] = mapped_column(String(255))
    # "text" or "markdown" — drives how the frontend renders the body.
    content_type: Mapped[str] = mapped_column(String(20), default="text")
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    sentences: Mapped[list["Sentence"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="Sentence.position",
    )


class Sentence(Base):
    __tablename__ = "sentences"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    # 0-based order of the sentence within the document.
    position: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    # Character offsets into Document.content, for precise highlighting.
    start_char: Mapped[int] = mapped_column(Integer)
    end_char: Mapped[int] = mapped_column(Integer)

    document: Mapped["Document"] = relationship(back_populates="sentences")
    annotations: Mapped[list["Annotation"]] = relationship(
        back_populates="sentence", cascade="all, delete-orphan"
    )


class Label(Base):
    """The catalog of labels a user can apply (e.g. "Non-Compete")."""

    __tablename__ = "labels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    # Hex colour used by the UI to tag the label consistently.
    color: Mapped[str] = mapped_column(String(9), default="#6366f1")
    # Optional single-character quick-pick key for the labeling popover.
    hotkey: Mapped[str | None] = mapped_column(String(1), nullable=True)
    # True for user-created labels (vs the seeded standard catalog); the UI
    # shows a "CUSTOM" badge for these.
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    annotations: Mapped[list["Annotation"]] = relationship(back_populates="label")


class Annotation(Base):
    """A label applied to a sentence."""

    __tablename__ = "annotations"
    # A sentence can only carry a given label once.
    __table_args__ = (
        UniqueConstraint("sentence_id", "label_id", name="uq_sentence_label"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sentence_id: Mapped[int] = mapped_column(
        ForeignKey("sentences.id", ondelete="CASCADE"), index=True
    )
    label_id: Mapped[int] = mapped_column(
        ForeignKey("labels.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    sentence: Mapped["Sentence"] = relationship(back_populates="annotations")
    label: Mapped["Label"] = relationship(back_populates="annotations")
