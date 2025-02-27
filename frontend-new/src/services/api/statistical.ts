import { API_BASE_URL, DEFAULT_HEADERS, handleApiResponse } from './config';
import type { AreaStats, CategoryStats, CompetitionMetrics, ReviewStats } from '../../types/api';

export async function getAreaStats(areaId?: string): Promise<AreaStats[]> {
  const url = new URL(`${API_BASE_URL}/stats/area-overview`);
  if (areaId) {
    // Convert spaces and hyphens to underscores for the API
    const formattedAreaId = areaId.replace(/[-\s]/g, '_');
    url.searchParams.append('area_id', formattedAreaId);
  }

  const response = await fetch(url.toString(), {
    headers: DEFAULT_HEADERS,
  });

  return handleApiResponse<AreaStats[]>(response);
}

export async function getCategoryStats(areaId?: string, minCount = 1): Promise<CategoryStats[]> {
  const url = new URL(`${API_BASE_URL}/stats/category-analysis`);
  if (areaId) {
    // Handle special cases and ensure proper capitalization
    let formattedCity = areaId;
    if (areaId === 'Saint Petersburg') {
      formattedCity = 'Saint Petersburg';
    } else if (areaId === 'Surrounding Areas') {
      formattedCity = ''; // or handle differently if needed
    } else {
      // Capitalize first letter of each word, handle special cases
      formattedCity = areaId
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    url.searchParams.append('city', formattedCity);
  }
  url.searchParams.append('min_count', minCount.toString());

  console.log(`\n--- Category Stats API Call ---`);
  console.log('Request URL:', url.toString());
  console.log('City Parameter:', areaId ? url.searchParams.get('city') : 'none');

  const response = await fetch(url.toString(), {
    headers: DEFAULT_HEADERS,
  });

  const data = await handleApiResponse<CategoryStats[]>(response);
  console.log('Response Status:', response.status);
  console.log('Response Data Length:', data?.length || 0);
  console.log('First 3 categories:', data?.slice(0, 3));
  console.log('------------------------\n');
  return data;
}

export async function getCompetitionMetrics(areaId?: string): Promise<CompetitionMetrics[]> {
  const url = new URL(`${API_BASE_URL}/stats/competition-overview`);
  if (areaId) {
    // Convert spaces and hyphens to underscores for the API
    const formattedAreaId = areaId.replace(/[-\s]/g, '_');
    url.searchParams.append('area_id', formattedAreaId);
  }

  const response = await fetch(url.toString(), {
    headers: DEFAULT_HEADERS,
  });

  return handleApiResponse<CompetitionMetrics[]>(response);
}

export async function getReviewStats(city?: string, minReviews = 0): Promise<ReviewStats[]> {
  const url = new URL(`${API_BASE_URL}/stats/review-stats`);
  if (city) {
    url.searchParams.append('city', city);
  }
  url.searchParams.append('min_reviews', minReviews.toString());

  const response = await fetch(url.toString(), {
    headers: DEFAULT_HEADERS,
  });

  return handleApiResponse<ReviewStats[]>(response);
} 