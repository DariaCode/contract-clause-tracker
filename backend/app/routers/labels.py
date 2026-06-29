"""Label catalog endpoints (the labels a user can apply)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/labels", tags=["labels"])


@router.get("", response_model=list[schemas.LabelUsage])
def list_labels(db: Session = Depends(get_db)):
    return crud.list_labels_with_usage(db)


@router.post("", response_model=schemas.Label, status_code=status.HTTP_201_CREATED)
def create_label(payload: schemas.LabelCreate, db: Session = Depends(get_db)):
    clash = crud.label_with_hotkey(db, payload.hotkey)
    if clash is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f'Hotkey "{payload.hotkey}" is already used by "{clash.name}".',
        )
    try:
        return crud.create_label(db, payload)
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A label with that name already exists."
        ) from err


@router.patch("/{label_id}", response_model=schemas.Label)
def update_label(
    label_id: int, payload: schemas.LabelUpdate, db: Session = Depends(get_db)
):
    label = crud.get_label(db, label_id)
    if label is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Label not found.")
    fields = payload.model_dump(exclude_unset=True)
    if "hotkey" in fields:
        clash = crud.label_with_hotkey(db, fields["hotkey"], exclude_id=label_id)
        if clash is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f'Hotkey "{fields["hotkey"]}" is already used by "{clash.name}".',
            )
    try:
        return crud.update_label(db, label, payload)
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A label with that name already exists."
        ) from err


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(label_id: int, db: Session = Depends(get_db)):
    label = crud.get_label(db, label_id)
    if label is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Label not found.")
    if not label.is_custom:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Predefined labels cannot be deleted."
        )
    crud.delete_label(db, label)
