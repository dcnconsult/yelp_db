export const API_BASE_URL = 'http://localhost:8000/api/v1';

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const DEFAULT_FETCH_OPTIONS: RequestInit = {
  headers: DEFAULT_HEADERS,
  mode: 'cors', // Try standard CORS mode first
  credentials: 'omit', // Omit credentials since our API doesn't require authentication
};

// Fallback options without credentials for CORS issues
export const FALLBACK_FETCH_OPTIONS: RequestInit = {
  headers: DEFAULT_HEADERS,
  mode: 'cors',
  credentials: 'omit',
  cache: 'no-cache',
};

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
  isCorsError?: boolean;
};

export class ApiRequestError extends Error {
  constructor(public error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
  }
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      message: response.statusText,
    };

    try {
      const data = await response.json();
      error.details = data;
    } catch {
      // If parsing JSON fails, use the status text
      if (response.status === 0) {
        error.message = 'Network error. Check CORS configuration and server availability.';
        error.isCorsError = true;
      }
    }

    console.error('API Error:', error);
    throw new ApiRequestError(error);
  }

  try {
    return await response.json();
  } catch (err) {
    console.error('Error parsing JSON response:', err);
    throw new ApiRequestError({
      status: response.status,
      message: 'Invalid JSON response from server'
    });
  }
}

// Helper function to detect if an error is a CORS error
export function isCorsError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return true;
  }
  
  if (error instanceof ApiRequestError && error.error.isCorsError) {
    return true;
  }
  
  return false;
} 