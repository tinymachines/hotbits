'use client';

import { useState, useEffect, useRef } from 'react';
import D3Chart from '@/components/D3Chart';
import StatusCard from '@/components/StatusCard';
import RandomForm, { GenerateParams } from '@/components/RandomForm';
import OfflineMode from '@/components/OfflineMode';
import { websocketManager, TRNGStatus, MetricsUpdate } from '@/lib/websocket';
import { createRandomsTable, storeRandoms } from '@/lib/duckdb';
import { getSerial } from '@/lib/hash';

interface DataPoint {
  timestamp: Date;
  value: number;
}

export default function Home() {
  const [status, setStatus] = useState<TRNGStatus | null>(null);
  const [metrics, setMetrics] = useState<DataPoint[]>([]);
  const [entropyData, setEntropyData] = useState<DataPoint[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNumbers, setGeneratedNumbers] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);
  const [refreshRandoms, setRefreshRandoms] = useState(0);
  const statsInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize DuckDB (gracefully handle mobile/proxy issues)
    createRandomsTable().catch(error => {
      console.warn('DuckDB initialization failed, using fallback storage:', error);
    });

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!isOffline && isOnline) {
      // Fetch real TRNG stats
      const fetchTRNGStats = async () => {
        try {
          const response = await fetch('/api/trng-stats');
          if (response.ok) {
            const data = await response.json();
            setStatus({
              isRunning: data.isRunning,
              bytesGenerated: data.bytesGenerated,
              bytesAvailable: data.bytesAvailable,
              lastUpdate: data.lastUpdate,
              quality: data.quality,
              currentRate: data.rawRate, // Use raw rate for "current rate"
              triggerEvents: [`Raw rate: ${data.rawRate} events/sec`, `Random rate: ${data.randomRate} bits/hour`]
            });
          }
        } catch (error) {
          console.error('Failed to fetch TRNG stats:', error);
        }
      };

      // Initial fetch
      fetchTRNGStats();
      
      // Update every 5 seconds
      statsInterval.current = setInterval(fetchTRNGStats, 5000);

      // WebSocket connection for real-time events (optional)
      websocketManager.connect();
      
      websocketManager.on('status', (data: unknown) => {
        // Can still receive WebSocket updates for real-time events
        const wsData = data as TRNGStatus;
        // Only update trigger events from WebSocket, keep file-based stats
        setStatus(prev => ({
          ...prev,
          triggerEvents: wsData.triggerEvents
        }));
      });

      websocketManager.on('metrics', (data: unknown) => {
        const metricsData = data as MetricsUpdate;
        const newPoint = {
          timestamp: new Date(metricsData.timestamp),
          value: metricsData.rate * 60 // Convert events/sec to events/min
        };
        setMetrics(prev => [...prev.slice(-29), newPoint]);

        const entropyPoint = {
          timestamp: new Date(metricsData.timestamp), 
          value: metricsData.entropy
        };
        setEntropyData(prev => [...prev.slice(-29), entropyPoint]);
      });

      websocketManager.requestStatus();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (statsInterval.current) clearInterval(statsInterval.current);
      websocketManager.disconnect();
    };
  }, [isOffline, isOnline]);

  const handleGenerate = async (params: GenerateParams) => {
    setIsGenerating(true);
    setGeneratedNumbers('');
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      setGeneratedNumbers(data.numbers);
      
      // Store in DuckDB
      const numbersBuffer = new TextEncoder().encode(data.numbers);
      await storeRandoms(numbersBuffer, {
        format: params.format,
        count: params.count,
        minVal: params.min,
        maxVal: params.max,
        base: params.base
      });

      // Trigger refresh of available randoms
      setRefreshRandoms(prev => prev + 1);
      
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate numbers. Please try again.');
    }
    
    setIsGenerating(false);
  };

  const handleCheckout = async (params: GenerateParams) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      
      // Store as checked out in DuckDB
      const numbersBuffer = new TextEncoder().encode(data.numbers);
      const id = await storeRandoms(numbersBuffer, {
        format: params.format,
        count: params.count,
        minVal: params.min,
        maxVal: params.max,
        base: params.base
      });

      // Trigger refresh of available randoms
      setRefreshRandoms(prev => prev + 1);
      
      // Generate hash for this checkout
      const hash = await getSerial(`${id}_${Date.now()}`, 6);
      alert(`Numbers checked out successfully! Hash: ${hash}`);
      
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to checkout numbers. Please try again.');
    }
    
    setIsGenerating(false);
  };

  const toggleOfflineMode = () => {
    setIsOffline(!isOffline);
    if (!isOffline) {
      websocketManager.disconnect();
    }
  };

  return (
    <div className="min-h-screen bg-cosmic-dust p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 p-6 bg-cosmic-800/80 backdrop-blur rounded-xl border border-quantum-600/20">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-fusion-400 shadow-fusion">
              Hotbits TRNG Dashboard
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-quantum-400 shadow-quantum' : 'bg-fusion-600'}`}></div>
              <span className="text-sm font-medium text-quantum-300">
                {isOffline ? 'Offline Mode' : isOnline ? 'Online' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-quantum-400">
              Cryptographically secure random numbers from physical entropy sources
            </p>
            <a
              href="/apps"
              className="px-4 py-2 bg-plasma-flame text-white rounded-lg hover:shadow-atomic font-medium text-sm transition-all duration-300"
            >
              🎲 Random Apps
            </a>
          </div>
        </header>

        {!isOffline && status && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatusCard
              title="Status"
              value={status.isRunning ? 'Running' : 'Stopped'}
              color={status.isRunning ? 'green' : 'red'}
            />
            <StatusCard
              title="Bytes Available"
              value={status.bytesAvailable?.toLocaleString() || '0'}
              subtitle="Ready for use"
              color="blue"
            />
            <StatusCard
              title="Raw Rate"
              value={`${status.currentRate || 0}/s`}
              subtitle="Decay events per second"
              color="gray"
            />
            <StatusCard
              title="Quality Score"
              value={`${Math.round(((status.quality?.passed || 0) / (status.quality?.total || 1)) * 100)}%`}
              subtitle={`${status.quality?.passed || 0}/${status.quality?.total || 0} tests passed`}
              color={(status.quality?.passed || 0) / (status.quality?.total || 1) > 0.95 ? 'green' : 'yellow'}
            />
          </div>
        )}

        {!isOffline && metrics.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <D3Chart
              data={metrics}
              title="Decay Rate"
              yLabel="Events/min"
              color="#06b6d4"
            />
            <D3Chart
              data={entropyData}
              title="Entropy Level"
              yLabel="Entropy"
              color="#22d3ee"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RandomForm 
            onGenerate={handleGenerate} 
            onCheckout={handleCheckout}
            isLoading={isGenerating} 
            isOffline={isOffline}
          />
          <OfflineMode isOffline={isOffline} onToggleOffline={toggleOfflineMode} refreshTrigger={refreshRandoms} />
        </div>

        {generatedNumbers && (
          <div className="bg-cosmic-800/60 backdrop-blur rounded-lg border border-quantum-600/30 p-6">
            <h3 className="text-lg font-semibold mb-4 text-fusion-400">Generated Numbers</h3>
            <div className="bg-gray-50 rounded-md p-4 overflow-auto max-h-64">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {generatedNumbers}
              </pre>
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(generatedNumbers)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([generatedNumbers], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `hotbits-${Date.now()}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Download
              </button>
            </div>
          </div>
        )}

        {!isOffline && status?.triggerEvents && status.triggerEvents.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 text-fusion-400">Recent Events</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {status.triggerEvents.slice(-10).reverse().map((event, index) => (
                <div key={index} className="text-sm font-mono text-quantum-300 p-2 bg-cosmic-700/50 rounded border border-quantum-600/20">
                  {event}
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-quantum-400 text-sm">
          <p>© 2025 Hotbits TRNG • Physical entropy for cryptographic security</p>
        </footer>
      </div>
    </div>
  );
}