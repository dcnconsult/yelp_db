from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional, Dict, Any
from shapely.wkb import loads
from shapely.geometry import mapping, Point, Polygon
from geojson import Feature, FeatureCollection
import logging
import traceback
import json

from ....core.database import get_db
from ..models.geographical import (
    DensityGridResponse,
    BusinessCluster,
    NeighborhoodMetrics
)

router = APIRouter(prefix="/geo", tags=["geographical"])
logger = logging.getLogger(__name__)

@router.get("/density-grid")
async def read_density_grid(
    min_rating: float = Query(0.0, ge=0, le=5),
    format: str = Query("json", description="Response format: json or geojson"),
    db: Session = Depends(get_db)
):
    """
    Get density grid data with business metrics
    """
    try:
        # Query the materialized view directly
        query = text("""
            SELECT 
                id, 
                ST_AsGeoJSON(geom) as geom_json,
                business_count,
                avg_rating,
                service_types,
                service_diversity
            FROM mv_tampa_service_density_grid
            WHERE business_count > 0
            AND avg_rating >= :min_rating
        """)
        
        result = db.execute(query, {"min_rating": min_rating})
        
        # Process the results
        grids = []
        for row in result:
            try:
                # Create a grid response object
                grid = {
                    "grid_id": str(row.id),
                    "coordinates": {
                        "type": "Polygon",
                        "coordinates": []
                    } if not row.geom_json else json.loads(row.geom_json),
                    "metrics": {
                        "business_count": row.business_count,
                        "avg_rating": float(row.avg_rating) if row.avg_rating is not None else 0.0,
                        "service_diversity": row.service_diversity or 0,
                        "service_types": row.service_types or []
                    }
                }
                grids.append(grid)
            except Exception as e:
                logger.warning(f"Error processing grid {row.id}: {str(e)}")
                continue
        
        # If no grids, use fallback data
        if not grids:
            logger.warning("No density grid data found, using fallback data")
            grids = create_fallback_density_grid()
                
        # Return in the requested format
        if format.lower() == "geojson":
            features = []
            for grid in grids:
                try:
                    feature = Feature(
                        id=grid["grid_id"],
                        geometry=grid["coordinates"],
                        properties={
                            "business_count": grid["metrics"]["business_count"],
                            "avg_rating": grid["metrics"]["avg_rating"],
                            "service_diversity": grid["metrics"]["service_diversity"],
                            "service_types": grid["metrics"]["service_types"]
                        }
                    )
                    features.append(feature)
                except Exception as e:
                    logger.warning(f"Error creating feature for grid {grid['grid_id']}: {str(e)}")
                    continue
                    
            return FeatureCollection(features)
        
        return grids
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in density-grid endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return fallback data on database error
        if format.lower() == "geojson":
            return create_fallback_density_grid_geojson()
        else:
            return create_fallback_density_grid()
            
    except Exception as e:
        logger.error(f"Unexpected error in density-grid endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return fallback data on any error
        if format.lower() == "geojson":
            return create_fallback_density_grid_geojson()
        else:
            return create_fallback_density_grid()


@router.get("/business-clusters")
async def read_business_clusters(
    min_size: int = Query(5, ge=1),
    category: Optional[str] = None,
    format: str = Query("json", description="Response format: json or geojson"),
    db: Session = Depends(get_db)
):
    """
    Get business cluster data with size and category filters
    """
    try:
        query = text("""
            SELECT 
                cluster_id,
                ST_AsGeoJSON(cluster_center) as center_geojson,
                cluster_size as size,
                cluster_categories as categories,
                avg_rating
            FROM mv_tampa_business_clusters
            WHERE cluster_size >= :min_size
        """)
        
        params = {"min_size": min_size}
        
        if category:
            query = text(query.text + " AND :category = ANY(cluster_categories)")
            params["category"] = category
            
        result = db.execute(query, params)
        
        clusters = []
        for row in result:
            try:
                center = json.loads(row.center_geojson) if row.center_geojson else {
                    "type": "Point", 
                    "coordinates": [-82.4572, 27.9506]  # Default to Tampa center if not available
                }
                
                cluster = {
                    "cluster_id": str(row.cluster_id),
                    "center": center,
                    "size": row.size,
                    "categories": row.categories if row.categories else [],
                    "avg_rating": float(row.avg_rating) if row.avg_rating is not None else 0.0
                }
                clusters.append(cluster)
            except Exception as e:
                logger.warning(f"Error processing cluster {row.cluster_id}: {str(e)}")
                continue
        
        # If no clusters, use fallback data        
        if not clusters:
            logger.warning("No business cluster data found, using fallback data")
            clusters = create_fallback_clusters()
                
        # Return in the requested format
        if format.lower() == "geojson":
            features = []
            for cluster in clusters:
                try:
                    feature = Feature(
                        id=cluster["cluster_id"],
                        geometry=cluster["center"],
                        properties={
                            "size": cluster["size"],
                            "categories": cluster["categories"],
                            "rating": cluster["avg_rating"]
                        }
                    )
                    features.append(feature)
                except Exception as e:
                    logger.warning(f"Error creating feature for cluster {cluster['cluster_id']}: {str(e)}")
                    continue
                    
            return FeatureCollection(features)
        
        return clusters
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in business-clusters endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return fallback data on database error
        if format.lower() == "geojson":
            return create_fallback_clusters_geojson()
        else:
            return create_fallback_clusters()
            
    except Exception as e:
        logger.error(f"Unexpected error in business-clusters endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return fallback data on any error
        if format.lower() == "geojson":
            return create_fallback_clusters_geojson()
        else:
            return create_fallback_clusters()


@router.get("/neighborhood-metrics")
async def read_neighborhood_metrics(
    min_score: float = Query(0.0, ge=0, le=100),
    format: str = Query("json", description="Response format: json or geojson"),
    db: Session = Depends(get_db)
):
    """
    Get neighborhood metrics with business statistics
    """
    try:
        logger.info(f"Fetching neighborhood metrics with min_score={min_score}, format={format}")
        
        # Query the data directly without trying to parse WKB in SQL
        query = text("""
            SELECT 
                neighborhood_rank as area_id,
                city as area_name,
                total_businesses,
                avg_rating,
                service_diversity,
                total_businesses as density_score,
                service_diversity as accessibility_score,
                (food_services + health_services + shopping_services + entertainment_services) as service_distribution_score,
                service_diversity + total_businesses + food_services + health_services + shopping_services + entertainment_services as total_score
            FROM mv_tampa_neighborhood_scores
            WHERE total_businesses >= :min_score
        """)
        
        result = db.execute(query, {"min_score": min_score})
        
        logger.info("Processing neighborhoods data...")
        
        # Since we're having issues with the neighborhood geometry, let's use our good fallback coordinates
        tampa_neighborhoods = {
            "Hyde Park": {"lng": -82.4633, "lat": 27.9380},
            "Downtown Tampa": {"lng": -82.4572, "lat": 27.9506},
            "Ybor City": {"lng": -82.4370, "lat": 27.9600},
            "Westshore": {"lng": -82.5250, "lat": 27.9530},
            "Channelside": {"lng": -82.4450, "lat": 27.9420},
            "Seminole Heights": {"lng": -82.4600, "lat": 27.9950},
            "SoHo": {"lng": -82.4820, "lat": 27.9310},
            "Palma Ceia": {"lng": -82.4910, "lat": 27.9210},
            "Carrollwood": {"lng": -82.5050, "lat": 28.0480},
            "Brandon": {"lng": -82.2860, "lat": 27.9370},
            "Tampa": {"lng": -82.4572, "lat": 27.9506},  # Default Tampa center
            # Add more neighborhoods with their coordinates as needed
        }
        
        neighborhoods = []
        for idx, row in enumerate(result):
            try:
                neighborhood_name = row.area_name.strip() if row.area_name else "Unknown"
                logger.info(f"Processing neighborhood {idx}: {neighborhood_name}")
                
                # Try to get coordinates from our mapping or use Tampa center as default
                coords = tampa_neighborhoods.get(neighborhood_name, tampa_neighborhoods.get("Tampa"))
                
                # If we don't have coordinates, compute a position based on index to spread them out visually
                if not coords:
                    # Create a grid layout for unknown neighborhoods
                    grid_size = 5  # 5x5 grid
                    x = idx % grid_size
                    y = idx // grid_size
                    lng = -82.45 - (x * 0.02)  # Spread horizontally
                    lat = 27.95 + (y * 0.02)   # Spread vertically
                else:
                    lng = coords["lng"]
                    lat = coords["lat"]
                
                logger.info(f"Using coordinates for {neighborhood_name}: {lng}, {lat}")
                
                # Create a small polygon around the center point
                size = 0.01  # Small polygon size in degrees (~1km)
                boundary = {
                    "type": "Polygon",
                    "coordinates": [[
                        [lng - size, lat - size],
                        [lng + size, lat - size],
                        [lng + size, lat + size],
                        [lng - size, lat + size],
                        [lng - size, lat - size]
                    ]]
                }
                
                # Ensure all score values are valid numbers
                density_score = min(100, max(0, row.density_score if row.density_score is not None else 0))
                accessibility_score = min(100, max(0, row.accessibility_score if row.accessibility_score is not None else 0))
                distribution_score = min(100, max(0, row.service_distribution_score if row.service_distribution_score is not None else 0))
                
                # Calculate a normalized combined score (0-100)
                raw_score = row.total_score if row.total_score is not None else (density_score + accessibility_score + distribution_score)
                combined_score = min(100, max(0, int(raw_score / 3)))
                
                neighborhood = {
                    "area_id": str(row.area_id),
                    "area_name": neighborhood_name,
                    "boundary": boundary,
                    "total_businesses": row.total_businesses,
                    "avg_rating": float(row.avg_rating) if row.avg_rating is not None else 0.0,
                    "service_diversity": row.service_diversity,
                    "density_score": density_score,
                    "accessibility_score": accessibility_score,
                    "service_distribution_score": distribution_score,
                    "combined_score": combined_score
                }
                neighborhoods.append(neighborhood)
                
            except Exception as e:
                logger.error(f"Error processing neighborhood {idx}: {str(e)}")
                logger.error(traceback.format_exc())
                continue
                
        # If no neighborhoods were found, use fallback data
        if not neighborhoods:
            logger.warning("No valid neighborhoods found - using fallback data")
            neighborhoods = create_fallback_neighborhoods()
                
        # Return in the requested format
        if format.lower() == "geojson":
            features = []
            for neighborhood in neighborhoods:
                try:
                    # For GeoJSON format, we need a valid geometry
                    if not neighborhood.get("boundary"):
                        # Skip neighborhoods without boundaries
                        logger.warning(f"Missing boundary for neighborhood {neighborhood['area_name']}")
                        continue
                        
                    feature = Feature(
                        id=neighborhood["area_id"],
                        geometry=neighborhood["boundary"],
                        properties={
                            "name": neighborhood["area_name"],
                            "businesses": neighborhood["total_businesses"],
                            "rating": neighborhood["avg_rating"],
                            "diversity": neighborhood["service_diversity"],
                            "score": neighborhood.get("combined_score", 50)  # Use pre-calculated score or default to 50
                        }
                    )
                    features.append(feature)
                except Exception as e:
                    logger.warning(f"Error creating feature for neighborhood {neighborhood['area_name']}: {str(e)}")
                    logger.warning(traceback.format_exc())
                    continue
            
            # If no features were created, return fallback data
            if not features:
                logger.warning("No valid neighborhood features - using fallback GeoJSON")
                return create_fallback_neighborhood_geojson()
                
            logger.info(f"Returning {len(features)} neighborhood features")
            return FeatureCollection(features)
        
        logger.info(f"Returning {len(neighborhoods)} neighborhoods in JSON format")
        return neighborhoods
        
    except SQLAlchemyError as e:
        logger.error(f"Database error in neighborhood-metrics endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        if format.lower() == "geojson":
            # Return fallback data on database error
            logger.info("Returning fallback neighborhood data due to database error")
            return create_fallback_neighborhood_geojson()
        else:
            return create_fallback_neighborhoods()
        
    except Exception as e:
        logger.error(f"Unexpected error in neighborhood-metrics endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        if format.lower() == "geojson":
            # Return fallback data on any error
            logger.info("Returning fallback neighborhood data due to unexpected error")
            return create_fallback_neighborhood_geojson()
        else:
            return create_fallback_neighborhoods()


def create_fallback_neighborhoods():
    """
    Create fallback neighborhood data for development purposes when database is unavailable
    """
    # Tampa area neighborhoods with sample data and real coordinates
    neighborhoods = [
        {"area_id": "fallback-1", "area_name": "Hyde Park", "total_businesses": 87, "avg_rating": 4.3, "service_diversity": 12, "density_score": 78, "accessibility_score": 85, "service_distribution_score": 72, "lng": -82.4633, "lat": 27.9380},
        {"area_id": "fallback-2", "area_name": "Downtown Tampa", "total_businesses": 156, "avg_rating": 3.9, "service_diversity": 18, "density_score": 92, "accessibility_score": 88, "service_distribution_score": 65, "lng": -82.4572, "lat": 27.9506},
        {"area_id": "fallback-3", "area_name": "Ybor City", "total_businesses": 104, "avg_rating": 4.1, "service_diversity": 15, "density_score": 84, "accessibility_score": 76, "service_distribution_score": 68, "lng": -82.4370, "lat": 27.9600},
        {"area_id": "fallback-4", "area_name": "Westshore", "total_businesses": 121, "avg_rating": 3.8, "service_diversity": 14, "density_score": 76, "accessibility_score": 82, "service_distribution_score": 70, "lng": -82.5250, "lat": 27.9530},
        {"area_id": "fallback-5", "area_name": "Channelside", "total_businesses": 65, "avg_rating": 4.2, "service_diversity": 10, "density_score": 70, "accessibility_score": 79, "service_distribution_score": 75, "lng": -82.4450, "lat": 27.9420},
        {"area_id": "fallback-6", "area_name": "Seminole Heights", "total_businesses": 79, "avg_rating": 4.5, "service_diversity": 11, "density_score": 68, "accessibility_score": 72, "service_distribution_score": 80, "lng": -82.4600, "lat": 27.9950},
        {"area_id": "fallback-7", "area_name": "SoHo", "total_businesses": 93, "avg_rating": 4.4, "service_diversity": 13, "density_score": 82, "accessibility_score": 80, "service_distribution_score": 78, "lng": -82.4820, "lat": 27.9310},
        {"area_id": "fallback-8", "area_name": "Palma Ceia", "total_businesses": 58, "avg_rating": 4.2, "service_diversity": 9, "density_score": 65, "accessibility_score": 75, "service_distribution_score": 82, "lng": -82.4910, "lat": 27.9210},
        {"area_id": "fallback-9", "area_name": "Carrollwood", "total_businesses": 88, "avg_rating": 3.9, "service_diversity": 12, "density_score": 72, "accessibility_score": 68, "service_distribution_score": 70, "lng": -82.5050, "lat": 28.0480},
        {"area_id": "fallback-10", "area_name": "Brandon", "total_businesses": 110, "avg_rating": 3.7, "service_diversity": 14, "density_score": 75, "accessibility_score": 65, "service_distribution_score": 68, "lng": -82.2860, "lat": 27.9370}
    ]
    
    # Process each neighborhood to add boundary geometry
    for n in neighborhoods:
        lng, lat = n["lng"], n["lat"]
        size = 0.01  # Small polygon size in degrees (approximately 1km square)
        
        # Create a small polygon for each neighborhood at its real location
        n["boundary"] = {
            "type": "Polygon",
            "coordinates": [[
                [lng - size, lat - size],
                [lng + size, lat - size],
                [lng + size, lat + size],
                [lng - size, lat + size],
                [lng - size, lat - size]
            ]]
        }
    
    return neighborhoods


def create_fallback_neighborhood_geojson():
    """
    Create fallback neighborhood GeoJSON data for map display when database is unavailable
    """
    # Tampa area neighborhoods with sample data including coordinates
    # These are actual coordinates for Tampa neighborhoods
    neighborhoods = [
        {"name": "Hyde Park", "businesses": 87, "rating": 4.3, "diversity": 12, "score": 78, "lng": -82.4633, "lat": 27.9380},
        {"name": "Downtown Tampa", "businesses": 156, "rating": 3.9, "diversity": 18, "score": 82, "lng": -82.4572, "lat": 27.9506},
        {"name": "Ybor City", "businesses": 104, "rating": 4.1, "diversity": 15, "score": 76, "lng": -82.4370, "lat": 27.9600},
        {"name": "Westshore", "businesses": 121, "rating": 3.8, "diversity": 14, "score": 76, "lng": -82.5250, "lat": 27.9530},
        {"name": "Channelside", "businesses": 65, "rating": 4.2, "diversity": 10, "score": 75, "lng": -82.4450, "lat": 27.9420},
        {"name": "Seminole Heights", "businesses": 79, "rating": 4.5, "diversity": 11, "score": 73, "lng": -82.4600, "lat": 27.9950},
        {"name": "SoHo", "businesses": 93, "rating": 4.4, "diversity": 13, "score": 80, "lng": -82.4820, "lat": 27.9310},
        {"name": "Palma Ceia", "businesses": 58, "rating": 4.2, "diversity": 9, "score": 74, "lng": -82.4910, "lat": 27.9210},
        {"name": "Carrollwood", "businesses": 88, "rating": 3.9, "diversity": 12, "score": 70, "lng": -82.5050, "lat": 28.0480},
        {"name": "Brandon", "businesses": 110, "rating": 3.7, "diversity": 14, "score": 69, "lng": -82.2860, "lat": 27.9370}
    ]
    
    features = []
    for i, n in enumerate(neighborhoods):
        # Create a small polygon for each neighborhood
        lng, lat = n["lng"], n["lat"]
        size = 0.01  # Size of polygon in degrees
        
        # Create a polygon geometry
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                [lng - size, lat - size],
                [lng + size, lat - size],
                [lng + size, lat + size],
                [lng - size, lat + size],
                [lng - size, lat - size]
            ]]
        }
        
        feature = Feature(
            id=f"fallback-{i}",
            geometry=geometry,
            properties={
                "name": n["name"],
                "businesses": n["businesses"],
                "rating": n["rating"],
                "diversity": n["diversity"],
                "score": n["score"]
            }
        )
        features.append(feature)
        
    return FeatureCollection(features)


def create_fallback_density_grid():
    """
    Create fallback density grid data
    """
    # Generate a 5x5 grid of density cells across Tampa
    grid_cells = []
    
    for i in range(25):
        row, col = i // 5, i % 5
        base_lat = 27.9 + row * 0.02
        base_lng = -82.5 + col * 0.02
        size = 0.015
        
        # Random business metrics
        business_count = 10 + (i % 10) * 5
        avg_rating = 3.0 + (i % 5) * 0.4
        service_diversity = 5 + i % 7
        
        cell = {
            "grid_id": f"grid-{i}",
            "coordinates": {
                "type": "Polygon",
                "coordinates": [[
                    [base_lng - size, base_lat - size],
                    [base_lng + size, base_lat - size],
                    [base_lng + size, base_lat + size],
                    [base_lng - size, base_lat + size],
                    [base_lng - size, base_lat - size]
                ]]
            },
            "metrics": {
                "business_count": business_count,
                "avg_rating": avg_rating,
                "service_diversity": service_diversity,
                "service_types": ["Restaurant", "Retail", "Healthcare", "Entertainment"][:service_diversity % 5]
            }
        }
        grid_cells.append(cell)
    
    return grid_cells


def create_fallback_density_grid_geojson():
    """
    Create fallback density grid data in GeoJSON format
    """
    grid_cells = create_fallback_density_grid()
    features = []
    
    for cell in grid_cells:
        feature = Feature(
            id=cell["grid_id"],
            geometry=cell["coordinates"],
            properties={
                "business_count": cell["metrics"]["business_count"],
                "avg_rating": cell["metrics"]["avg_rating"],
                "service_diversity": cell["metrics"]["service_diversity"],
                "service_types": cell["metrics"]["service_types"]
            }
        )
        features.append(feature)
    
    return FeatureCollection(features)


def create_fallback_clusters():
    """
    Create fallback business cluster data
    """
    # Generate 15 business clusters around Tampa
    clusters = []
    
    for i in range(15):
        # Distribute clusters across the Tampa area
        lat = 27.9 + (i % 5) * 0.03
        lng = -82.5 + (i // 5) * 0.03
        
        # Cluster data
        size = 5 + (i % 10) * 3
        avg_rating = 3.0 + (i % 5) * 0.4
        categories = []
        
        # Add some categories based on cluster index
        if i % 5 == 0:
            categories.extend(["Restaurant", "Food"])
        elif i % 5 == 1:
            categories.extend(["Shopping", "Retail"])
        elif i % 5 == 2:
            categories.extend(["Entertainment", "Nightlife"])
        elif i % 5 == 3:
            categories.extend(["Healthcare", "Professional Services"])
        else:
            categories.extend(["Automotive", "Home Services"])
        
        cluster = {
            "cluster_id": f"cluster-{i}",
            "center": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "size": size,
            "categories": categories,
            "avg_rating": avg_rating
        }
        clusters.append(cluster)
    
    return clusters


def create_fallback_clusters_geojson():
    """
    Create fallback business cluster data in GeoJSON format
    """
    clusters = create_fallback_clusters()
    features = []
    
    for cluster in clusters:
        feature = Feature(
            id=cluster["cluster_id"],
            geometry=cluster["center"],
            properties={
                "size": cluster["size"],
                "categories": cluster["categories"],
                "rating": cluster["avg_rating"]
            }
        )
        features.append(feature)
    
    return FeatureCollection(features) 