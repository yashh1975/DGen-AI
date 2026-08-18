import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart2, Table, Cpu, ShieldCheck, Sliders, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { DatasetMeta, DatasetProfile } from '../types';

interface DatasetDetailPageProps {
  datasetId: string;
  onBack: () => void;
}

export const DatasetDetailPage: React.FC<DatasetDetailPageProps> = ({ datasetId, onBack }) => {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [sample, setSample] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'correlations' | 'sample' | 'preprocess'>('profile');

  // Preprocessing Form State
  const [imputeStrategy, setImputeStrategy] = useState<'median' | 'mean'>('median');
  const [scalingStrategy, setScalingStrategy] = useState<'minmax' | 'standard' | 'none'>('minmax');
  const [isPreprocessing, setIsPreprocessing] = useState<boolean>(false);
  const [preprocessResult, setPreprocessResult] = useState<any>(null);

  useEffect(() => {
    const loadDatasetData = async () => {
      setIsLoading(true);
      try {
        const [metaData, profileData, sampleData] = await Promise.all([
          api.getDataset(datasetId),
          api.profileDataset(datasetId),
          api.getDatasetSample(datasetId, 50)
        ]);
        setMeta(metaData);
        setProfile(profileData);
        setSample(sampleData);
      } catch (err: any) {
        console.error('Failed to load dataset details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDatasetData();
  }, [datasetId]);

  const handleRunPreprocessing = async () => {
    setIsPreprocessing(true);
    try {
      const res = await api.preprocessDataset(datasetId, imputeStrategy, scalingStrategy);
      setPreprocessResult(res);
    } catch (err: any) {
      alert('Preprocessing failed: ' + err.message);
    } finally {
      setIsPreprocessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
        <RefreshCw className="w-8 h-8 mx-auto text-brand-400 animate-spin" />
        <p className="text-sm text-slate-300 font-medium">Generating Dynamic Dataset Profile & Correlation Heatmap...</p>
      </div>
    );
  }

  if (!meta || !profile) {
    return (
      <div className="glass-panel p-8 rounded-xl text-center text-slate-400 space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p>Dataset details could not be loaded.</p>
        <div className="flex items-center justify-center space-x-3">
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold cursor-pointer">
            Retry Loading
          </button>
          <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
            Back to Datasets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-white">{meta.filename}</h1>
            {meta.target_fraud_column && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                Target: {meta.target_fraud_column}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">ID: {meta.id} • Dynamic Profile Analysis</p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Total Rows</span>
          <span className="text-xl font-bold text-white mt-1 block">{profile.summary.total_rows.toLocaleString()}</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Total Columns</span>
          <span className="text-xl font-bold text-white mt-1 block">{profile.summary.total_columns}</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Missing Cells</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">{profile.summary.missing_cells_percentage}%</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Duplicate Rows</span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">{profile.summary.duplicate_rows_count}</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Memory Footprint</span>
          <span className="text-xl font-bold text-brand-300 mt-1 block">{profile.summary.memory_usage_mb} MB</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 transition flex items-center space-x-2 ${
            activeTab === 'profile'
              ? 'text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Feature Distributions</span>
        </button>
        <button
          onClick={() => setActiveTab('correlations')}
          className={`pb-3 transition flex items-center space-x-2 ${
            activeTab === 'correlations'
              ? 'text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Correlation Heatmap</span>
        </button>
        <button
          onClick={() => setActiveTab('sample')}
          className={`pb-3 transition flex items-center space-x-2 ${
            activeTab === 'sample'
              ? 'text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Raw Data Preview</span>
        </button>
        <button
          onClick={() => setActiveTab('preprocess')}
          className={`pb-3 transition flex items-center space-x-2 ${
            activeTab === 'preprocess'
              ? 'text-brand-400 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Preprocessing Studio</span>
        </button>
      </div>

      {/* Tab 1: Dynamic Profile & Stats */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          {/* Numerical Features Analysis Table */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-brand-400" />
              <span>Numerical Feature Statistics</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Feature</th>
                    <th className="py-3 px-4">Mean</th>
                    <th className="py-3 px-4">Std Dev</th>
                    <th className="py-3 px-4">Median</th>
                    <th className="py-3 px-4">Min</th>
                    <th className="py-3 px-4">Max</th>
                    <th className="py-3 px-4">Q25</th>
                    <th className="py-3 px-4">Q75</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {Object.entries(profile.numerical_analysis).map(([col, stats]) => (
                    <tr key={col} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-bold text-white font-sans">{col}</td>
                      <td className="py-3 px-4 text-brand-300">{stats.mean}</td>
                      <td className="py-3 px-4">{stats.std}</td>
                      <td className="py-3 px-4 text-emerald-400">{stats.median}</td>
                      <td className="py-3 px-4">{stats.min}</td>
                      <td className="py-3 px-4">{stats.max}</td>
                      <td className="py-3 px-4">{stats.q25}</td>
                      <td className="py-3 px-4">{stats.q75}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Categorical Features Cards */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Categorical Features Breakdown</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(profile.categorical_analysis).map(([col, stats]) => (
                <div key={col} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{col}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-mono">
                      {stats.unique_count} Unique Values
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Mode / Most Frequent: <span className="text-emerald-400 font-semibold">{stats.most_frequent}</span>
                  </div>
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Top Categories</span>
                    {Object.entries(stats.top_frequencies).slice(0, 4).map(([cat, count]) => (
                      <div key={cat} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 truncate max-w-[160px]">{cat}</span>
                        <span className="font-mono text-slate-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Numerical Correlation Heatmap */}
      {activeTab === 'correlations' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">Pearson Correlation Matrix Grid</h2>
          <p className="text-xs text-slate-400">Pairwise correlation between numerical banking features (-1.0 to +1.0).</p>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-left font-bold text-slate-300">Feature</th>
                  {Object.keys(profile.correlation_matrix).map((c) => (
                    <th key={c} className="py-2 px-3 font-semibold text-slate-400 rotate-0 truncate max-w-[80px]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(profile.correlation_matrix).map(([rCol, rowObj]) => (
                  <tr key={rCol} className="border-t border-slate-800/60">
                    <td className="py-2.5 px-3 text-left font-bold text-white font-sans">{rCol}</td>
                    {Object.entries(rowObj).map(([cCol, val]) => {
                      const isSelf = rCol === cCol;
                      let bgClass = 'bg-slate-900/40 text-slate-400';
                      if (isSelf) {
                        bgClass = 'bg-brand-600/30 text-brand-300 font-bold';
                      } else if (val > 0.4) {
                        bgClass = 'bg-emerald-500/20 text-emerald-300 font-semibold';
                      } else if (val < -0.4) {
                        bgClass = 'bg-indigo-500/20 text-indigo-300 font-semibold';
                      }
                      return (
                        <td key={cCol} className={`py-2.5 px-3 rounded ${bgClass}`}>
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
      )}

      {/* Tab 3: Raw Data Preview */}
      {activeTab === 'sample' && sample && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">Raw Dataset Preview (First 50 Rows)</h2>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 sticky top-0 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  {sample.columns.map((col: string) => (
                    <th key={col} className="py-3 px-4 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {sample.rows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    {sample.columns.map((col: string) => (
                      <td key={col} className="py-2.5 px-4 whitespace-nowrap">
                        {row[col] !== null ? String(row[col]) : <span className="text-slate-600 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Preprocessing Studio */}
      {activeTab === 'preprocess' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Reproducible Data Preprocessing Studio</h2>
            <p className="text-xs text-slate-400 mt-1">Configure data transformation settings for generative model input. Original raw dataset remains untouched.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Missing Value Imputation</label>
              <select
                value={imputeStrategy}
                onChange={(e: any) => setImputeStrategy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="median">Median Imputation (Numerical) / Mode (Categorical)</option>
                <option value="mean">Mean Imputation (Numerical) / Mode (Categorical)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Numerical Feature Scaling</label>
              <select
                value={scalingStrategy}
                onChange={(e: any) => setScalingStrategy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="minmax">MinMax Normalization (0.0 to 1.0)</option>
                <option value="standard">Standard Z-Score Normalization (Mean=0, Std=1)</option>
                <option value="none">No Scaling (Keep Raw Numerical Values)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleRunPreprocessing}
              disabled={isPreprocessing}
              className="glow-btn px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium text-xs transition shadow-lg shadow-brand-600/30 flex items-center space-x-2"
            >
              {isPreprocessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Preprocessing Pipeline</span>
                </>
              )}
            </button>
          </div>

          {preprocessResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300 space-y-2 font-mono">
              <div className="text-emerald-400 font-bold font-sans flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Preprocessing Configuration Pipeline Saved</span>
              </div>
              <p>Processed Shape: {preprocessResult.processed_shape[0]} rows × {preprocessResult.processed_shape[1]} features</p>
              <p>Imputed Columns: {Object.keys(preprocessResult.imputed_values).length}</p>
              <p>Categorical Encoders Created: {Object.keys(preprocessResult.encoders).length}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
