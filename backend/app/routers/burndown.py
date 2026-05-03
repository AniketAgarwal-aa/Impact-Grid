from fastapi import APIRouter
router = APIRouter(prefix="/api/burndown", tags=["burndown"])
@router.get("/")
def get_burndown(): return []