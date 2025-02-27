import { useQuery } from '@tanstack/react-query';
import {
  getAreaStats,
  getCategoryStats,
  getCompetitionMetrics,
  getReviewStats,
} from '../services/api/statistical';

export function useAreaStats(areaId?: string) {
  return useQuery({
    queryKey: ['areaStats', areaId],
    queryFn: () => getAreaStats(areaId),
  });
}

export function useCategoryStats(areaId?: string, minCount = 1) {
  return useQuery({
    queryKey: ['categoryStats', areaId, minCount],
    queryFn: () => getCategoryStats(areaId, minCount),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always'
  });
}

export function useCompetitionMetrics(areaId?: string) {
  return useQuery({
    queryKey: ['competitionMetrics', areaId],
    queryFn: () => getCompetitionMetrics(areaId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always'
  });
}

export function useReviewStats(city?: string, minReviews = 0) {
  return useQuery({
    queryKey: ['reviewStats', city, minReviews],
    queryFn: () => getReviewStats(city, minReviews),
  });
} 