from pydantic import BaseModel, Field
from typing import List, Optional


class AreaStats(BaseModel):
    """Area-level statistics"""
    area_id: str
    business_count: int
    review_count: int
    avg_rating: float = Field(..., ge=1, le=5)
    unique_reviewers: int


class CategoryStats(BaseModel):
    """Category performance statistics"""
    category: str
    business_count: int
    avg_rating: float
    cities: List[str]
    min_rating: float
    max_rating: float


class CompetitionMetrics(BaseModel):
    """Competition analysis metrics"""
    range: str = Field(..., description="Rating range (e.g., '1-2', '2-3')")
    count: int
    avg_rating: float
    percentage: float = Field(..., ge=0, le=100)


class ReviewStats(BaseModel):
    """Review statistics for an area"""
    city: str
    review_count: int
    avg_rating: float
    unique_reviewers: int
    avg_review_length: float
    positive_reviews: int
    negative_reviews: int
    
    class Config:
        from_attributes = True 