'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendPoint {
  month: string;
  avgPrice: number;
  count: number;
}

interface PriceTrendData {
  localityId: number;
  dataType: 'synthetic' | 'historical';
  trend: TrendPoint[];
  direction: 'rising' | 'falling' | 'stable';
}

const DIRECTION_CONFIG = {
  rising: { label: 'Prices Rising', color: 'text-red-600', bg: 'bg-red-50' },
  falling: { label: 'Prices Falling', color: 'text-green-600', bg: 'bg-green-50' },
  stable: { label: 'Prices Stable', color: 'text-blue-600', bg: 'bg-blue-50' },
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

interface PriceTrendsProps {
  localityId: number;
  apiBase?: string;
}

export default function PriceTrends({ localityId, apiBase = '/api' }: PriceTrendsProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['price-trends', apiBase, localityId],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/utilities/price-trends/${localityId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json() as Promise<PriceTrendData>;
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-40 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (isError || !data || data.trend.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-400">Price trend data unavailable for this area.</p>
      </div>
    );
  }

  const dir = DIRECTION_CONFIG[data.direction];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">Price Trends</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dir.color} ${dir.bg}`}>
          {dir.label}
        </span>
      </div>

      <div className="mt-4 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => {
                const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                return [formatINR(numericValue), 'Avg Price'];
              }}
              labelFormatter={(label) => `Month: ${String(label)}`}
            />
            <Line
              type="monotone"
              dataKey="avgPrice"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {data.dataType === 'historical' ? 'Based on weekly price snapshots' : 'Based on listing data (synthetic model)'}
      </p>
    </div>
  );
}
