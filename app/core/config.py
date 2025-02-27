from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    # API Settings
    API_VERSION: str = "v1"
    DEBUG: bool = True
    
    # Data Settings
    DATA_DIRECTORY: str = "data"
    CACHE_DIR: str = "data/cache"
    
    # Scheduling
    SCHEDULE_ENABLED: bool = True
    SCHEDULE_INTERVAL_HOURS: int = 24
    
    # Database Settings
    POSTGRES_URL: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_POOL_SIZE: int = 4
    SQL_DEBUG: bool = False
    
    # API Keys
    MAPBOX_API_KEY: str
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Legacy DB Settings (for compatibility)
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    
    @property
    def DATABASE_URL(self) -> str:
        """Construct database URL from components"""
        return self.POSTGRES_URL or f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance to avoid reloading environment variables"""
    return Settings() 