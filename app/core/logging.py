import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
from typing import Callable

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Log request
        logger.info(f"Request: {request.method} {request.url}")
        
        # Add request logging
        async def log_request(message: Message) -> None:
            if message["type"] == "http.request":
                body = message.get("body", b"")
                if body:
                    logger.info(f"Request body: {body.decode()}")
        
        request.state.log_request = log_request
        
        try:
            response = await call_next(request)
            
            # Calculate and log response time
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            logger.info(
                f"Response: status={response.status_code}, "
                f"process_time={process_time:.3f}s"
            )
            
            return response
            
        except Exception as e:
            # Log any unhandled exceptions
            logger.error(f"Error processing request: {str(e)}")
            raise
        
def setup_logging(app):
    """Add logging middleware to FastAPI application"""
    app.add_middleware(LoggingMiddleware)
    
    @app.middleware("http")
    async def log_validation_errors(request: Request, call_next):
        """Middleware to log validation errors"""
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            raise 