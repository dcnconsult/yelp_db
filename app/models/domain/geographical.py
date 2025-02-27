from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class GridMetrics(BaseModel):
    """Metrics for a density grid cell"""
    business_count: int
    avg_rating: float
    service_diversity: int
    service_types: List[str]


class DensityGrid(BaseModel):
    """Business density grid representation"""
    grid_id: str
    coordinates: Dict[str, Any]  # GeoJSON geometry
    metrics: Dict[str, Any]


class BusinessCluster(BaseModel):
    """Business cluster representation"""
    cluster_id: str
    center: Dict[str, Any]  # GeoJSON geometry
    size: int
    avg_rating: float
    categories: List[str]


class NeighborhoodMetrics(BaseModel):
    """Neighborhood metrics representation"""
    area_id: str
    area_name: str
    boundary: Optional[Dict[str, Any]] = None  # GeoJSON geometry
    total_businesses: int
    avg_rating: float
    service_diversity: int
    density_score: float
    accessibility_score: float
    service_distribution_score: float 