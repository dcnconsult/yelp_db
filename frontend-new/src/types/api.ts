// Statistical Types
export interface AreaStats {
  area_id: string;
  business_count: number;
  review_count: number;
  avg_rating: number;
  unique_reviewers: number;
}

export interface CategoryStats {
  category: string;
  business_count: number;
  avg_rating: number;
  cities: string[];
  min_rating: number;
  max_rating: number;
}

export interface CompetitionMetrics {
  range: string;
  count: number;
  avg_rating: number;
  percentage: number;
}

export interface ReviewStats {
  city: string;
  review_count: number;
  avg_rating: number;
  unique_reviewers: number;
  avg_review_length: number;
  positive_reviews: number;
  negative_reviews: number;
}

// Geographical Types
export interface Coordinates {
  type: string;
  coordinates: number[][];
}

export interface DensityGridMetrics {
  business_count: number;
  avg_rating: number;
  service_diversity: number;
  service_types: string[];
}

export interface DensityGridResponse {
  grid_id: string;
  coordinates: Coordinates;
  metrics: DensityGridMetrics;
}

export interface GeoJSON {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}

export interface DensityGrid {
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][] // Polygon or MultiPolygon
  };
  business_count: number;
  avg_rating: number;
  service_types: string[];
  service_diversity: number;
}

export interface BusinessCluster {
  cluster_id: string;
  center: GeoJSON;
  size: number;
  categories: string[];
  avg_rating: number;
}

export interface NeighborhoodMetrics {
  area_name: string;
  total_businesses: number;
  avg_rating: number;
  service_diversity: number;
  density_score: number;
  accessibility_score: number;
  service_distribution_score: number;
} 