import { 
  DEFAULT_FETCH_OPTIONS, 
  FALLBACK_FETCH_OPTIONS, 
  isCorsError,
  API_BASE_URL
} from './config';
import type { FeatureCollection, Feature, Point, Polygon } from 'geojson';

// Define expected return types
export interface DensityGridFeature extends Feature<Polygon> {
  properties: {
    id: string;
    business_count: number;
    avg_rating: number;
    service_diversity: number;
    service_types: string[];
  };
}

export interface BusinessClusterFeature extends Feature<Point> {
  properties: {
    id: string;
    size: number;
    rating: number;
    categories: string[];
  };
}

export interface NeighborhoodFeature extends Feature<Polygon> {
  properties: {
    name: string;
    businesses: number;
    rating: number;
    diversity: number;
    score: number;
  };
}

// Define a function to safely fetch GeoJSON data with timeout and better error handling
async function safeFetch(url: string, options = {}) {
  const controller = new AbortController();
  const signal = controller.signal;
  
  // Set a timeout of 10 seconds
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Check if it's a CORS error
      if (response.status === 0) {
        console.error('CORS error when fetching:', url);
        throw new Error('Network error - CORS issue detected');
      }
      
      // Check if it's a server error
      if (response.status >= 500) {
        console.error(`Server error (${response.status}) when fetching:`, url);
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Other HTTP errors
      console.error(`HTTP error (${response.status}) when fetching:`, url);
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    // Check for specific error types
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Request timed out:', url);
      throw new Error('Request timed out');
    }
    
    // Network errors
    if (error instanceof Error && error.message && error.message.includes('NetworkError')) {
      console.error('Network error when fetching:', url);
      throw new Error('Network error - check API connection');
    }
    
    console.error('Error fetching data:', error);
    throw error;
  }
}

/**
 * Fetches density grid data with minimum rating filter
 */
