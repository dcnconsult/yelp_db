import { useQuery } from '@tanstack/react-query';
import {
  getDensityGrid,
  getBusinessClusters,
  getNeighborhoodMetrics,
} from '../services/api/geographical';

/**
 * Hook to fetch density grid data with minimum rating filter
 */
export function useDensityGrid(minRating = 1) {
  return useQuery({
    queryKey: ['density-grid', minRating],
    queryFn: async () => {
      try {
        const data = await getDensityGrid(minRating);
        return data || [];
      } catch (error) {
        console.error('Error fetching density grid data:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache (reduced from 5)
    retry: 1, // Reduced retries to avoid hanging on errors
    retryDelay: 1000,
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch business cluster data with minimum size filter
 */
export function useBusinessClusters(minSize = 5) {
  return useQuery({
    queryKey: ['business-clusters', minSize],
    queryFn: async () => {
      try {
        const data = await getBusinessClusters(minSize);
        return data || [];
      } catch (error) {
        console.error('Error fetching business cluster data:', error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache (reduced from 5)
    retry: 1, // Reduced retries to avoid hanging on errors
    retryDelay: 1000,
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch neighborhood metrics data with minimum score filter
 */
export function useNeighborhoodMetrics(minScore = 0) {
  return useQuery({
    queryKey: ['neighborhood-metrics', minScore],
    queryFn: async () => {
      try {
        const data = await getNeighborhoodMetrics(minScore);
        if (!data) {
          console.warn('No neighborhood data available, using fallback');
          return null; // Return null to trigger fallback in the component
        }
        return data;
      } catch (error) {
        console.error('Error fetching neighborhood metrics data:', error);
        return null; // Return null to trigger fallback in the component
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache (reduced from 5)
    retry: 1, // Only retry once for neighborhoods since we have fallback
    retryDelay: 1000,
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
    placeholderData: (previousData) => previousData,
  });
} 