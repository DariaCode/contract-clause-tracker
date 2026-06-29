"""Document upload, listing (search / filter / group) and detail endpoints."""

import os

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".txt": "text", ".md": "markdown", ".markdown": "markdown"}
MAX_BYTES = 2 * 1024 * 1024  # 2 MB is plenty for a contract


@router.post(
    "", response_model=schemas.DocumentDetail, status_code=status.HTTP_201_CREATED
)
async def upload_document(
    file: UploadFile, title: str | None = None, db: Session = Depends(get_db)
):
    """Upload a plain-text or markdown contract.

    The body is split into sentences on the way in so it is immediately
    ready for labeling.
    """
    _, ext = os.path.splitext((file.filename or "").lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Only .txt and .md files are supported.",
        )

    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File too large.")
    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError as err:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "File must be UTF-8 text."
        ) from err

    if not content.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is empty.")

    return crud.create_document(
        db,
        title=(title or os.path.splitext(file.filename or "Untitled")[0]).strip(),
        filename=file.filename or "untitled.txt",
        content_type=ALLOWED_EXTENSIONS[ext],
        content=content,
    )


@router.get("", response_model=schemas.DocumentListResponse)
def list_documents(
    search: str | None = Query(None, description="Match title or body text"),
    label_id: int | None = Query(None, description="Keep docs with this label"),
    group_by: str | None = Query(None, pattern="^label$"),
    db: Session = Depends(get_db),
):
    """Dashboard list. Supports text search, label filtering and optional
    grouping by label."""
    summaries = crud.list_document_summaries(db, search=search, label_id=label_id)
    if group_by == "label":
        return schemas.DocumentListResponse(groups=crud.group_by_label(summaries))
    return schemas.DocumentListResponse(documents=summaries)


@router.get("/{document_id}", response_model=schemas.DocumentDetail)
def get_document(document_id: int, db: Session = Depends(get_db)):
    document = crud.get_document(db, document_id)
    if document is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, db: Session = Depends(get_db)):
    document = crud.get_document(db, document_id)
    if document is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    crud.delete_document(db, document)
