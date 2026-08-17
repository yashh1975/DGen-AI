import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

export interface BinItem {
  binLabel: string;
  Real: number;
  Synthetic: number;
}

interface DistributionChartProps {
  featureName: string;
  binsData?: BinItem[];
  realData?: number[];
  syntheticData?: number[];
}

export const DistributionChart: React.FC<DistributionChartProps> = ({
  featureName,
  binsData,
  realData = [],
  syntheticData = []
}) => {
  // If pre-computed exact bins are provided from backend, use them directly
  let bins: BinItem[] = [];

  if (binsData && binsData.length > 0) {
    bins = binsData;
  } else if (realData.length > 0 && syntheticData.length > 0) {
    // Generate 8 bin buckets from raw numbers
    const minVal = Math.min(...realData, ...syntheticData);
    const maxVal = Math.max(...realData, ...syntheticData);
    const binWidth = (maxVal - minVal) / 8 || 1;

    bins = Array.from({ length: 8 }, (_, i) => {
      const binStart = minVal + i * binWidth;
      const binEnd = binStart + binWidth;
      
      const realCount = realData.filter(v => v >= binStart && (i === 7 ? v <= binEnd : v < binEnd)).length;
      const synthCount = syntheticData.filter(v => v >= binStart && (i === 7 ? v <= binEnd : v < binEnd)).length;

      const realFreq = realData.length > 0 ? (realCount / realData.length) * 100 : 0;
      const synthFreq = syntheticData.length > 0 ? (synthCount / syntheticData.length) * 100 : 0;

      return {
        binLabel: `${Math.round(binStart)}-${Math.round(binEnd)}`,
        Real: Math.round(realFreq * 10) / 10,
        Synthetic: Math.round(synthFreq * 10) / 10
      };
    });
  }

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-white font-sans capitalize">{featureName} Distribution Overlay</h4>
        <span className="text-[10px] font-mono text-slate-400">Relative Frequency (%)</span>
      </div>

      <div className="h-56 w-full">
        {bins.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
            No numerical distribution data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="binLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Real" fill="#06b6d4" radius={[4, 4, 0, 0]} opacity={0.85} />
              <Bar dataKey="Synthetic" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
