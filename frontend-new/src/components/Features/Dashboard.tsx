import React, { useState } from 'react';
import CategoryAnalysis from './CategoryAnalysis';
import CompetitionMetrics from './CompetitionMetrics';
import ReviewStatistics from './ReviewStatistics';
import GeographicView from './GeographicView';

const AREAS = [
  'Tampa',
  'Saint Petersburg',
  'Clearwater',
  'Brandon',
  'Largo',
  'Surrounding Areas'
];

const formatAreaName = (area: string): string => {
  if (area === 'Saint Petersburg') {
    return 'St. Petersburg';
  }
  return area;
};

type TabType = 'statistics' | 'geographic';

const Dashboard: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('statistics');

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-md">
        <div className="flex items-center justify-between">
          {/* Area Selector */}
          <div className="flex items-center space-x-4 py-2 px-4">
            <label htmlFor="area-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Area:
            </label>
            <select
              id="area-select"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="">All Areas</option>
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {formatAreaName(area)}
                </option>
              ))}
            </select>
          </div>

          {/* Tab Navigation */}
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('statistics')}
              className={`
                border-b-2 py-4 px-4 text-sm font-medium
                ${activeTab === 'statistics'
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:bg-indigo-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'}
              `}
            >
              Statistical Analysis
            </button>
            <button
              onClick={() => setActiveTab('geographic')}
              className={`
                border-b-2 py-4 px-4 text-sm font-medium
                ${activeTab === 'geographic'
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:bg-indigo-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'}
              `}
            >
              Geographic Analysis
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'statistics' ? (
        <div className="space-y-8">
          {/* Review Statistics Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Review Analysis</h2>
            <ReviewStatistics areaId={selectedArea} />
          </section>

          {/* Competition Analysis Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Competition Analysis</h2>
            <CompetitionMetrics areaId={selectedArea} />
          </section>
        </div>
      ) : (
        <GeographicView areaId={selectedArea} />
      )}
    </div>
  );
};

export default Dashboard; 