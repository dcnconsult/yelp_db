import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Yelp Analytics Dashboard MVP
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Using Yelp Academic Dataset
          </p>
        </div>
        <div className="flex space-x-4">
          <a 
            href="#" 
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            About
          </a>
          <a 
            href="#" 
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            API
          </a>
          <a 
            href="#" 
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Help
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 