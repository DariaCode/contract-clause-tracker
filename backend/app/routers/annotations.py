"""Apply / remove labels on sentences (annotations)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


@router.post("", response_model=schemas.Annotation, status_code=status.HTTP_201_CREATED)
def create_annotation(payload: schemas.AnnotationCreate, db: Session = Depends(get_db)):
    """Apply a label to a sentence. Idempotent: re-applying the same
    sentence/label pair returns the existing annotation."""
    if crud.get_sentence(db, payload.sentence_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sentence not found.")
    if crud.get_label(db, payload.label_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Label not found.")

    existing = crud.find_annotation(db, payload.sentence_id, payload.label_id)
    if existing is not None:
        return existing
    return crud.create_annotation(db, payload)


@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    annotation = crud.get_annotation(db, annotation_id)
    if annotation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Annotation not found.")
    crud.delete_annotation(db, annotation)
