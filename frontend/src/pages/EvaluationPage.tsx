import React, { useState, useEffect } from 'react';
import { BarChart2, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Layers, Award, Sparkles, Activity, FileText, Download } from 'lucide-react';
import { api } from '../services/api';
import { GenerationJob, DatasetMeta } from '../types';
import { DistributionChart } from '../components/DistributionChart';

export const EvaluationPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [evalMode, setEvalMode] = useState<'job' | 'dataset'>('job');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<any>(null);
  const [evalSuccessMsg, setEvalSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const [dsList, jobList] = await Promise.all([
          api.listDatasets(),
          api.listGenerationJobs()
        ]);
        setDatasets(dsList);
        const completedJobs = jobList.filter(j => j.status === 'completed');
        setJobs(completedJobs);

        if (completedJobs.length > 0) {
          setSelectedJobId(completedJobs[0].job_id);
          setEvalMode('job');
        } else if (dsList.length > 0) {
          setSelectedDatasetId(dsList[0].id);
          setEvalMode('dataset');
        }
      } catch (err) {
        console.error('Failed to initialize Evaluation Hub:', err);
      }
    };

    initData();
  }, []);

  const runEvaluation = async () => {
    setIsLoading(true);
    setEvalSuccessMsg(null);
    try {
      let sc;
      if (evalMode === 'job' && selectedJobId) {
        sc = await api.evaluateFullScorecard(selectedJobId, undefined);
      } else if (evalMode === 'dataset' && selectedDatasetId) {
        sc = await api.evaluateFullScorecard(undefined, selectedDatasetId);
      } else if (selectedJobId) {
        sc = await api.evaluateFullScorecard(selectedJobId, undefined);
      } else if (selectedDatasetId) {
        sc = await api.evaluateFullScorecard(undefined, selectedDatasetId);
      } else {
        sc = await api.evaluateFullScorecard(undefined, undefined);
      }
      setScorecard(sc);
      const targetLabel = (evalMode === 'job' && selectedJobId) 
        ? `Job ID: ${selectedJobId.slice(0, 8)}` 
        : (selectedDatasetId ? `Dataset` : 'Target');
      setEvalSuccessMsg(`Successfully evaluated quality scorecard for ${targetLabel}`);
      setTimeout(() => setEvalSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Evaluation warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, [selectedJobId, selectedDatasetId, evalMode]);

  const handleDownloadZipReport = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloadingZip) return;
    setIsDownloadingZip(true);
    try {
      const token = api.getToken();
      const url = api.getReportExportUrl(
        evalMode === 'job' ? selectedJobId : undefined, 
        evalMode === 'dataset' ? selectedDatasetId : undefined
      );
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ detail: 'Download failed' }));
        throw new Error(errJson.detail || 'Failed to generate report package');
      }

      const disposition = response.headers.get('Content-Disposition');
      let filename = 'dgen_ai_quality_report.zip';
      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/["']/g, '').trim();
      } else {
        const targetJob = jobs.find(j => j.job_id === selectedJobId);
        if (targetJob && targetJob.output_filename) {
          filename = `dgen_ai_report_${targetJob.output_filename.replace('.csv', '')}.zip`;
        }
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert('Report download error: ' + err.message);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Quality & Privacy Evaluation Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Multi-dimensional evaluation of statistical fidelity, logical constraints, diversity, and privacy risk assessment.</p>
        </div>

        {/* Evaluation Target Switcher */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setEvalMode('job')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${evalMode === 'job' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Evaluate Generated Job
          </button>
          <button
            onClick={() => setEvalMode('dataset')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${evalMode === 'dataset' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Evaluate Dataset
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {evalSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{evalSuccessMsg}</span>
        </div>
      )}

      {/* Target Selector Dropdown */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Target:</span>
          {evalMode === 'job' ? (
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white flex-1 min-w-0 truncate focus:outline-none focus:border-brand-500"
            >
              {jobs.map((j) => (
                <option key={j.job_id} value={j.job_id}>
                  {j.output_filename || `synthetic_${j.model_type.toUpperCase()}_${j.num_records_requested}_records.csv`} (from {j.dataset_filename || 'Banking Dataset'})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white flex-1 min-w-0 truncate focus:outline-none focus:border-brand-500"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  Dataset: {d.filename} ({d.row_count.toLocaleString()} rows)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleDownloadZipReport}
            disabled={isDownloadingZip}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0 cursor-pointer"
          >
            {isDownloadingZip ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isDownloadingZip ? 'Preparing ZIP...' : 'Download Report (ZIP)'}</span>
          </button>
          <button
            onClick={runEvaluation}
            disabled={isLoading}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-Evaluate</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-brand-400 animate-spin" />
          <p className="text-sm text-slate-300 font-medium">Computing Kolmogorov-Smirnov Tests, Wasserstein Distances & DCR Privacy Metrics...</p>
        </div>
      ) : scorecard ? (
        <div className="space-y-8">
          {/* Main Quality Scorecard Banner */}
          <div className="glass-panel p-8 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/20 via-slate-900/60 to-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 text-xs font-semibold">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Multi-Dimensional Scorecard</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">Overall Quality Evaluation Index</h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Weighted aggregate score combining Statistical Fidelity (40%), Banking Constraints (30%), Diversity (15%), and Privacy Risk Assessment (15%).
              </p>
            </div>

            <div className="text-center md:text-right shrink-0">
              <div className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-300 via-emerald-300 to-white font-mono">
                {scorecard.overall_quality_score}
                <span className="text-lg text-slate-500 font-sans font-normal"> / 100</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mt-1">High Quality Grade</span>
            </div>
          </div>

          {/* 4 Core Metric Sub-Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Statistical Fidelity */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Statistical Fidelity</span>
                <BarChart2 className="w-5 h-5 text-brand-400" />
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{scorecard.statistical_fidelity.statistical_fidelity_score}%</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>KS Similarity:</span>
                  <span className="font-mono text-slate-200">{scorecard.statistical_fidelity.average_ks_similarity}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Corr Matrix Delta:</span>
                  <span className="font-mono text-slate-200">{scorecard.statistical_fidelity.correlation_matrix_delta}</span>
                </div>
              </div>
            </div>

            {/* 2. Banking Constraints */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Logical Validity</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{scorecard.constraints.valid_pct}%</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Valid Records:</span>
                  <span className="font-mono text-slate-200">{scorecard.constraints.valid_records.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Violations Count:</span>
                  <span className="font-mono text-amber-400">{scorecard.constraints.invalid_records}</span>
                </div>
              </div>
            </div>

            {/* 3. Diversity */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Diversity Score</span>
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">{scorecard.diversity.diversity_score}%</div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Duplicate Rows:</span>
                  <span className="font-mono text-slate-200">{scorecard.diversity.duplicate_rows_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unique Pattern Ratio:</span>
                  <span className="font-mono text-slate-200">{(scorecard.diversity.unique_rows_ratio * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* 4. Privacy Risk Assessment */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Privacy Risk</span>
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                  scorecard.privacy.privacy_risk_level === 'LOW_RISK'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : scorecard.privacy.privacy_risk_level === 'MEDIUM_RISK'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {scorecard.privacy.privacy_risk_level}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1 pt-1">
                <div className="flex justify-between">
                  <span>Mean DCR Distance:</span>
                  <span className="font-mono text-slate-200">{scorecard.privacy.distance_to_closest_record.mean_dcr}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exact Match Overlap:</span>
                  <span className="font-mono text-slate-200">{scorecard.privacy.exact_duplicate_overlap_pct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real vs Synthetic Feature Distribution Charts */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart2 className="w-5 h-5 text-brand-400" />
              <span>Real vs Synthetic Feature Distribution Overlays (Recharts)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scorecard.statistical_fidelity?.distribution_overlays && Object.keys(scorecard.statistical_fidelity.distribution_overlays).length > 0 ? (
                Object.entries(scorecard.statistical_fidelity.distribution_overlays).map(([col, overlay]: [string, any]) => (
                  <DistributionChart
                    key={col}
                    featureName={col.replace(/_/g, ' ')}
                    binsData={overlay.bins}
                  />
                ))
              ) : (
                <div className="col-span-2 glass-panel p-8 text-center text-xs text-slate-500 italic">
                  No numerical feature distributions available for this dataset.
                </div>
              )}
            </div>
          </div>

          {/* Feature KS-Test Detail Table */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white">Numerical Feature Kolmogorov-Smirnov (KS) Test Metrics</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Feature</th>
                    <th className="py-3 px-4">KS Statistic (D)</th>
                    <th className="py-3 px-4">Wasserstein Distance</th>
                    <th className="py-3 px-4">Real Mean</th>
                    <th className="py-3 px-4">Synthetic Mean</th>
                    <th className="py-3 px-4">Mean Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {Object.entries(scorecard.statistical_fidelity.numerical_metrics).map(([col, stats]: [string, any]) => (
                    <tr key={col} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-bold text-white font-sans">{col}</td>
                      <td className="py-3 px-4 text-emerald-400">{stats.ks_statistic}</td>
                      <td className="py-3 px-4 text-indigo-300">{stats.wasserstein_distance}</td>
                      <td className="py-3 px-4">{stats.real_mean}</td>
                      <td className="py-3 px-4">{stats.synthetic_mean}</td>
                      <td className="py-3 px-4 text-brand-300">{stats.mean_delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-2xl text-center space-y-4 border border-slate-800">
          <BarChart2 className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Evaluation Scorecard Loaded</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Select a generated synthetic job or a banking dataset above and click <strong>Re-Evaluate</strong> to compute multi-dimensional fidelity, constraints, and privacy metrics.
          </p>
          <button
            onClick={runEvaluation}
            disabled={isLoading}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-2 transition cursor-pointer shadow-lg shadow-brand-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Compute Quality Scorecard</span>
          </button>
        </div>
      )}
    </div>
  );
};
