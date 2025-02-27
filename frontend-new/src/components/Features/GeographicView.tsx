import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl, { Expression } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useDensityGrid, useBusinessClusters, useNeighborhoodMetrics } from '../../hooks/useGeographic';
import type { Feature, Geometry, Polygon, FeatureCollection, GeoJsonProperties } from 'geojson';
import MapLayerControls, { MapLayerType } from '../Maps/MapLayerControls';
import MapLegend from '../Maps/MapLegend';
import { DensityFilters, ClusterFilters, NeighborhoodFilters } from '../Maps/LayerFilters';
import { 
  DensityGridFeature, 
  BusinessClusterFeature, 
  NeighborhoodFeature 
} from '../../services/api/geographical';

// Note: Replace with your Mapbox token in .env.local
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

interface GeographicViewProps {
  areaId?: string;
}

// Tampa area bounding box
const TAMPA_BOUNDS = {
  west: -83.0,  // Slightly west of Tampa
  east: -82.0,  // Slightly east of Tampa
  south: 27.5,  // Slightly south of Tampa
  north: 28.2   // Slightly north of Tampa
};

const TAMPA_CENTER: [number, number] = [-82.4572, 27.9506];
const DEFAULT_ZOOM = 11;

const LAYER_COLORS: { [key: string]: Expression } = {
  density: [
    'interpolate',
    ['linear'],
    ['get', 'avg_rating'],
    0, '#e66767',
    3, '#f5cd79',
    5, '#78e08f'
  ] as Expression,
  clusters: [
    'interpolate',
    ['linear'],
    ['get', 'rating'],
    1, '#e66767',
    3, '#f5cd79',
    5, '#78e08f'
  ] as Expression,
  neighborhoods: [
    'interpolate',
    ['linear'],
    ['get', 'score'],
    0, '#e66767',
    50, '#f5cd79',
    100, '#78e08f'
  ] as Expression
};

// Map legends configuration
const LEGENDS = {
  density: {
    title: 'Business Density',
    items: [
      { color: '#e66767', label: 'Low Rating (0-2 ★)' },
      { color: '#f5cd79', label: 'Medium Rating (3-4 ★)' },
      { color: '#78e08f', label: 'High Rating (4-5 ★)' }
    ]
  },
  clusters: {
    title: 'Business Clusters',
    items: [
      { color: '#e66767', label: 'Low Rating (1-2 ★)' },
      { color: '#f5cd79', label: 'Medium Rating (3-4 ★)' },
      { color: '#78e08f', label: 'High Rating (4-5 ★)' }
    ]
  },
  neighborhoods: {
    title: 'Neighborhood Metrics',
    items: [
      { color: '#e66767', label: 'Low Score (0-33)' },
      { color: '#f5cd79', label: 'Medium Score (34-66)' },
      { color: '#78e08f', label: 'High Score (67-100)' }
    ]
  }
};

function isInTampaBounds(coordinates: number[][][]): boolean {
  // Guard against invalid coordinates
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
    console.warn('Invalid coordinates structure:', coordinates);
    return false;
  }
  
  try {
    // Check if any point in the first ring is within Tampa bounds
    const ring = coordinates[0];
    if (!Array.isArray(ring) || ring.length === 0) {
      console.warn('Invalid ring structure in coordinates');
      return false;
    }
    
    return ring.some(([lon, lat]) => {
      if (typeof lon !== 'number' || typeof lat !== 'number') {
        console.warn('Invalid coordinate point:', [lon, lat]);
        return false;
      }
      
      return lon >= TAMPA_BOUNDS.west && 
             lon <= TAMPA_BOUNDS.east && 
             lat >= TAMPA_BOUNDS.south && 
             lat <= TAMPA_BOUNDS.north;
    });
  } catch (error) {
    console.warn('Error checking Tampa bounds:', error);
    return false;
  }
}