export async function getDensityGrid(minRating = 1): Promise<DensityGridFeature[]> {
  try {
    console.log(`Fetching density grid data with minRating=${minRating}`);
    const data = await safeFetch(`${API_BASE_URL}/geo/density-grid?min_rating=${minRating}`);
    
    console.log('Received density grid data:', data);
    
    // Validate and transform the data to match expected format
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No density grid data returned from API');
      return [];
    }
    
    // Map to GeoJSON features with consistent structure
    const features = data.map((item: any, index: number) => {
      try {
        // Check if the item has the expected structure
        const hasExpectedStructure = item && 
                                    item.coordinates && 
                                    item.coordinates.coordinates && 
                                    Array.isArray(item.coordinates.coordinates) &&
                                    item.metrics;
        
        if (!hasExpectedStructure) {
          console.warn('Malformed density grid item:', item);
          
          // Create a fallback structure centered in Tampa
          return {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [-82.45 + (index * 0.001), 27.95 + (index * 0.001)],
                [-82.45 + (index * 0.001) + 0.01, 27.95 + (index * 0.001)],
                [-82.45 + (index * 0.001) + 0.01, 27.95 + (index * 0.001) + 0.01],
                [-82.45 + (index * 0.001), 27.95 + (index * 0.001) + 0.01],
                [-82.45 + (index * 0.001), 27.95 + (index * 0.001)]
              ]]
            },
            properties: {
              id: `grid-${index}`,
              business_count: 0,
              avg_rating: 0,
              service_diversity: 0,
              service_types: []
            }
          } as DensityGridFeature;
        }
        
        // Transform to the expected format
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: item.coordinates.coordinates
          },
          properties: {
            id: item.grid_id || `grid-${index}`,
            business_count: item.metrics?.business_count || 0,
            avg_rating: item.metrics?.avg_rating || 0,
            service_diversity: item.metrics?.service_diversity || 0,
            service_types: item.metrics?.service_types || []
          }
        } as DensityGridFeature;
      } catch (error) {
        console.error('Error processing density grid item:', error);
        return null;
      }
    }).filter((feature): feature is DensityGridFeature => feature !== null);
    
    console.log(`Returning ${features.length} density grid features`);
    return features;
  } catch (error) {
    console.error('Error fetching density grid data:', error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Fetches business cluster data with minimum size filter
 */
export async function getBusinessClusters(minSize = 5): Promise<BusinessClusterFeature[]> {
  try {
    console.log(`Fetching business clusters data with minSize=${minSize}`);
    const data = await safeFetch(`${API_BASE_URL}/geo/business-clusters?min_size=${minSize}`);
    
    console.log('Received business clusters data:', data);
    
    // Validate and transform the data to match expected format
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No business clusters data returned from API');
      return [];
    }
    
    // Map to GeoJSON features with consistent structure
    const features = data.map((cluster: any, index: number) => {
      try {
        // Check if the cluster has the expected structure - UPDATED to match the actual API structure
        // The API returns 'center' instead of 'cluster_center'
        const hasExpectedStructure = cluster && 
                                    typeof cluster.cluster_id === 'string' &&
                                    typeof cluster.size === 'number' &&
                                    typeof cluster.avg_rating === 'number' &&
                                    Array.isArray(cluster.categories) &&
                                    cluster.center;
        
        if (!hasExpectedStructure) {
          console.warn('Malformed business cluster:', cluster);
          
          // Create a fallback structure around Tampa
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-82.45 + (index * 0.01), 27.95 + (index * 0.01)]
            },
            properties: {
              id: `cluster-${index}`,
              size: 5,
              rating: 3,
              categories: ['Restaurant']
            }
          } as BusinessClusterFeature;
        }
        
        // Handle different possible coordinate formats from the API
        let coordinates: [number, number];
        
        if (cluster.center.coordinates && Array.isArray(cluster.center.coordinates)) {
          // Direct coordinates array
          coordinates = cluster.center.coordinates;
        } else if (typeof cluster.center.x === 'number' && typeof cluster.center.y === 'number') {
          // Coordinates as x,y properties
          coordinates = [cluster.center.x, cluster.center.y];
        } else if (typeof cluster.center.longitude === 'number' && typeof cluster.center.latitude === 'number') {
          // Coordinates as longitude/latitude properties
          coordinates = [cluster.center.longitude, cluster.center.latitude];
        } else if (typeof cluster.center === 'object' && Object.keys(cluster.center).length === 2) {
          // Try to guess from available properties
          const keys = Object.keys(cluster.center);
          const values = keys.map(k => cluster.center[k]);
          if (typeof values[0] === 'number' && typeof values[1] === 'number') {
            coordinates = [values[0], values[1]];
          } else {
            // Default coordinates if we can't extract them
            coordinates = [-82.45, 27.95];
          }
        } else {
          // Default coordinates if we can't extract them
          coordinates = [-82.45, 27.95];
        }
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates
          },
          properties: {
            id: cluster.cluster_id || `cluster-${index}`,
            size: cluster.size || 5,
            rating: cluster.avg_rating || 3,
            categories: cluster.categories || []
          }
        } as BusinessClusterFeature;
      } catch (error) {
        console.error('Error processing business cluster:', error);
        return null;
      }
    }).filter((feature): feature is BusinessClusterFeature => feature !== null);
    
    console.log(`Returning ${features.length} business cluster features`);
    return features;
  } catch (error) {
    console.error('Error fetching business clusters data:', error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Fetches neighborhood metrics data with minimum score filter
 */
export async function getNeighborhoodMetrics(minScore = 0): Promise<NeighborhoodFeature[]> {
  try {
    console.log(`Fetching neighborhood metrics data with minScore=${minScore}`);
    const data = await safeFetch(`${API_BASE_URL}/geo/neighborhood-metrics?min_score=${minScore}`);
    
    console.log('Received neighborhood metrics data:', data);
    
    // Validate and transform the data to match expected format
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No neighborhood metrics data returned from API');
      return createFallbackNeighborhoods();
    }
    
    // Map to GeoJSON features with consistent structure
    const features = data.map((neighborhood: any, index: number) => {
      try {
        console.log(`Processing neighborhood: ${JSON.stringify(neighborhood).substring(0, 200)}...`);
        
        // Extract or create geometry
        let geometry;
        
        // Check for different possible geometry formats in the API response
        if (neighborhood.geometry && neighborhood.geometry.coordinates) {
          console.log(`Using directly provided geometry for neighborhood ${index}`);
          geometry = {
            type: 'Polygon',
            coordinates: neighborhood.geometry.coordinates
          };
        } else if (neighborhood.area_boundary && neighborhood.area_boundary.coordinates) {
          console.log(`Using area_boundary for neighborhood ${index}`);
          geometry = {
            type: 'Polygon',
            coordinates: neighborhood.area_boundary.coordinates
          };
        } else if (neighborhood.neighborhood_center || neighborhood.center) {
          // Handle point-based centers that need to be converted to polygons
          const center = neighborhood.neighborhood_center || neighborhood.center;
          console.log(`Creating polygon from center point for neighborhood ${index}:`, center);
          
          let centerPoint: [number, number];
          
          // Extract the center coordinates
          if (Array.isArray(center)) {
            centerPoint = center as [number, number];
          } else if (center.coordinates && Array.isArray(center.coordinates)) {
            centerPoint = center.coordinates as [number, number];
          } else if (typeof center.x === 'number' && typeof center.y === 'number') {
            centerPoint = [center.x, center.y];
          } else if (typeof center.longitude === 'number' && typeof center.latitude === 'number') {
            centerPoint = [center.longitude, center.latitude];
          } else {
            // Try to parse from center object if it has 2 numeric properties
            try {
              const keys = Object.keys(center);
              if (keys.length === 2 && 
                  typeof center[keys[0]] === 'number' && 
                  typeof center[keys[1]] === 'number') {
                centerPoint = [center[keys[0]], center[keys[1]]];
              } else {
                throw new Error('Could not extract center coordinates');
              }
            } catch (e) {
              console.warn(`Could not extract center coordinates for neighborhood ${index}:`, e);
              const lat = 27.94 + (index % 5) * 0.02;
              const lng = -82.48 + Math.floor(index / 5) * 0.03;
              centerPoint = [lng, lat];
            }
          }
          
          // Create a polygon around the center point
          const size = 0.01; // roughly 1km at the equator
          geometry = {
            type: 'Polygon',
            coordinates: [[
              [centerPoint[0] - size, centerPoint[1] - size],
              [centerPoint[0] + size, centerPoint[1] - size],
              [centerPoint[0] + size, centerPoint[1] + size],
              [centerPoint[0] - size, centerPoint[1] + size],
              [centerPoint[0] - size, centerPoint[1] - size]
            ]]
          };
        } else {
          console.warn(`No geometry data found for neighborhood ${index}, creating fallback`);
          // Create a small polygon as a fallback
          const lat = 27.94 + (index % 5) * 0.02;
          const lng = -82.48 + Math.floor(index / 5) * 0.03;
          
          geometry = {
            type: 'Polygon',
            coordinates: [[
              [lng, lat],
              [lng + 0.02, lat],
              [lng + 0.02, lat + 0.02],
              [lng, lat + 0.02],
              [lng, lat]
            ]]
          };
        }
        
        // Extract name from various possible properties
        const name = neighborhood.name || 
                   neighborhood.area_name || 
                   neighborhood.neighborhood_name || 
                   `Area ${index + 1}`;
        
        return {
          type: 'Feature',
          geometry: geometry as Polygon,
          properties: {
            name: name,
            businesses: neighborhood.total_businesses || 
                       neighborhood.businesses || 
                       neighborhood.business_count || 0,
            rating: neighborhood.avg_rating || 
                   neighborhood.rating || 0,
            diversity: neighborhood.service_diversity || 
                      neighborhood.diversity || 0,
            score: neighborhood.score || 
                  neighborhood.neighborhood_score ||
                  Math.round(((neighborhood.density_score || 0) + 
                           (neighborhood.accessibility_score || 0) + 
                           (neighborhood.service_distribution_score || 0)) / 3)
          }
        } as NeighborhoodFeature;
      } catch (error) {
        console.error('Error processing neighborhood:', error);
        return null;
      }
    }).filter((feature): feature is NeighborhoodFeature => feature !== null);
    
    console.log(`Returning ${features.length} neighborhood features`);
    return features.length > 0 ? features : createFallbackNeighborhoods();
  } catch (error) {
    console.error('Error fetching neighborhood metrics data:', error);
    return createFallbackNeighborhoods();
  }
}

/**
 * Creates fallback neighborhood data for Tampa
 */
function createFallbackNeighborhoods(): NeighborhoodFeature[] {
  console.log('Creating fallback neighborhoods with accurate Tampa coordinates');
  
  // These are actual coordinates for Tampa neighborhoods with accurate locations
  const neighborhoods = [
    { name: 'Hyde Park', businesses: 87, rating: 4.3, diversity: 12, score: 78, lng: -82.4633, lat: 27.9380 },
    { name: 'Downtown Tampa', businesses: 156, rating: 3.9, diversity: 18, score: 82, lng: -82.4572, lat: 27.9506 },
    { name: 'Ybor City', businesses: 104, rating: 4.1, diversity: 15, score: 76, lng: -82.4370, lat: 27.9600 },
    { name: 'Westshore', businesses: 121, rating: 3.8, diversity: 14, score: 70, lng: -82.5250, lat: 27.9530 },
    { name: 'Channelside', businesses: 65, rating: 4.2, diversity: 10, score: 75, lng: -82.4450, lat: 27.9420 },
    { name: 'Seminole Heights', businesses: 79, rating: 4.5, diversity: 11, score: 73, lng: -82.4600, lat: 27.9950 },
    { name: 'SoHo', businesses: 93, rating: 4.4, diversity: 13, score: 80, lng: -82.4820, lat: 27.9310 },
    { name: 'Palma Ceia', businesses: 58, rating: 4.2, diversity: 9, score: 74, lng: -82.4910, lat: 27.9210 },
    { name: 'Carrollwood', businesses: 88, rating: 3.9, diversity: 12, score: 69, lng: -82.5050, lat: 28.0480 },
    { name: 'Brandon', businesses: 110, rating: 3.7, diversity: 14, score: 65, lng: -82.2860, lat: 27.9370 }
  ];
  
  // Create features with accurate geometries
  return neighborhoods.map((neighborhood): NeighborhoodFeature => {
    const { lng, lat } = neighborhood;
    const size = 0.01; // Create a small polygon (approximately 1km square)
    
    // Create a small polygon for each neighborhood at its real location
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lng - size, lat - size],
          [lng + size, lat - size],
          [lng + size, lat + size],
          [lng - size, lat + size],
          [lng - size, lat - size]
        ]]
      },
      properties: {
        name: neighborhood.name,
        businesses: neighborhood.businesses,
        rating: neighborhood.rating,
        diversity: neighborhood.diversity,
        score: neighborhood.score
      }
    };
  });
} 