from fastapi import APIRouter
router = APIRouter(prefix="/api/sla", tags=["sla"])
@router.get("/")
def get_sla(): return []