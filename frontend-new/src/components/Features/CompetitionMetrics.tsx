import React from 'react';
import { useCompetitionMetrics } from '../../hooks/useStatistics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff'];

interface CompetitionMetricsProps {
  areaId?: string;
}

const CompetitionMetrics: React.FC<CompetitionMetricsProps> = ({ areaId }) => {
  const { data: metrics, isLoading, error } = useCompetitionMetrics(areaId);

  console.log('CompetitionMetrics - Selected Area:', areaId);
  console.log('CompetitionMetrics - Data:', metrics);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 p-4">
        Failed to load competition metrics
      </div>
    );
  }

  // Format data for charts
  const chartData = metrics.map(metric => ({
    ...metric,
    range: metric.range,
    count: metric.count,
    percentage: parseFloat(metric.percentage.toFixed(1)),
    avg_rating: parseFloat(metric.avg_rating.toFixed(2))
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Rating Distribution
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="range"
                  label={{ 
                    value: 'Star Rating Range', 
                    position: 'bottom',
                    offset: 0
                  }}
                />
                <YAxis
                  label={{ 
                    value: 'Number of Businesses', 
                    angle: -90,
                    position: 'insideLeft'
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.375rem'
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Share Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Business Distribution by Rating Range
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="percentage"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    percentage,
                  }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                    return (
                      <text
                        x={x}
                        y={y}
                        fill="currentColor"
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                      >
                        {`${percentage}%`}
                      </text>
                    );
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.375rem'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Competition Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {chartData.map((metric, index) => (
          <div
            key={metric.range}
            className="bg-white dark:bg-gray-800 rounded-lg p-4"
            style={{
              borderLeft: `4px solid ${COLORS[index % COLORS.length]}`
            }}
          >
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {metric.range} stars
            </h4>
            <div className="mt-2 space-y-1">
              <p className="text-2xl font-semibold text-text">
                {metric.count.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Avg Rating: {metric.avg_rating}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {metric.percentage}% of total
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompetitionMetrics; 