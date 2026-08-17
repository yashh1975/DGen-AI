import React from 'react';

interface CorrelationHeatmapProps {
  correlationMatrix: Record<string, Record<string, number>>;
  title: string;
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ correlationMatrix, title }) => {
  const features = Object.keys(correlationMatrix || {});
  if (features.length === 0) return null;

  const getColorClass = (val: number) => {
    if (val >= 0.7) return 'bg-cyan-500/80 text-white font-bold';
    if (val >= 0.3) return 'bg-cyan-600/40 text-cyan-200';
    if (val >= 0.0) return 'bg-slate-900 text-slate-400';
    if (val >= -0.3) return 'bg-indigo-900/40 text-indigo-300';
    return 'bg-purple-600/80 text-white font-bold';
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
      <h4 className="font-bold text-sm text-white font-sans">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="p-2 border border-slate-800 bg-slate-950 text-slate-400"></th>
              {features.map((f) => (
                <th key={f} className="p-2 border border-slate-800 bg-slate-900/80 text-slate-300 font-semibold uppercase tracking-wider font-mono">
                  {f.slice(0, 8)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((rowFeat) => (
              <tr key={rowFeat}>
                <td className="p-2 border border-slate-800 bg-slate-900/80 text-slate-300 font-semibold uppercase tracking-wider font-mono text-left">
                  {rowFeat.slice(0, 8)}
                </td>
                {features.map((colFeat) => {
                  const val = correlationMatrix[rowFeat]?.[colFeat] ?? 0;
                  return (
                    <td
                      key={colFeat}
                      className={`p-2 border border-slate-800/80 font-mono transition ${getColorClass(val)}`}
                      title={`${rowFeat} vs ${colFeat}: ${val.toFixed(2)}`}
                    >
                      {val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
