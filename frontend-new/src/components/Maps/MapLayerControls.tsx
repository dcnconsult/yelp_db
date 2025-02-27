import React from 'react';

export type MapLayerType = 'density' | 'clusters' | 'neighborhoods';

interface MapLayerControlsProps {
  activeLayer: MapLayerType;
  onChange: (layer: MapLayerType) => void;
}

const MapLayerControls: React.FC<MapLayerControlsProps> = ({ activeLayer, onChange }) => {
  return (
    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-md shadow-md z-10">
      <div className="flex flex-col space-y-2">
        <button 
          className={`px-3 py-2 text-sm rounded-md ${
            activeLayer === 'density' 
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' 
              : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => onChange('density')}
        >
          Business Density
        </button>
        <button 
          className={`px-3 py-2 text-sm rounded-md ${
            activeLayer === 'clusters' 
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' 
              : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => onChange('clusters')}
        >
          Business Clusters
        </button>
        <button 
          className={`px-3 py-2 text-sm rounded-md ${
            activeLayer === 'neighborhoods' 
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' 
              : 'bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => onChange('neighborhoods')}
        >
          Neighborhoods
        </button>
      </div>
    </div>
  );
};

export default MapLayerControls; 