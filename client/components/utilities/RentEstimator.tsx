'use client';

import { useQuery } from '@tanstack/react-query';

interface RoomStats {
  median: number;
  min: number;
  max: number;
  count: number;
}

interface RentEstimate {
  localityId: number;
  localityName: string;
  overall: { median: number; min: number; max: number; sampleSize: number } | null;
  byRoomType: {
    single: RoomStats | null;
    double: RoomStats | null;
    shared: RoomStats | null;
  };
  confidence: 'high' | 'medium' | 'low';
}

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

interface RentEstimatorProps {
  localityId: number;
  apiBase?: string;
}

export default function RentEstimator({ localityId, apiBase = '/api' }: RentEstimatorProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['rent-estimate', apiBase, localityId],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/utilities/rent-estimate/${localityId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json() as Promise<RentEstimate>;
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-16 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (isError || !data || !data.overall) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-400">Rent data unavailable for this area.</p>
      </div>
    );
  }

  const { overall, byRoomType, confidence, localityName } = data;

  const roomTypes: { key: keyof typeof byRoomType; label: string }[] = [
    { key: 'single', label: 'Single' },
    { key: 'double', label: 'Double' },
    { key: 'shared', label: 'Shared' },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">Rent Estimate — {localityName}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CONFIDENCE_COLORS[confidence]}`}>
          {confidence} confidence
        </span>
      </div>

      <div className="mt-3 rounded-lg bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-600">Median Rent</p>
        <p className="text-2xl font-bold text-blue-700">{formatINR(overall.median)}<span className="text-sm font-normal text-blue-500">/mo</span></p>
        <p className="mt-0.5 text-xs text-gray-500">
          Range: {formatINR(overall.min)} – {formatINR(overall.max)} · {overall.sampleSize} listings
        </p>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th className="pb-1 text-left font-medium">Type</th>
            <th className="pb-1 text-right font-medium">Median</th>
            <th className="pb-1 text-right font-medium">Min–Max</th>
          </tr>
        </thead>
        <tbody>
          {roomTypes.map(({ key, label }) => {
            const stats = byRoomType[key];
            if (!stats) return null;
            return (
              <tr key={key} className="border-t border-gray-100">
                <td className="py-1.5 text-gray-700">{label}</td>
                <td className="py-1.5 text-right font-medium text-gray-800">{formatINR(stats.median)}</td>
                <td className="py-1.5 text-right text-gray-500">
                  {formatINR(stats.min)}–{formatINR(stats.max)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
