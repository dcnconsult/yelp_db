from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
import traceback
from dotenv import load_dotenv

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.api.router import router

# Load environment variables
load_dotenv()

settings = get_settings()

def create_application() -> FastAPI:
    """Create and configure FastAPI application"""
    app = FastAPI(
        title="Yelp Analytics API",
        description="API for analyzing Yelp business data in the Tampa area",
        version=os.getenv("API_VERSION", "v1"),
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # Add CORS middleware with simple wildcard for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for development
        allow_credentials=False,  # Must be False when using wildcard origins
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
    )
    
    # Setup logging
    setup_logging(app)
    
    # Include API router
    app.include_router(router, prefix="/api")
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {"status": "healthy", "version": settings.API_VERSION}
    
    @app.get("/cors-test")
    async def cors_test():
        """Simple endpoint to test CORS configuration"""
        return {"status": "success", "message": "CORS is properly configured!"}
    
    # Catch-all exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger = logging.getLogger(__name__)
        logger.error(f"Unhandled exception: {exc}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error_type": str(type(exc).__name__)},
        )
    
    @app.get("/")
    async def root():
        """
        Root endpoint that redirects to the API documentation.
        """
        return {"message": "Welcome to Yelp Analytics API. Visit /docs for API documentation."}
    
    return app

app = create_application() 