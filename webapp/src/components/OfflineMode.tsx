'use client';

import { useState, useEffect } from 'react';
import { getAvailableRandoms, deleteRandoms, getRandoms } from '@/lib/duckdb';
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


  const handleDestroy = async (id: number) => {
    if (!confirm('Are you sure you want to destroy these numbers? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteRandoms(id); // Actually delete the records from database
      // Remove from local state immediately
      setRandoms(prev => prev.filter(r => r.id !== id));
      // Clear show state for this ID
      setShowNumbers(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      // No popup after successful deletion
    } catch (error) {
      console.error('Destroy failed:', error);
      alert('Destroy failed. Please try again.');
      // Reload on error to ensure consistency
      await loadAvailableRandoms();
    }
  };

  const toggleShowNumbers = async (id: number) => {
    if (!showNumbers[id]) {
      // If not currently showing numbers, fetch them first
      try {
        const randomData = await getRandoms(id);
        if (randomData) {
          // Update the randoms array with the fetched data
          setRandoms(prev => prev.map(r =>
            r.id === id ? { ...r, data: randomData.data } : r
          ));
        }
      } catch (error) {
        console.error('Error fetching random data:', error);
        alert('Failed to load numbers. Please try again.');
        return;
      }
    }

    setShowNumbers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (!isOffline) {
    return (
      <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Offline Mode</h2>
          <button
            onClick={onToggleOffline}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold border-2 border-red-700"
          >
            Go Offline
          </button>
        </div>
        <p className="text-quantum-600">
          Enable offline mode to access previously generated random numbers when disconnected.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-cosmic-900/90 backdrop-blur rounded-lg border border-quantum-400/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          <h2 className="text-lg font-semibold text-quantum-200">Offline Mode Active</h2>
        </div>
        <button
          onClick={onToggleOffline}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold border-2 border-blue-700"
        >
          Go Online
        </button>
      </div>


      <h3 className="text-md font-medium mb-3 text-quantum-200">Available Random Sets ({randoms.length})</h3>
      
      {randoms.length === 0 ? (
        <p className="text-quantum-400">No random sets available. Generate some numbers while online first.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {randoms.map((random) => (
              <div key={random.id} className="p-3 bg-quantum-800/30 rounded border border-quantum-500/40">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-quantum-200">
                      {random.count} numbers ({random.min_val} to {random.max_val})
                    </div>
                    <div className="text-xs text-quantum-400">
                      Base {random.base} • {new Date(random.timestamp).toLocaleString()}
                      {random.hash && <span className="ml-2 text-quantum-300">• Hash: {random.hash}</span>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleShowNumbers(random.id)}
                      className="px-2 py-1 text-xs bg-quantum-700 text-quantum-200 rounded hover:bg-quantum-600 border border-quantum-500"
                    >
                      {showNumbers[random.id] ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDestroy(random.id)}
                      className="px-3 py-1 text-sm bg-red-700 text-quantum-200 rounded hover:bg-red-600 border border-red-500"
                    >
                      Destroy
                    </button>
                  </div>
                </div>
                {showNumbers[random.id] && random.data && (
                  <div className="mt-2 p-2 bg-cosmic-800/60 rounded text-xs font-mono overflow-auto max-h-32 text-quantum-300 border border-quantum-600/30">
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