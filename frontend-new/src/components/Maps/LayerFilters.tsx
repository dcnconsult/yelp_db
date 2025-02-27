import React from 'react';

// Density Grid Filters
interface DensityFiltersProps {
  minRating: number;
  onMinRatingChange: (rating: number) => void;
}

export const DensityFilters: React.FC<DensityFiltersProps> = ({ minRating, onMinRatingChange }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-md">
      <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Density Filters</h3>
      
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Minimum Rating: {minRating.toFixed(1)}
        </label>
        <input 
          type="range" 
          min="1" 
          max="5" 
          step="0.5"
          value={minRating} 
          onChange={(e) => onMinRatingChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
};

// Business Clusters Filters
interface ClusterFiltersProps {
  minSize: number;
  category: string; 
  onMinSizeChange: (size: number) => void;
  onCategoryChange: (category: string) => void;
  categories: string[];
}

export const ClusterFilters: React.FC<ClusterFiltersProps> = ({ 
  minSize, 
  category, 
  onMinSizeChange, 
  onCategoryChange, 
  categories 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-md">
      <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Cluster Filters</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Minimum Cluster Size: {minSize}
          </label>
          <input 
            type="range" 
            min="3" 
            max="20" 
            value={minSize} 
            onChange={(e) => onMinSizeChange(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

// Neighborhood Filters
interface NeighborhoodFiltersProps {
  minScore: number;
  onMinScoreChange: (score: number) => void;
}

export const NeighborhoodFilters: React.FC<NeighborhoodFiltersProps> = ({ minScore, onMinScoreChange }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-md">
      <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Neighborhood Filters</h3>
      
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Minimum Quality Score: {minScore}
        </label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={minScore} 
          onChange={(e) => onMinScoreChange(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
}; 