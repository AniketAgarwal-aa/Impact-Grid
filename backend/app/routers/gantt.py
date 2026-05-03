from fastapi import APIRouter
router = APIRouter(prefix="/api/gantt", tags=["gantt"])
@router.get("/")
def get_gantt(): return []