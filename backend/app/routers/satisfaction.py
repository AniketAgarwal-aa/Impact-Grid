from fastapi import APIRouter
router = APIRouter(prefix="/api/satisfaction", tags=["satisfaction"])
@router.get("/")
def get_satisfaction(): return []