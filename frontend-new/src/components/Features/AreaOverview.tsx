import React from 'react';
import {
  BuildingStorefrontIcon,
  StarIcon,
  UserGroupIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import StatCard from '../Common/StatCard';
import { useAreaStats } from '../../hooks/useStatistics';

interface AreaOverviewProps {
  areaId?: string;
}

const formatAreaName = (area: string | undefined): string => {
  if (!area) return 'Overall';
  if (area === 'Saint Petersburg') {
    return 'St. Petersburg';
  }
  return area;
};

const AreaOverview: React.FC<AreaOverviewProps> = ({ areaId }) => {
  const { data: areaStats, isLoading, error } = useAreaStats(areaId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !areaStats?.[0]) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 p-4">
        Failed to load area statistics
      </div>
    );
  }

  const stats = areaStats[0];

  const formatNumber = (num: number) => 
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(num);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text">
        {formatAreaName(areaId)} Overview
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Businesses"
          value={formatNumber(stats.business_count)}
          icon={BuildingStorefrontIcon}
        />
        <StatCard
          title="Average Rating"
          value={stats.avg_rating.toFixed(1)}
          icon={StarIcon}
          subtitle="Out of 5.0"
        />
        <StatCard
          title="Total Reviews"
          value={formatNumber(stats.review_count)}
          icon={ChatBubbleBottomCenterTextIcon}
        />
        <StatCard
          title="Unique Reviewers"
          value={formatNumber(stats.unique_reviewers)}
          icon={UserGroupIcon}
          subtitle={`${((stats.unique_reviewers / stats.review_count) * 100).toFixed(1)}% review ratio`}
        />
      </div>
    </div>
  );
};

export default AreaOverview; 