const GeographicView: React.FC<GeographicViewProps> = ({ areaId }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [mapSourcesReady, setMapSourcesReady] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('density');
  const [showMap, setShowMap] = useState(false);
  const [isLayerTransitioning, setIsLayerTransitioning] = useState(false);
  const [apiError, setApiError] = useState(false);
  
  // Layer-specific filter states
  const [minRating, setMinRating] = useState(1);
  const [minClusterSize, setMinClusterSize] = useState(5);
  const [clusterCategory, setClusterCategory] = useState('');
  const [minNeighborhoodScore, setMinNeighborhoodScore] = useState(0);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Fetch data with filters
  const { data: densityData, isLoading: isDensityLoading } = useDensityGrid(minRating);
  const { data: clusterData, isLoading: isClusterLoading } = useBusinessClusters(minClusterSize);
  const { data: neighborhoodData, isLoading: isNeighborhoodLoading } = useNeighborhoodMetrics(minNeighborhoodScore);

  // Debug log to inspect data structure
  useEffect(() => {
    if (clusterData && clusterData.length > 0) {
      console.log('Received business cluster data structure:', {
        firstCluster: clusterData[0],
        totalClusters: clusterData.length,
        hasCategories: clusterData[0].properties && Array.isArray(clusterData[0].properties.categories),
        categoriesExample: clusterData[0].properties?.categories?.slice(0, 5),
      });
    }
    
    if (neighborhoodData && neighborhoodData.length > 0) {
      console.log('Received neighborhood data structure:', {
        firstNeighborhood: neighborhoodData[0],
        totalNeighborhoods: neighborhoodData.length,
        coordinates: neighborhoodData[0].geometry?.coordinates || 'No coordinates found',
        properties: neighborhoodData[0].properties
      });
    }
  }, [clusterData, neighborhoodData]);

  // Loading state
  const isLoading = isDensityLoading || isClusterLoading || isNeighborhoodLoading;

  // Set error state if we have no data
  useEffect(() => {
    if (!isLoading) {
      if (
        (!densityData || densityData.length === 0) && 
        (!clusterData || clusterData.length === 0) && 
        (!neighborhoodData || neighborhoodData.length === 0)
      ) {
        console.warn('No geographic data available - API error detected');
        setApiError(true);
      } else {
        setApiError(false);
      }
    }
  }, [densityData, clusterData, neighborhoodData, isLoading]);

  // Extract unique categories from cluster data
  useEffect(() => {
    if (clusterData && clusterData.length > 0) {
      const categories = new Set<string>();
      clusterData.forEach(cluster => {
        if (cluster && cluster.properties && Array.isArray(cluster.properties.categories)) {
          cluster.properties.categories.forEach((cat: string) => categories.add(cat));
        }
      });
      setAvailableCategories(Array.from(categories).sort());
    }
  }, [clusterData]);

  // Cleanup function
  const cleanupMap = () => {
    if (map.current) {
      console.log('Cleaning up map...');
      map.current.remove();
      map.current = null;
      setIsMapLoaded(false);
      setIsMapInitialized(false);
      setMapSourcesReady(false);
      setShowMap(false);
      setIsLayerTransitioning(false);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || isMapInitialized) return;

    console.log('Initializing map...');
    setIsMapInitialized(true);

    try {
      // Ensure mapContainer is empty before initializing Mapbox
      if (mapContainer.current.hasChildNodes()) {
        console.log('Clearing map container before initialization');
        while (mapContainer.current.firstChild) {
          mapContainer.current.removeChild(mapContainer.current.firstChild);
        }
      }

      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: TAMPA_CENTER,
        zoom: DEFAULT_ZOOM,
        maxBounds: [
          [TAMPA_BOUNDS.west, TAMPA_BOUNDS.south],
          [TAMPA_BOUNDS.east, TAMPA_BOUNDS.north]
        ]
      });

      // Add navigation controls
      newMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Wait for map to load before adding layers
      newMap.on('load', () => {
        console.log('Map loaded, adding sources and layers...');
        
        // Add empty sources
        newMap.addSource('density-grid', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        
        newMap.addSource('business-clusters', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        
        newMap.addSource('neighborhoods', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        
        // Add density grid layer
        newMap.addLayer({
          id: 'density-grid-layer',
          type: 'fill',
          source: 'density-grid',
          layout: { visibility: 'visible' },
          paint: {
            'fill-color': LAYER_COLORS.density,
            'fill-opacity': 0.8,
            'fill-outline-color': 'rgba(65, 105, 225, 0.5)'
          }
        });
        
        // Add cluster layers
        newMap.addLayer({
          id: 'clusters-circle',
          type: 'circle',
          source: 'business-clusters',
          layout: { visibility: 'none' },
          paint: {
            'circle-color': LAYER_COLORS.clusters,
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'size'],
              5, 10,
              20, 25,
              50, 40
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        });
        
        newMap.addLayer({
          id: 'cluster-labels',
          type: 'symbol',
          source: 'business-clusters',
          layout: {
            'visibility': 'none',
            'text-field': ['get', 'size'],
            'text-font': ['Open Sans Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });
        
        // Add neighborhood layer
        newMap.addLayer({
          id: 'neighborhoods-layer',
          type: 'fill',
          source: 'neighborhoods',
          layout: { visibility: 'none' },
          paint: {
            'fill-color': LAYER_COLORS.neighborhoods,
            'fill-opacity': 0.7
          }
        });
        
        // Add neighborhood outlines to make them more visible
        newMap.addLayer({
          id: 'neighborhoods-outline',
          type: 'line',
          source: 'neighborhoods',
          layout: { visibility: 'none' },
          paint: {
            'line-color': '#000',
            'line-width': 1,
            'line-opacity': 0.5
          }
        });
        
        // Add neighborhood labels
        newMap.addLayer({
          id: 'neighborhoods-labels',
          type: 'symbol',
          source: 'neighborhoods',
          layout: {
            'visibility': 'none',
            'text-field': [
              'format',
              ['get', 'name'], { 'font-scale': 1.0 },
              '\n', {},
              ['concat', 'Score: ', ['get', 'score']], { 'font-scale': 0.8 }
            ],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-max-width': 12
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1
          }
        });

        map.current = newMap;
        setIsMapLoaded(true);
        setMapSourcesReady(true);
        console.log('Map initialization complete');
        
        // Small delay to ensure everything is loaded properly
        setTimeout(() => {
          setShowMap(true);
        }, 500);
      });

      // Add error handling
      newMap.on('error', (e) => {
        console.error('Mapbox error:', e);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setIsMapInitialized(false);
    }

    return cleanupMap;
  }, [mapContainer.current]); // Only reinitialize if container changes

  // Function to safely update a map source
  const safelyUpdateMapSource = useCallback((sourceName: string, data: any) => {
    if (!map.current || !isMapLoaded || !mapSourcesReady) {
      console.log(`Cannot update ${sourceName} - map not ready`);
      return false;
    }
    
    try {
      const source = map.current.getSource(sourceName) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(data);
        return true;
      } else {
        console.warn(`Source ${sourceName} not found`);
        return false;
      }
    } catch (error) {
      console.error(`Error updating ${sourceName}:`, error);
      return false;
    }
  }, [isMapLoaded, mapSourcesReady]);

  // Handle density data updates
  useEffect(() => {
    if (!isMapLoaded || !mapSourcesReady || isLayerTransitioning || isDensityLoading) {
      return;
    }
    
    if (!densityData || !Array.isArray(densityData) || densityData.length === 0) {
      console.warn('No density grid data available');
      
      // Update with empty data to clear the layer
      safelyUpdateMapSource('density-grid', {
        type: 'FeatureCollection',
        features: []
      });
      
      return;
    }
    
    console.log(`Updating density grid data with ${densityData.length} features`);
    
    try {
      // Check if each feature has the expected structure
      const validFeatures = densityData.filter(feature => {
        if (!feature || 
            !feature.geometry || 
            !feature.geometry.coordinates || 
            !Array.isArray(feature.geometry.coordinates)) {
          console.warn('Invalid density grid feature', feature);
          return false;
        }
        return true;
      });
      
      if (validFeatures.length === 0) {
        console.warn('No valid density grid features to display');
        return;
      }
      
      const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: validFeatures
      };
      
      // Try to update immediately, but also schedule additional update attempts
      const updated = safelyUpdateMapSource('density-grid', featureCollection);
      
      // If not updated successfully, try again after a delay
      if (!updated) {
        const retryInterval = setInterval(() => {
          if (map.current && isMapLoaded && mapSourcesReady && !isLayerTransitioning) {
            const retrySuccess = safelyUpdateMapSource('density-grid', featureCollection);
            if (retrySuccess) {
              console.log('Successfully updated density grid on retry');
              clearInterval(retryInterval);
            }
          }
        }, 500);
        
        // Clear interval after 5 seconds no matter what
        setTimeout(() => {
          clearInterval(retryInterval);
          console.log('Density grid update retries ended');
        }, 5000);
      }
    } catch (error) {
      console.error('Error updating density grid:', error);
    }
  }, [densityData, isMapLoaded, mapSourcesReady, isLayerTransitioning, isDensityLoading, safelyUpdateMapSource]);

  // Handle cluster data updates
  useEffect(() => {
    if (!isMapLoaded || !mapSourcesReady || isLayerTransitioning || isClusterLoading) {
      return;
    }
    
    if (!clusterData || !Array.isArray(clusterData) || clusterData.length === 0) {
      console.warn('No business cluster data available');
      
      // Update with empty data to clear the layer
      safelyUpdateMapSource('business-clusters', {
        type: 'FeatureCollection',
        features: []
      });
      
      return;
    }
    
    console.log(`Updating business clusters data with ${clusterData.length} features`);
    
    try {
      // Filter by category if specified
      let filteredClusters = clusterData;
      
      if (clusterCategory) {
        console.log(`Filtering clusters by category: ${clusterCategory}`);
        filteredClusters = clusterData.filter(cluster => {
          return cluster && 
                 cluster.properties && 
                 Array.isArray(cluster.properties.categories) && 
                 cluster.properties.categories.includes(clusterCategory);
        });
        console.log(`Found ${filteredClusters.length} clusters with category ${clusterCategory}`);
      }
      
      // Check if each feature has the expected structure
      const validFeatures = filteredClusters.filter(feature => {
        if (!feature || 
            !feature.geometry || 
            !feature.geometry.coordinates || 
            !Array.isArray(feature.geometry.coordinates)) {
          console.warn('Invalid business cluster feature', feature);
          return false;
        }
        return true;
      });
      
      if (validFeatures.length === 0) {
        console.warn('No valid business cluster features to display');
        
        // Update with empty data to clear the layer
        safelyUpdateMapSource('business-clusters', {
          type: 'FeatureCollection',
          features: []
        });
        
        return;
      }
      
      const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: validFeatures
      };
      
      // Try to update immediately, but also schedule additional update attempts
      const updated = safelyUpdateMapSource('business-clusters', featureCollection);
      
      // If not updated successfully, try again after a delay
      if (!updated) {
        const retryInterval = setInterval(() => {
          if (map.current && isMapLoaded && mapSourcesReady && !isLayerTransitioning) {
            const retrySuccess = safelyUpdateMapSource('business-clusters', featureCollection);
            if (retrySuccess) {
              console.log('Successfully updated business clusters on retry');
              clearInterval(retryInterval);
            }
          }
        }, 500);
        
        // Clear interval after 5 seconds no matter what
        setTimeout(() => {
          clearInterval(retryInterval);
          console.log('Business clusters update retries ended');
        }, 5000);
      }
    } catch (error) {
      console.error('Error updating business clusters:', error);
    }
  }, [clusterData, clusterCategory, isMapLoaded, mapSourcesReady, isLayerTransitioning, isClusterLoading, safelyUpdateMapSource]);

  // Handle neighborhood data updates
  useEffect(() => {
    if (!isMapLoaded || !mapSourcesReady || isLayerTransitioning || isNeighborhoodLoading) {
      return;
    }
    
    console.log("Attempting to update neighborhood data");
    console.log("Neighborhood data available:", neighborhoodData ? `${neighborhoodData.length} neighborhoods` : 'No data');
    
    try {
      // Generate fallback data if the API call failed or returned empty data
      let dataToUse;
      
      if (neighborhoodData && Array.isArray(neighborhoodData) && neighborhoodData.length > 0) {
        console.log(`Using ${neighborhoodData.length} neighborhoods from API`);
        
        // Debug: Log some neighborhood coordinates to verify they look correct
        neighborhoodData.slice(0, 3).forEach((n, i) => {
          console.log(`Neighborhood ${i} (${n.properties.name}) coordinates:`, 
            n.geometry?.coordinates ? JSON.stringify(n.geometry.coordinates[0].slice(0, 2)) : 'No coordinates');
        });
        
        dataToUse = neighborhoodData;
      } else {
        console.warn("Using fallback neighborhood data due to API error");
        // Create fallback data with Tampa neighborhoods at their actual coordinates
        dataToUse = [
          { 
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [-82.4733, 27.9280],
                [-82.4533, 27.9280],
                [-82.4533, 27.9480],
                [-82.4733, 27.9480],
                [-82.4733, 27.9280]
              ]]
            },
            properties: {
              name: 'Hyde Park',
              businesses: 87,
              rating: 4.3,
              diversity: 12,
              score: 78
            }
          },
          { 
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [-82.4672, 27.9406],
                [-82.4472, 27.9406],
                [-82.4472, 27.9606],
                [-82.4672, 27.9606],
                [-82.4672, 27.9406]
              ]]
            },
            properties: {
              name: 'Downtown Tampa',
              businesses: 156,
              rating: 3.9,
              diversity: 18,
              score: 82
            }
          },
          { 
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [-82.4470, 27.9500],
                [-82.4270, 27.9500],
                [-82.4270, 27.9700],
                [-82.4470, 27.9700],
                [-82.4470, 27.9500]
              ]]
            },
            properties: {
              name: 'Ybor City',
              businesses: 104,
              rating: 4.1,
              diversity: 15,
              score: 76
            }
          },
          { 
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [-82.5350, 27.9430],
                [-82.5150, 27.9430],
                [-82.5150, 27.9630],
                [-82.5350, 27.9630],
                [-82.5350, 27.9430]
              ]]
            },
            properties: {
              name: 'Westshore',
              businesses: 121,
              rating: 3.8,
              diversity: 14,
              score: 70
            }
          },
          { 
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [-82.4700, 27.9850],
                [-82.4500, 27.9850],
                [-82.4500, 28.0050],
                [-82.4700, 28.0050],
                [-82.4700, 27.9850]
              ]]
            },
            properties: {
              name: 'Seminole Heights',
              businesses: 79,
              rating: 4.5,
              diversity: 11,
              score: 73
            }
          }
        ] as NeighborhoodFeature[];
      }

      // Check if each feature has the expected structure
      const validFeatures = dataToUse.filter((feature: any) => {
        if (!feature || 
            !feature.geometry || 
            !feature.geometry.coordinates || 
            !Array.isArray(feature.geometry.coordinates) ||
            !feature.properties) {
          console.warn('Invalid neighborhood feature', feature);
          return false;
        }
        
        // Additional check to ensure coordinates are valid
        try {
          const coords = feature.geometry.coordinates;
          if (!coords[0] || !Array.isArray(coords[0])) {
            console.warn('Invalid coordinates structure in neighborhood feature', coords);
            return false;
          }
          
          // Verify at least a few points have numeric coordinates
          const hasValidPoints = coords[0].slice(0, 3).every(point => 
            Array.isArray(point) && 
            point.length >= 2 && 
            typeof point[0] === 'number' && 
            typeof point[1] === 'number' &&
            !isNaN(point[0]) && 
            !isNaN(point[1])
          );
          
          if (!hasValidPoints) {
            console.warn('Neighborhood has invalid point coordinates', coords[0].slice(0, 3));
            return false;
          }
          
          return true;
        } catch (err) {
          console.warn('Error validating neighborhood coordinates', err);
          return false;
        }
      });
      
      console.log(`Found ${validFeatures.length} valid neighborhood features out of ${dataToUse.length}`);
      
      if (validFeatures.length === 0) {
        console.warn('No valid neighborhood features to display');
        
        // Update with empty data to clear the layer
        safelyUpdateMapSource('neighborhoods', {
          type: 'FeatureCollection',
          features: []
        });
        
        return;
      }
      
      const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: validFeatures
      };
      
      // Try to update immediately, but also schedule additional update attempts
      const updated = safelyUpdateMapSource('neighborhoods', featureCollection);
      
      // If not updated successfully, try again after a delay
      if (!updated) {
        const retryInterval = setInterval(() => {
          if (map.current && isMapLoaded && mapSourcesReady && !isLayerTransitioning) {
            const retrySuccess = safelyUpdateMapSource('neighborhoods', featureCollection);
            if (retrySuccess) {
              console.log('Successfully updated neighborhoods on retry');
              clearInterval(retryInterval);
            }
          }
        }, 500);
        
        // Clear interval after 5 seconds no matter what
        setTimeout(() => {
          clearInterval(retryInterval);
          console.log('Neighborhood update retries ended');
        }, 5000);
      }
    } catch (error) {
      console.error('Error updating neighborhoods:', error);
    }
  }, [neighborhoodData, isMapLoaded, mapSourcesReady, isLayerTransitioning, isNeighborhoodLoading, safelyUpdateMapSource]);

  // Force refresh sources function
  const forceRefreshSources = useCallback(() => {
    if (!map.current || !isMapLoaded) return;
    
    try {
      // Force a repaint of the map
      map.current.resize();
      
      // Get references to the sources first
      const densitySource = map.current.getSource('density-grid') as mapboxgl.GeoJSONSource | undefined;
      const clustersSource = map.current.getSource('business-clusters') as mapboxgl.GeoJSONSource | undefined;
      const neighborhoodsSource = map.current.getSource('neighborhoods') as mapboxgl.GeoJSONSource | undefined;
      
      // Ensure sources exist before updating layers
      if (!densitySource || !clustersSource || !neighborhoodsSource) {
        console.warn('Not all map sources are ready, delaying layer update');
        setTimeout(forceRefreshSources, 200);
        return;
      }
      
      // Update only the visibility of active layer to avoid conflicts
      const isNeighborhoods = activeLayer === 'neighborhoods';
      const isClusters = activeLayer === 'clusters';
      const isDensity = activeLayer === 'density';
      
      map.current.setLayoutProperty('density-grid-layer', 'visibility', isDensity ? 'visible' : 'none');
      map.current.setLayoutProperty('clusters-circle', 'visibility', isClusters ? 'visible' : 'none');
      map.current.setLayoutProperty('cluster-labels', 'visibility', isClusters ? 'visible' : 'none');
      map.current.setLayoutProperty('neighborhoods-layer', 'visibility', isNeighborhoods ? 'visible' : 'none');
      map.current.setLayoutProperty('neighborhoods-outline', 'visibility', isNeighborhoods ? 'visible' : 'none');
      map.current.setLayoutProperty('neighborhoods-labels', 'visibility', isNeighborhoods ? 'visible' : 'none');
      
      console.log('Layer visibility updated for:', activeLayer);
    } catch (error) {
      console.error('Error refreshing sources:', error);
    }
  }, [isMapLoaded, activeLayer]);

  // Update layer visibility when active layer changes or map loads
  useEffect(() => {
    if (!map.current || !isMapLoaded || !showMap || isLayerTransitioning) {
      console.log('Map not ready for layer visibility update or layer is transitioning');
      return;
    }
    
    try {
      console.log(`Setting visibility for ${activeLayer} layer`);
      
      // Set only the active layer to visible, all others to none
      // Density grid layer visibility
      map.current.setLayoutProperty(
        'density-grid-layer',
        'visibility',
        activeLayer === 'density' ? 'visible' : 'none'
      );
      
      // Cluster layers visibility
      map.current.setLayoutProperty(
        'clusters-circle',
        'visibility',
        activeLayer === 'clusters' ? 'visible' : 'none'
      );
      
      map.current.setLayoutProperty(
        'cluster-labels',
        'visibility',
        activeLayer === 'clusters' ? 'visible' : 'none'
      );
      
      // Neighborhood layers visibility
      map.current.setLayoutProperty(
        'neighborhoods-layer',
        'visibility',
        activeLayer === 'neighborhoods' ? 'visible' : 'none'
      );
      
      map.current.setLayoutProperty(
        'neighborhoods-outline',
        'visibility',
        activeLayer === 'neighborhoods' ? 'visible' : 'none'
      );
      
      map.current.setLayoutProperty(
        'neighborhoods-labels',
        'visibility',
        activeLayer === 'neighborhoods' ? 'visible' : 'none'
      );
      
      console.log(`Layer visibility updated: ${activeLayer}`);
      
    } catch (error) {
      console.error('Error updating layer visibility:', error);
    }
  }, [isMapLoaded, showMap, activeLayer, isLayerTransitioning]);

  // Render the appropriate filter component based on active layer
  const renderFilters = () => {
    switch (activeLayer) {
      case 'density':
        return (
          <DensityFilters 
            minRating={minRating} 
            onMinRatingChange={setMinRating} 
          />
        );
      case 'clusters':
        return (
          <ClusterFilters 
            minSize={minClusterSize} 
            category={clusterCategory} 
            onMinSizeChange={setMinClusterSize} 
            onCategoryChange={setClusterCategory} 
            categories={availableCategories} 
          />
        );
      case 'neighborhoods':
        return (
          <NeighborhoodFilters 
            minScore={minNeighborhoodScore} 
            onMinScoreChange={setMinNeighborhoodScore} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container with Filters and Controls */}
      <div className="relative">
        {/* Map Container */}
        <div 
          ref={mapContainer} 
          className="w-full h-[calc(100vh-16rem)] rounded-lg shadow-sm overflow-hidden"
        />
        
        {/* Loading Overlay */}
        {(isLoading || !showMap) && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center pointer-events-none">
            <div className="text-white bg-gray-900/70 p-4 rounded-md">
              <div className="mb-2 text-center">Loading map data...</div>
              <div className="flex justify-center">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          </div>
        )}
        
        {/* API Error Message */}
        {apiError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-md text-sm shadow-lg z-20">
            <p>API connection error - using fallback data where available</p>
          </div>
        )}
        
        {/* Map Controls */}
        {isMapLoaded && showMap && (
          <>
            <MapLayerControls 
              activeLayer={activeLayer} 
              onChange={(layer) => {
                if (layer === activeLayer) return;
                
                setIsLayerTransitioning(true);
                console.log(`Switching layer from ${activeLayer} to ${layer}`);
                
                // Clear current layer visibility first
                if (map.current) {
                  try {
                    // Hide current layer
                    if (activeLayer === 'density') {
                      map.current.setLayoutProperty('density-grid-layer', 'visibility', 'none');
                    } else if (activeLayer === 'clusters') {
                      map.current.setLayoutProperty('clusters-circle', 'visibility', 'none');
                      map.current.setLayoutProperty('cluster-labels', 'visibility', 'none');
                    } else if (activeLayer === 'neighborhoods') {
                      map.current.setLayoutProperty('neighborhoods-layer', 'visibility', 'none');
                      map.current.setLayoutProperty('neighborhoods-outline', 'visibility', 'none');
                      map.current.setLayoutProperty('neighborhoods-labels', 'visibility', 'none');
                    }
                  } catch (e) {
                    console.warn('Error hiding current layer:', e);
                  }
                }
                
                // Update active layer
                setActiveLayer(layer);
                
                // Short delay before showing new layer to prevent visual glitches
                setTimeout(() => {
                  forceRefreshSources();
                  setIsLayerTransitioning(false);
                }, 300);
              }} 
            />
            
            <div className="absolute top-4 left-4 z-10">
              {renderFilters()}
            </div>
            
            <div className="absolute bottom-4 left-4 z-10">
              <MapLegend 
                title={`${activeLayer.charAt(0).toUpperCase()}${activeLayer.slice(1)} Legend`}
                items={
                  activeLayer === 'density' 
                    ? [
                        { color: '#e66767', label: 'Low Rating (0-2 ★)' },
                        { color: '#f5cd79', label: 'Medium Rating (3-4 ★)' },
                        { color: '#78e08f', label: 'High Rating (4-5 ★)' }
                      ]
                    : activeLayer === 'clusters'
                    ? [
                        { color: '#e66767', label: 'Low Rating (1-2 ★)' },
                        { color: '#f5cd79', label: 'Medium Rating (3-4 ★)' },
                        { color: '#78e08f', label: 'High Rating (4-5 ★)' }
                      ]
                    : [
                        { color: '#e66767', label: 'Score: 0-40' },
                        { color: '#f5cd79', label: 'Score: 40-70' },
                        { color: '#78e08f', label: 'Score: 70-100' }
                      ]
                }
              />
            </div>
            
            <button
              onClick={forceRefreshSources}
              className="absolute bottom-20 right-4 bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm z-10"
              title="Refresh map data"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Layer Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          {activeLayer === 'density' && 'Business Density Grid'}
          {activeLayer === 'clusters' && 'Business Clusters'}
          {activeLayer === 'neighborhoods' && 'Neighborhood Metrics'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {activeLayer === 'density' && 
            'Visualizes business density across the area using a hexagonal grid. Darker colors indicate higher concentration of businesses.'}
          {activeLayer === 'clusters' && 
            'Shows clusters of related businesses. Circle size indicates cluster size, and color represents average rating.'}
          {activeLayer === 'neighborhoods' && 
            'Displays neighborhood-level metrics including service diversity, accessibility scores, and average ratings.'}
        </p>
      </div>
    </div>
  );
};

export default GeographicView; 