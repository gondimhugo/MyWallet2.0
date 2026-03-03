from fastapi import APIRouter, Depends, UploadFile, File, Response
from sqlmodel import Session

from app.api.deps import get_db, get_current_user
from app.services.csv_io import import_csv, export_csv
from app.db.models import User

router = APIRouter()

@router.post("/import/csv")
async def import_transactions_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await file.read()
    result = import_csv(db, data)
    return result

@router.get("/export/csv")
def export_transactions_csv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = export_csv(db)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="transactions_export.csv"'},
    )
