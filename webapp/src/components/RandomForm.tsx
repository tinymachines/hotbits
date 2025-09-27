'use client';

import { useState } from 'react';

interface RandomFormProps {
  onGenerate: (params: GenerateParams) => void;
  onCheckout?: (params: GenerateParams) => void;
  isLoading?: boolean;
  isOffline?: boolean;
  onParamsChange?: (params: GenerateParams) => void;
  initialParams?: GenerateParams;
}

export interface GenerateParams {
  count: number;
  min: number;
  max: number;
  base: number;
  format: 'html' | 'plain';
  columns: number;
}

export default function RandomForm({ onGenerate, onCheckout, isLoading = false, isOffline = false, onParamsChange, initialParams }: RandomFormProps) {
  const [params, setParams] = useState<GenerateParams>(initialParams || {
    count: 100,
    min: 1,
    max: 100,
    base: 10,
    format: 'plain',
    columns: 5
  });

  // Notify parent when params change
  const updateParams = (newParams: GenerateParams) => {
    setParams(newParams);
    onParamsChange?.(newParams);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (params.count > 10000) {
      alert('Maximum 10,000 numbers allowed');
      return;
    }
    if (params.min > params.max) {
      alert('Minimum cannot be greater than maximum');
      return;
    }
    onGenerate(params);
  };

  const handleCheckout = (e: React.MouseEvent) => {
    e.preventDefault();
    if (params.count > 10000) {
      alert('Maximum 10,000 numbers allowed');
      return;
    }
    if (params.min > params.max) {
      alert('Minimum cannot be greater than maximum');
      return;
    }
    if (onCheckout) {
      onCheckout(params);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6">
      <h2 className="text-lg font-semibold mb-4 text-fusion-400">Generate Random Numbers</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-quantum-300 mb-1">
            Count (max 10,000)
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={params.count}
            onChange={(e) => updateParams({ ...params, count: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-quantum-300 mb-1">
            Columns
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={params.columns}
            onChange={(e) => updateParams({ ...params, columns: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-quantum-300 mb-1">
            Minimum
          </label>
          <input
            type="number"
            value={params.min}
            onChange={(e) => updateParams({ ...params, min: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-quantum-300 mb-1">
            Maximum
          </label>
          <input
            type="number"
            value={params.max}
            onChange={(e) => updateParams({ ...params, max: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-quantum-300 mb-2">
          Number Base
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 2, label: 'Binary' },
            { value: 8, label: 'Octal' },
            { value: 10, label: 'Decimal' },
            { value: 16, label: 'Hexadecimal' }
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="base"
                value={value}
                checked={params.base === value}
                onChange={(e) => updateParams({ ...params, base: parseInt(e.target.value) })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-quantum-300">{label}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="plain"
              checked={params.format === 'plain'}
              onChange={(e) => updateParams({ ...params, format: e.target.value as 'plain' | 'html' })}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Plain text</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="html"
              checked={params.format === 'html'}
              onChange={(e) => updateParams({ ...params, format: e.target.value as 'plain' | 'html' })}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Formatted</span>
          </label>
        </div>
        
        <div className="flex justify-end">
          <button
            type={isOffline ? "button" : "submit"}
            onClick={isOffline ? handleCheckout : undefined}
            disabled={isLoading}
            className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isOffline
                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {isLoading ? 'Processing...' : isOffline ? 'Checkout Numbers' : 'Generate Numbers'}
          </button>
        </div>
      </div>
    </form>
  );
}