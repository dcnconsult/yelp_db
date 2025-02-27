import React, { useMemo } from 'react';
import { useReviewStats } from '../../hooks/useStatistics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import StatCard from '../Common/StatCard';

const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#312e81'];
const RADAR_COLORS = ['#4f46e5', '#ef4444', '#22c55e', '#eab308', '#8b5cf6'];

interface ReviewStatisticsProps {
  areaId?: string;
}

const ReviewStatistics: React.FC<ReviewStatisticsProps> = ({ areaId }) => {
  const { data: reviewStats, isLoading, error } = useReviewStats(areaId);

  const {
    reviewDistributionData,
    totalReviews,
    totalReviewers,
    avgRating,
    avgReviewLength,
    engagementMetrics,
    cityComparison
  } = useMemo(() => {
    if (!reviewStats) {
      return {
        reviewDistributionData: [],
        totalReviews: 0,
        totalReviewers: 0,
        avgRating: 0,
        avgReviewLength: 0,
        engagementMetrics: [],
        cityComparison: []
      };
    }

    const distribution = reviewStats.map(stat => ({
      city: stat.city,
      positive: stat.positive_reviews,
      negative: stat.negative_reviews,
      total: stat.review_count,
      avgLength: Math.round(stat.avg_review_length)
    }));

    // Calculate engagement metrics
    const engagement = reviewStats.map(stat => ({
      city: stat.city,
      reviewsPerUser: +(stat.review_count / stat.unique_reviewers).toFixed(2),
      positivePercentage: +((stat.positive_reviews / stat.review_count) * 100).toFixed(1),
      avgReviewLength: Math.round(stat.avg_review_length),
      rating: stat.avg_rating,
      engagement: +((stat.unique_reviewers / stat.review_count) * 100).toFixed(1)
    }));

    // Calculate city comparison metrics
    const comparison = reviewStats.map(stat => ({
      city: stat.city,
      metrics: [
        { name: 'Rating', value: stat.avg_rating },
        { name: 'Reviews/User', value: +(stat.review_count / stat.unique_reviewers).toFixed(2) },
        { name: 'Pos. Rate', value: +((stat.positive_reviews / stat.review_count) * 100).toFixed(1) },
        { name: 'Engagement', value: +((stat.unique_reviewers / stat.review_count) * 100).toFixed(1) },
        { name: 'Length', value: +(stat.avg_review_length / 500).toFixed(2) } // Normalized to 0-1 scale
      ]
    }));

    return {
      reviewDistributionData: distribution,
      totalReviews: reviewStats.reduce((sum, stat) => sum + stat.review_count, 0),
      totalReviewers: reviewStats.reduce((sum, stat) => sum + stat.unique_reviewers, 0),
      avgRating: reviewStats.reduce((sum, stat) => sum + stat.avg_rating, 0) / reviewStats.length,
      avgReviewLength: Math.round(
        reviewStats.reduce((sum, stat) => sum + stat.avg_review_length, 0) / reviewStats.length
      ),
      engagementMetrics: engagement,
      cityComparison: comparison
    };
  }, [reviewStats]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (error || !reviewStats) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 p-4">
        Failed to load review statistics
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reviews"
          value={totalReviews.toLocaleString()}
          subtitle="Across all areas"
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Unique Reviewers"
          value={totalReviewers.toLocaleString()}
          subtitle="Active contributors"
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Average Rating"
          value={avgRating.toFixed(2)}
          subtitle="Out of 5.0"
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Avg Review Length"
          value={`${avgReviewLength}`}
          subtitle="Characters"
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Review Distribution by City
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="city" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.375rem'
                  }}
                />
                <Bar dataKey="positive" name="Positive Reviews" fill={COLORS[0]} stackId="reviews" />
                <Bar dataKey="negative" name="Negative Reviews" fill={COLORS[2]} stackId="reviews" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            City Engagement Metrics
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="city" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.375rem'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="reviewsPerUser"
                  name="Reviews per User"
                  stroke={COLORS[0]}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="positivePercentage"
                  name="Positive Review %"
                  stroke={COLORS[2]}
                  strokeWidth={2}
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Comparison Radar Charts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:col-span-2">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            City Performance Comparison
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cityComparison.map((city, idx) => (
              <div key={city.city} className="h-[300px]">
                <h5 className="text-sm font-medium text-center mb-2">{city.city}</h5>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={city.metrics}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} />
                    <Radar
                      name={city.city}
                      dataKey="value"
                      stroke={RADAR_COLORS[idx % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[idx % RADAR_COLORS.length]}
                      fillOpacity={0.5}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* City-specific Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviewStats.map((stat, index) => (
          <div
            key={stat.city}
            className="bg-white dark:bg-gray-800 rounded-lg p-4"
            style={{ borderLeft: `4px solid ${COLORS[index % COLORS.length]}` }}
          >
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {stat.city}
            </h4>
            <div className="mt-2 space-y-2">
              <p className="text-2xl font-semibold text-text">
                {stat.review_count.toLocaleString()} reviews
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.unique_reviewers.toLocaleString()} unique reviewers
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Average rating: {stat.avg_rating.toFixed(2)}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">
                  {stat.positive_reviews.toLocaleString()} positive
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {stat.negative_reviews.toLocaleString()} negative
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewStatistics; 