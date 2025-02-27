SELECT id, ST_AsGeoJSON(geom) as geometry, business_count, avg_rating, service_types, service_diversity FROM mv_tampa_service_density_grid WHERE avg_rating >= 1 LIMIT 1;
