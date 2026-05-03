from fastapi import APIRouter
router = APIRouter(prefix="/api/integrations", tags=["integrations"])
@router.get("/")
def get_integrations(): return []