import React from 'react';

interface LegendItem {
  color: string;
  label: string;
}

interface MapLegendProps {
  title: string;
  items: LegendItem[];
}

const MapLegend: React.FC<MapLegendProps> = ({ title, items }) => {
  return (
    <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md z-10">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            <div 
              className="w-4 h-4 mr-2 rounded-sm" 
              style={{ backgroundColor: item.color }} 
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapLegend; 