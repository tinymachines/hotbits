'use client';

import { useState } from 'react';

interface RandomFormProps {
  onGenerate: (params: GenerateParams) => void;
  isLoading?: boolean;
}

export interface GenerateParams {
  count: number;
  min: number;
  max: number;
  base: number;
  format: 'html' | 'plain';
  columns: number;
}

export default function RandomForm({ onGenerate, isLoading = false }: RandomFormProps) {
  const [params, setParams] = useState<GenerateParams>({
    count: 100,
    min: 1,
    max: 100,
    base: 10,
    format: 'plain',
    columns: 5
  });

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

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Generate Random Numbers</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Count (max 10,000)
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={params.count}
            onChange={(e) => setParams(prev => ({ ...prev, count: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Columns
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={params.columns}
            onChange={(e) => setParams(prev => ({ ...prev, columns: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum
          </label>
          <input
            type="number"
            value={params.min}
            onChange={(e) => setParams(prev => ({ ...prev, min: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum
          </label>
          <input
            type="number"
            value={params.max}
            onChange={(e) => setParams(prev => ({ ...prev, max: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                onChange={(e) => setParams(prev => ({ ...prev, base: parseInt(e.target.value) }))}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{label}</span>
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
              onChange={(e) => setParams(prev => ({ ...prev, format: e.target.value as 'plain' | 'html' }))}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Plain text</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="html"
              checked={params.format === 'html'}
              onChange={(e) => setParams(prev => ({ ...prev, format: e.target.value as 'plain' | 'html' }))}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Formatted</span>
          </label>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating...' : 'Generate Numbers'}
        </button>
      </div>
    </form>
  );
}