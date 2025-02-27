from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class GeometryBase(BaseModel):
    """Base class for GeoJSON geometry types"""
    type: str
    coordinates: Any


class GridMetrics(BaseModel):
    """Business metrics for a density grid cell"""
    business_count: int
    avg_rating: float
    service_diversity: int
    service_types: List[str]


class DensityGridResponse(BaseModel):
    """Density grid data response model"""
    grid_id: str
    coordinates: Dict[str, Any]  # GeoJSON geometry
    metrics: Dict[str, Any]  # Grid metrics


class BusinessCluster(BaseModel):
    """Business cluster data response model"""
    cluster_id: str
    center: Dict[str, Any]  # GeoJSON geometry
    size: int
    categories: List[str]
    avg_rating: float


class NeighborhoodMetrics(BaseModel):
    """Neighborhood metrics response model"""
    area_id: str
    area_name: str
    boundary: Optional[Dict[str, Any]] = None  # GeoJSON geometry
    total_businesses: int
    avg_rating: float
    service_diversity: int
    density_score: float
    accessibility_score: float
    service_distribution_score: float
    
    class Config:
        from_attributes = True 