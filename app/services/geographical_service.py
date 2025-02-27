from sqlalchemy import text
from sqlalchemy.orm import Session
import logging
from shapely.wkb import loads
from shapely.geometry import mapping
from typing import List, Optional

from app.models.domain.geographical import (
    DensityGrid,
    BusinessCluster,
    NeighborhoodMetrics
)

logger = logging.getLogger(__name__)

def get_density_grid(db: Session, min_rating: float = 0.0) -> List[DensityGrid]:
    """
    Retrieve density grid data from the database
    
    Args:
        db: Database session
        min_rating: Minimum average rating filter
        
    Returns:
        List of DensityGrid objects
    """
    try:
        query = text("""
            SELECT 
                id, 
                ST_AsHEXEWKB(geom) as geom_hex,
                business_count,
                avg_rating,
                service_types,
                service_diversity
            FROM mv_tampa_service_density_grid
            WHERE business_count > 0
            AND avg_rating >= :min_rating
        """)
        
        result = db.execute(query, {"min_rating": min_rating})
        grid_cells = []
        
        for row in result:
            try:
                geom = loads(bytes.fromhex(row.geom_hex))
                geojson = mapping(geom)
                grid_cells.append(
                    DensityGrid(
                        grid_id=str(row.id),
                        coordinates=geojson,
                        metrics={
                            "business_count": row.business_count,
                            "avg_rating": float(row.avg_rating),
                            "service_diversity": row.service_diversity,
                            "service_types": row.service_types or []
                        }
                    )
                )
            except Exception as e:
                logger.warning(f"Error processing grid cell {row.id}: {str(e)}")
                continue
                
        return grid_cells
    except Exception as e:
        logger.error(f"Error in get_density_grid: {str(e)}")
        return []

def get_business_clusters(db: Session, min_size: int = 5, category: Optional[str] = None) -> List[BusinessCluster]:
    """
    Retrieve business cluster data from the database
    
    Args:
        db: Database session
        min_size: Minimum cluster size filter
        category: Optional category filter
        
    Returns:
        List of BusinessCluster objects
    """
    try:
        base_query = """
            SELECT 
                cluster_id,
                ST_AsHEXEWKB(center_point) as center_hex,
                cluster_size as size,
                avg_rating,
                categories
            FROM mv_tampa_business_clusters
            WHERE cluster_size >= :min_size
        """
        
        params = {"min_size": min_size}
        
        if category:
            base_query += " AND :category = ANY(categories)"
            params["category"] = category
            
        result = db.execute(text(base_query), params)
        clusters = []
        
        for row in result:
            try:
                center = loads(bytes.fromhex(row.center_hex))
                geojson = mapping(center)
                clusters.append(
                    BusinessCluster(
                        cluster_id=str(row.cluster_id),
                        center=geojson,
                        size=row.size,
                        avg_rating=float(row.avg_rating),
                        categories=row.categories or []
                    )
                )
            except Exception as e:
                logger.warning(f"Error processing cluster {row.cluster_id}: {str(e)}")
                continue
                
        return clusters
    except Exception as e:
        logger.error(f"Error in get_business_clusters: {str(e)}")
        return []
        
def get_neighborhood_metrics(db: Session, min_score: float = 0.0) -> List[NeighborhoodMetrics]:
    """
    Retrieve neighborhood metrics data from the database
    
    Args:
        db: Database session
        min_score: Minimum average score filter
        
    Returns:
        List of NeighborhoodMetrics objects
    """
    try:
        query = text("""
            SELECT 
                id as area_id,
                name as area_name,
                ST_AsHEXEWKB(geom) as boundary_hex,
                business_count as total_businesses,
                avg_rating,
                service_diversity,
                density_score,
                accessibility_score,
                service_distribution_score
            FROM mv_neighborhood_metrics
            WHERE (density_score + accessibility_score + service_distribution_score)/3 >= :min_score
        """)
        
        result = db.execute(query, {"min_score": min_score})
        neighborhoods = []
        
        for row in result:
            try:
                # Create proper boundary GeoJSON if we have geometry
                boundary = None
                if row.boundary_hex:
                    geom = loads(bytes.fromhex(row.boundary_hex))
                    boundary = mapping(geom)
                
                # Create the neighborhood metrics object
                metrics = NeighborhoodMetrics(
                    area_id=str(row.area_id),
                    area_name=row.area_name,
                    boundary=boundary,
                    total_businesses=row.total_businesses,
                    avg_rating=float(row.avg_rating) if row.avg_rating else 0.0,
                    service_diversity=row.service_diversity or 0,
                    density_score=row.density_score or 0,
                    accessibility_score=row.accessibility_score or 0,
                    service_distribution_score=row.service_distribution_score or 0
                )
                neighborhoods.append(metrics)
            except Exception as e:
                logger.warning(f"Error processing neighborhood {row.area_name}: {str(e)}")
                continue
                
        return neighborhoods
    except Exception as e:
        logger.error(f"Error in get_neighborhood_metrics: {str(e)}")
        return [] 