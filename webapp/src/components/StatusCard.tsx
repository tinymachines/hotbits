'use client';

interface StatusCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}

export default function StatusCard({ title, value, trend, subtitle, color = 'blue' }: StatusCardProps) {
  const colorClasses = {
    green: 'bg-cosmic-800/60 backdrop-blur border-quantum-400/40 text-quantum-300',
    red: 'bg-cosmic-800/60 backdrop-blur border-fusion-600/40 text-fusion-400',
    yellow: 'bg-cosmic-800/60 backdrop-blur border-fusion-400/40 text-fusion-300',
    blue: 'bg-cosmic-800/60 backdrop-blur border-stellar-400/40 text-stellar-300',
    gray: 'bg-cosmic-800/60 backdrop-blur border-quantum-600/30 text-quantum-400'
  };

  const trendIcons = {
    up: '↗',
    down: '↘', 
    stable: '→'
  };

  const trendColors = {
    up: 'text-quantum-400',
    down: 'text-fusion-500',
    stable: 'text-plasma-400'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
        {trend && (
          <span className={`text-lg ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && (
          <p className="text-sm opacity-75 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}