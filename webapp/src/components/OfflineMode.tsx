'use client';

import { useState, useEffect } from 'react';
import { exportDatabase, importDatabase, getAvailableRandoms, checkoutRandoms } from '@/lib/duckdb';
import { getSerial } from '@/lib/hash';

interface RandomEntry {
  id: number;
  timestamp: string;
  format: string;
  count: number;
  min_val: number;
  max_val: number;
  base: number;
  checked_out: boolean;
  data?: Uint8Array;
  hash?: string;
  showNumbers?: boolean;
}

interface OfflineModeProps {
  isOffline: boolean;
  onToggleOffline: () => void;
  refreshTrigger: number;
}

export default function OfflineMode({ isOffline, onToggleOffline, refreshTrigger }: OfflineModeProps) {
  const [randoms, setRandoms] = useState<RandomEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showNumbers, setShowNumbers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOffline) {
      loadAvailableRandoms();
    }
  }, [isOffline, refreshTrigger]);

  const loadAvailableRandoms = async () => {
    try {
      const available = await getAvailableRandoms();
      const withHashes = await Promise.all(
        (available as RandomEntry[])
          .filter(item => !item.checked_out) // Hide destroyed/checked out numbers
          .map(async (item) => ({
            ...item,
            hash: await getSerial(`${item.id}_${item.timestamp}`, 6)
          }))
      );
      setRandoms(withHashes);
    } catch (error) {
      console.error('Error loading randoms:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const buffer = await exportDatabase();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotbits-randoms-${Date.now()}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
    setIsExporting(false);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
        await importDatabase(buffer);
        await loadAvailableRandoms();
        alert('Database imported successfully!');
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed. Please check the file format.');
      }
      setIsImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDestroy = async (id: number) => {
    try {
      await checkoutRandoms(id); // This marks as checked out/destroyed
      await loadAvailableRandoms();
      alert('Numbers destroyed for security!');
    } catch (error) {
      console.error('Destroy failed:', error);
      alert('Destroy failed. Please try again.');
    }
  };

  const toggleShowNumbers = (id: number) => {
    setShowNumbers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (!isOffline) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Offline Mode</h2>
          <button
            onClick={onToggleOffline}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold border-2 border-red-700"
          >
            Go Offline
          </button>
        </div>
        <p className="text-gray-600">
          Enable offline mode to access previously generated random numbers when disconnected.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <h2 className="text-lg font-semibold">Offline Mode Active</h2>
        </div>
        <button
          onClick={onToggleOffline}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go Online
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export Database'}
        </button>
        
        <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-block text-center">
          {isImporting ? 'Importing...' : 'Import Database'}
          <input
            type="file"
            accept=".db"
            onChange={handleImport}
            disabled={isImporting}
            className="hidden"
          />
        </label>
      </div>

      <h3 className="text-md font-medium mb-3">Available Random Sets ({randoms.length})</h3>
      
      {randoms.length === 0 ? (
        <p className="text-gray-500">No random sets available. Generate some numbers while online first.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {randoms.map((random) => (
              <div key={random.id} className="p-3 bg-white rounded border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium">
                      {random.count} numbers ({random.min_val} to {random.max_val})
                    </div>
                    <div className="text-xs text-gray-500">
                      Base {random.base} • {new Date(random.timestamp).toLocaleString()}
                      {random.hash && <span className="ml-2 text-blue-600">• Hash: {random.hash}</span>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleShowNumbers(random.id)}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      {showNumbers[random.id] ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDestroy(random.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Destroy
                    </button>
                  </div>
                </div>
                {showNumbers[random.id] && random.data && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-32">
                    {new TextDecoder().decode(random.data)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}