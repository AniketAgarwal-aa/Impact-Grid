from fastapi import APIRouter
router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])
@router.get("/")
def get_roadmap(): return []