import React from 'react';
import { useCategoryStats } from '../../hooks/useStatistics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface CategoryAnalysisProps {
  areaId?: string;
  minCount?: number;
}

const CategoryAnalysis: React.FC<CategoryAnalysisProps> = ({ 
  areaId,
  minCount = 5 // Only show categories with at least 5 businesses by default
}) => {
  const { data: categoryStats, isLoading, error } = useCategoryStats(areaId, minCount);

  // Debug logs
  console.log(`\n=== CategoryAnalysis Render ===`);
  console.log('Selected Area:', areaId);
  console.log('Data Status:', { isLoading, hasError: !!error, hasData: !!categoryStats });
  
  if (isLoading) {
    console.log('State: Loading');
    return (
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  if (error || !categoryStats) {
    console.error('State: Error', error);
    return (
      <div className="text-center text-red-600 dark:text-red-400 p-4">
        Failed to load category statistics
      </div>
    );
  }

  console.log('Data received:', {
    totalCategories: categoryStats.length,
    totalBusinesses: categoryStats.reduce((sum, stat) => sum + stat.business_count, 0),
    sampleCategories: categoryStats.slice(0, 3)
  });

  // Log unique categories before sorting
  console.log('CategoryAnalysis - Unique categories:', 
    [...new Set(categoryStats.map(stat => stat.category))]);

  // Sort categories by count and take top 15
  const sortedData = [...categoryStats]
    .sort((a, b) => b.business_count - a.business_count)
    .slice(0, 15)
    .map(stat => ({
      ...stat,
      // Format category name to be more readable
      category: stat.category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }));

  console.log('Processed data:', {
    topCategories: sortedData.map(d => d.category),
    topCounts: sortedData.map(d => d.business_count)
  });
  console.log('===========================\n');

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{
            top: 20,
            right: 30,
            left: 40,
            bottom: 60
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="category"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ fill: 'currentColor', fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: 'currentColor' }}
            label={{ 
              value: 'Number of Businesses',
              angle: -90,
              position: 'insideLeft',
              fill: 'currentColor'
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)',
              borderRadius: '0.375rem'
            }}
          />
          <Bar
            dataKey="business_count"
            fill="var(--primary)"
            name="Businesses"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryAnalysis; 