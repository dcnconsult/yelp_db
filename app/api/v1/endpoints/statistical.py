from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional

from ....core.database import get_db
from ..models.statistical import (
    AreaStats,
    CategoryStats,
    CompetitionMetrics,
    ReviewStats
)

router = APIRouter(prefix="/stats", tags=["statistical"])


@router.get("/area-overview", response_model=List[AreaStats])
async def get_area_stats(
    area_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get area-level statistics"""
    query = text("""
        SELECT 
            area_id,
            business_count,
            review_count,
            avg_rating,
            unique_reviewers
        FROM area_stats
        WHERE 1=1
    """)
    params = {}
    
    if area_id:
        query = text(query.text + " AND area_id = :area_id")
        params["area_id"] = area_id
    
    result = db.execute(query, params)
    return [AreaStats(**row._mapping) for row in result]


@router.get("/category-analysis", response_model=List[CategoryStats])
async def get_category_stats(
    category: Optional[str] = None,
    min_count: int = Query(1, ge=1),
    db: Session = Depends(get_db)
):
    """Get category performance statistics"""
    query = text("""
        SELECT 
            category,
            usage_count as business_count,
            avg_rating,
            cities,
            min_rating,
            max_rating
        FROM mv_category_standardization
        WHERE usage_count >= :min_count
    """)
    params = {"min_count": min_count}
    
    if category:
        query = text(query.text + " AND category ILIKE :category")
        params["category"] = f"%{category}%"
    
    result = db.execute(query, params)
    return [CategoryStats(**row._mapping) for row in result]


@router.get("/competition-overview", response_model=List[CompetitionMetrics])
async def get_competition_metrics(
    db: Session = Depends(get_db)
):
    """Get competition analysis metrics"""
    query = text("""
        SELECT range, count, avg_rating, percentage
        FROM competition_overview
        ORDER BY range
    """)
    
    result = db.execute(query)
    return [CompetitionMetrics(**row._mapping) for row in result]


@router.get("/review-stats", response_model=List[ReviewStats])
async def get_review_stats(
    city: Optional[str] = None,
    min_reviews: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get review statistics by area"""
    query = text("""
        SELECT 
            city,
            review_count,
            avg_rating,
            unique_reviewers,
            avg_review_length,
            positive_reviews,
            negative_reviews
        FROM mv_tampa_review_stats
        WHERE review_count >= :min_reviews
    """)
    params = {"min_reviews": min_reviews}
    
    if city:
        query = text(query.text + " AND city = :city")
        params["city"] = city
    
    result = db.execute(query, params)
    return [ReviewStats(**row._mapping) for row in result] 