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
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800', 
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800'
  };

  const trendIcons = {
    up: '↗',
    down: '↘', 
    stable: '→'
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
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