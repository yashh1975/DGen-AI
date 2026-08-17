import React, { useState, useEffect } from 'react';
import { 
  Cpu, Sparkles, Download, CheckCircle2, AlertCircle, RefreshCw, 
  Sliders, ShieldCheck, Play, Layers, Trash2, Clock, HelpCircle, Info
} from 'lucide-react';
import { api } from '../services/api';
import { DatasetMeta, GenerationJob } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const GeneratePage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [modelType, setModelType] = useState<'ctgan' | 'vae' | 'conditional'>('ctgan');
  const [numRecords, setNumRecords] = useState<number>(1000);
  const [enableConditional, setEnableConditional] = useState<boolean>(true);
  const [fraudTargetRatio, setFraudTargetRatio] = useState<number>(0.10); // 10% default
  const [randomSeed, setRandomSeed] = useState<number>(42);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [jobsHistory, setJobsHistory] = useState<GenerationJob[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteTargetJob, setDeleteTargetJob] = useState<GenerationJob | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const selectJobForTracking = (job: GenerationJob) => {
    setActiveJob(job);
    localStorage.setItem('dgen_active_job_id', job.job_id);
    if (job.status === 'completed' && job.created_at && job.completed_at) {
      const dur = Math.max(1, Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000));
      setElapsedSeconds(dur);
    } else if (job.created_at) {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000));
      setElapsedSeconds(elapsed);
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const [datasetList, jobsList] = await Promise.all([
          api.listDatasets(),
          api.listGenerationJobs()
        ]);
        setDatasets(datasetList);
        if (datasetList.length > 0) {
          setSelectedDatasetId(datasetList[0].id);
        }
        setJobsHistory(jobsList);

        // Restore active job so tracker never disappears on page refresh or navigation
        const runningJob = jobsList.find((j) => ['queued', 'training', 'generating'].includes(j.status));
        const savedActiveJobId = localStorage.getItem('dgen_active_job_id');
        const savedJob = savedActiveJobId ? jobsList.find((j) => j.job_id === savedActiveJobId) : null;
        const targetJob = runningJob || savedJob || (jobsList.length > 0 ? jobsList[0] : null);

        if (targetJob) {
          selectJobForTracking(targetJob);
        }
      } catch (err: any) {
        console.error('Failed to initialize Generation Studio:', err);
      }
    };
    initData();
  }, []);

  // Timer for active job elapsed duration computed from job creation time
  useEffect(() => {
    let timer: any = null;
    if (activeJob && ['queued', 'training', 'generating'].includes(activeJob.status)) {
      timer = setInterval(() => {
        if (activeJob.created_at) {
          const elapsed = Math.max(0, Math.floor((Date.now() - new Date(activeJob.created_at).getTime()) / 1000));
          setElapsedSeconds(elapsed);
        } else {
          setElapsedSeconds((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeJob?.status, activeJob?.job_id]);

  // Poll active job status
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updatedJob = await api.getGenerationJobStatus(activeJob.job_id);
        setActiveJob(updatedJob);
        if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
          const updatedHistory = await api.listGenerationJobs();
          setJobsHistory(updatedHistory);
        }
      } catch (err) {
        console.error('Failed polling job status:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeJob]);

  const handleStartGeneration = async () => {
    if (!selectedDatasetId) {
      setErrorMsg('Please select a dataset to generate synthetic data from.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    setElapsedSeconds(0);

    try {
      const job = await api.createGenerationJob({
        dataset_id: selectedDatasetId,
        model_type: modelType,
        num_records: numRecords,
        fraud_target_ratio: enableConditional ? fraudTargetRatio : undefined,
        random_seed: randomSeed
      });
      selectJobForTracking(job);
      setJobsHistory((prev) => [job, ...prev]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit generation job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (jobId: string, e: React.MouseEvent, customFilename?: string) => {
    e.stopPropagation();
    try {
      const targetJob = jobsHistory.find((j) => j.job_id === jobId) || (activeJob?.job_id === jobId ? activeJob : null);
      const downloadName = customFilename || targetJob?.output_filename || `synthetic_${(targetJob?.model_type || 'ctgan').toUpperCase()}_${targetJob?.num_records_requested || 1000}_records.csv`;

      const token = api.getToken();
      const response = await fetch(api.getDownloadUrl(jobId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Download error: ' + err.message);
    }
  };

  const openDeleteModal = (job: GenerationJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetJob(job);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetJob) return;
    const jobId = deleteTargetJob.job_id;
    try {
      await api.deleteGenerationJob(jobId);
      const remaining = jobsHistory.filter((j) => j.job_id !== jobId);
      setJobsHistory(remaining);
      if (activeJob?.job_id === jobId) {
        localStorage.removeItem('dgen_active_job_id');
        if (remaining.length > 0) {
          selectJobForTracking(remaining[0]);
        } else {
          setActiveJob(null);
        }
      }
    } catch (err: any) {
      alert('Failed to delete job: ' + err.message);
    } finally {
      setDeleteTargetJob(null);
    }
  };

  // Helper for generation progress stage text
  const getProgressStageText = (seconds: number) => {
    if (seconds < 4) return '1/4 Initializing Deep Generative Architecture & Latent Space...';
    if (seconds < 8) return '2/4 Fitting Multi-Modal Continuous & Discrete Tabular Distributions...';
    if (seconds < 13) return '3/4 Sampling Synthetic Transactions & Enforcing Banking Constraints...';
    return '4/4 Validating Statistical Quality & Finalizing Synthetic Dataset...';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Synthetic Data Generation Studio</h1>
        <p className="text-slate-400 text-sm mt-1">Configure Generative AI model architectures, specify target fraud ratios, and launch synthetic transaction data generation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Dataset Selection */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              1. Source Banking Dataset
            </label>
            {datasets.length === 0 ? (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                No uploaded datasets found. Please upload a CSV dataset in the Dataset Hub first.
              </p>
            ) : (
              <>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-brand-500"
                >
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.filename} ({ds.row_count.toLocaleString()} rows • {ds.column_count} columns)
                    </option>
                  ))}
                </select>

                {(() => {
                  const currentDs = datasets.find((d) => d.id === selectedDatasetId);
                  const cols = currentDs?.columns || (currentDs ? [...currentDs.numerical_columns, ...currentDs.categorical_columns, ...currentDs.datetime_columns] : []);
                  if (!currentDs || cols.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Exact Columns to Generate ({cols.length}):</span>
                        </span>
                        <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          100% Exact Schema Match
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {cols.map((c) => (
                          <span key={c} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-brand-300">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* 2. Generative Model Architecture Selector */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              2. Select Generative AI Architecture
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => setModelType('ctgan')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  modelType === 'ctgan'
                    ? 'bg-brand-600/10 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 mb-2">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">CTGAN Synthesizer</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">Primary Tabular GAN learning multi-modal continuous & discrete features.</p>
                </div>
                <span className="text-[10px] font-semibold text-brand-400 mt-3 block uppercase tracking-wider">Tabular GAN</span>
              </div>

              <div
                onClick={() => setModelType('vae')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  modelType === 'vae'
                    ? 'bg-brand-600/10 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">PyTorch Tabular VAE</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">Variational Autoencoder mapping tabular features to Gaussian latent space.</p>
                </div>
                <span className="text-[10px] font-semibold text-indigo-400 mt-3 block uppercase tracking-wider">PyTorch VAE</span>
              </div>

              <div
                onClick={() => setModelType('conditional')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  modelType === 'conditional'
                    ? 'bg-brand-600/10 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Conditional Model</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">User-controlled target ratio sampling for specific fraud rates.</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 mt-3 block uppercase tracking-wider">Controlled Gen</span>
              </div>
            </div>
          </div>

          {/* 3. Parameter Controls */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              3. Generation Parameters
            </label>

            {/* Number of Records */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Number of Synthetic Records to Generate</span>
                <span className="font-mono text-brand-300 font-bold text-sm">{numRecords.toLocaleString()} Records</span>
              </div>
              <input
                type="range"
                min="100"
                max="25000"
                step="100"
                value={numRecords}
                onChange={(e) => setNumRecords(Number(e.target.value))}
                className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Fraud Target Ratio Toggle */}
            <div className="pt-2 space-y-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Target Fraud Ratio Control</span>
                <button
                  onClick={() => setEnableConditional(!enableConditional)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition ${
                    enableConditional ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {enableConditional ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {enableConditional && (
                <div className="space-y-2 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Target Fraud Rate</span>
                    <span className="font-mono text-emerald-400 font-bold">{(fraudTargetRatio * 100).toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.30"
                    step="0.01"
                    value={fraudTargetRatio}
                    onChange={(e) => setFraudTargetRatio(Number(e.target.value))}
                    className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Random Seed */}
            <div className="pt-2 space-y-2 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Random Seed</span>
                <span className="font-mono text-slate-400 font-bold">{randomSeed}</span>
              </div>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Submit Action */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleStartGeneration}
              disabled={Boolean(isSubmitting || !selectedDatasetId || (activeJob && ['queued', 'training', 'generating'].includes(activeJob.status)))}
              className="w-full glow-btn py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm transition shadow-xl shadow-brand-600/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting || (activeJob && ['queued', 'training', 'generating'].includes(activeJob.status)) ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-brand-300" />
                  <span>Synthesizing ({formatDuration(elapsedSeconds)} elapsed)...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Generate Synthetic Data</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Job Tracker & Generation History */}
        <div className="space-y-6">
          {/* Active Job Tracker Card with Live Progress */}
          {activeJob && (
            <div className="glass-panel p-6 rounded-2xl border border-brand-500/30 bg-brand-950/15 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-brand-400" />
                  <span>Active Job Tracker</span>
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                  activeJob.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : activeJob.status === 'failed'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-brand-500/20 text-brand-300 border border-brand-500/30 animate-pulse'
                }`}>
                  {activeJob.status}
                </span>
              </div>

              {/* Live Stopwatch & Stage Indicator when running */}
              {['queued', 'training', 'generating'].includes(activeJob.status) && (
                <div className="space-y-2.5 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 flex items-center space-x-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                      <span>Time Elapsed: <strong className="font-mono text-emerald-400 font-bold text-sm">{formatDuration(elapsedSeconds)}</strong></span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase font-bold animate-pulse">
                      In Progress
                    </span>
                  </div>

                  {/* Animated Continuous Progress Pulse Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-400 h-1.5 rounded-full w-full animate-pulse" />
                  </div>

                  <div className="text-[11px] text-slate-300 font-medium leading-snug">
                    {getProgressStageText(elapsedSeconds)}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Architecture:</span>
                  <span className="font-semibold uppercase text-brand-300">{activeJob.model_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Requested Records:</span>
                  <span className="font-mono font-bold">{activeJob.num_records_requested.toLocaleString()}</span>
                </div>
                {activeJob.achieved_fraud_ratio != null && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Achieved Fraud Ratio:</span>
                    <span className="font-mono font-bold">{(activeJob.achieved_fraud_ratio * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {activeJob.status === 'completed' && (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Dataset Synthesized Successfully</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Total Time Taken: <strong className="font-mono text-white font-bold">{formatDuration(elapsedSeconds > 0 ? elapsedSeconds : (activeJob.completed_at && activeJob.created_at ? Math.max(1, Math.round((new Date(activeJob.completed_at).getTime() - new Date(activeJob.created_at).getTime()) / 1000)) : 1))}</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDownload(activeJob.job_id, e, activeJob.output_filename)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Synthetic CSV</span>
                  </button>
                </div>
              )}

              {activeJob.status === 'failed' && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                  {activeJob.error_message || 'Generation failed.'}
                </p>
              )}
            </div>
          )}

          {/* Job History List */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Generation History ({jobsHistory.length})</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {jobsHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No generation jobs yet.</p>
              ) : (
                jobsHistory.map((job) => {
                  const isSelected = activeJob?.job_id === job.job_id;
                  const durationSec = job.created_at && job.completed_at
                    ? Math.max(1, Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000))
                    : null;

                  return (
                    <div
                      key={job.job_id}
                      onClick={() => selectJobForTracking(job)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs gap-3 ${
                        isSelected
                          ? 'bg-brand-950/40 border-brand-500/60 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/30'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-emerald-400 font-mono truncate text-[12px] flex items-center space-x-1.5">
                          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 font-sans font-semibold">
                            {job.model_type}
                          </span>
                          <span className="truncate">{job.output_filename || `synthetic_${job.model_type.toUpperCase()}_${job.num_records_requested}_records.csv`}</span>
                          {isSelected && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-500/80 text-white tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-slate-300 text-[11px] mt-1 truncate font-medium">
                          From source: <span className="text-slate-200 font-semibold">{job.dataset_filename || "Banking Dataset"}</span> • {job.num_records_requested.toLocaleString()} rows
                        </div>
                        <div className="text-slate-500 text-[10px] mt-0.5 font-mono flex items-center space-x-2 flex-wrap">
                          <span>{new Date(job.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {job.status === 'completed' && durationSec !== null && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                                <Clock className="w-3 h-3 inline" />
                                <span>Took {formatDuration(durationSec)}</span>
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>ID: {job.job_id.slice(0, 8)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        {job.status === 'completed' ? (
                          <button
                            onClick={(e) => handleDownload(job.job_id, e, job.output_filename)}
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                            title="Download CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-brand-400 uppercase font-bold animate-pulse">{job.status}</span>
                        )}
                        <button
                          onClick={(e) => openDeleteModal(job, e)}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                          title="Delete Job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Branded Custom Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetJob}
        title="Delete Synthetic Generation Job"
        message={`Are you sure you want to delete "${deleteTargetJob?.output_filename || 'this synthetic generation job'}"? This action cannot be undone.`}
        confirmText="Delete Job"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetJob(null)}
      />
    </div>
  );
};
