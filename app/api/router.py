from fastapi import APIRouter
from .v1.endpoints import geographical, statistical

# Create main router
router = APIRouter()

# Include versioned routers
router.include_router(
    geographical.router,
    prefix="/v1",
    tags=["geographical"]
)

router.include_router(
    statistical.router,
    prefix="/v1",
    tags=["statistical"]
) 