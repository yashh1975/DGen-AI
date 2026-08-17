import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, ArrowRight, Sparkles, CheckCircle2, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
import { api } from '../services/api';
import { DatasetMeta } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface DatasetsPageProps {
  onSelectDataset: (datasetId: string) => void;
}

export const DatasetsPage: React.FC<DatasetsPageProps> = ({ onSelectDataset }) => {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deleteTargetDataset, setDeleteTargetDataset] = useState<DatasetMeta | null>(null);

  const fetchDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await api.listDatasets();
      setDatasets(data);
    } catch (err: any) {
      console.error('Failed to load datasets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const newDataset = await api.uploadDataset(file);
      setUploadSuccess(`Successfully uploaded dataset: ${newDataset.filename} (${newDataset.row_count} rows)`);
      await fetchDatasets();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload dataset CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        handleFileUpload(file);
      } else {
        setUploadError('Please select a valid .csv file.');
      }
    }
  };

  const openDeleteModal = (dataset: DatasetMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetDataset(dataset);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetDataset) return;
    try {
      await api.deleteDataset(deleteTargetDataset.id);
      await fetchDatasets();
    } catch (err: any) {
      alert('Failed to delete dataset: ' + err.message);
    } finally {
      setDeleteTargetDataset(null);
    }
  };

  const handleLoadBenchmark = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const seeded = await api.seedBenchmarkDataset();
      setUploadSuccess(`Loaded official benchmark dataset: ${seeded.filename} (${seeded.row_count} rows)`);
      await fetchDatasets();
    } catch (err: any) {
      setUploadError('Failed to load benchmark dataset: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dataset Hub & Management</h1>
          <p className="text-slate-400 text-sm mt-1">Upload private CSV financial datasets or load the official banking benchmark for profiling.</p>
        </div>
        <button
          onClick={handleLoadBenchmark}
          disabled={isUploading}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-brand-500/40 text-brand-300 rounded-xl text-xs font-bold transition flex items-center space-x-2 shrink-0 self-start sm:self-auto shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Load Banking Benchmark</span>
        </button>
      </div>

      {/* Upload Dropzone Card */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="glass-panel p-8 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-brand-500/50 transition-all text-center relative overflow-hidden"
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shadow-lg shadow-brand-500/10">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Drag & drop banking CSV file</h3>
            <p className="text-xs text-slate-400 mt-1">Supports UTF-8 CSV datasets up to 50MB</p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <label className="glow-btn px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium text-xs cursor-pointer transition shadow-lg shadow-brand-600/30 flex items-center space-x-2">
              <span>Choose CSV File</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center space-x-3">
            <RefreshCw className="w-6 h-6 text-brand-400 animate-spin" />
            <span className="text-sm font-semibold text-white">Registering Dataset in Workspace...</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Datasets List Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">My Datasets ({datasets.length})</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchDatasets}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="glass-panel p-8 rounded-xl text-center text-slate-400 text-sm">
            Loading datasets...
          </div>
        ) : datasets.length === 0 ? (
          <div className="glass-panel p-12 rounded-xl text-center text-slate-400 space-y-4 border border-slate-800">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <div>
              <p className="text-sm font-medium text-white">No datasets in your workspace yet.</p>
              <p className="text-xs text-slate-500 mt-1">Upload your own banking CSV or load the official benchmark dataset.</p>
            </div>
            <button
              onClick={handleLoadBenchmark}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition"
            >
              Load Benchmark Dataset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((ds) => (
              <div
                key={ds.id}
                onClick={() => onSelectDataset(ds.id)}
                className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <button
                      onClick={(e) => openDeleteModal(ds, e)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 mt-1 mb-0.5">
                    {ds.user_id === 'system_demo_user' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        System Benchmark
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        My Uploaded Dataset
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-base truncate group-hover:text-brand-300 transition">
                    {ds.filename}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Uploaded {new Date(ds.upload_timestamp).toLocaleDateString()}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500 block">Rows</span>
                      <span className="font-bold text-slate-200">{ds.row_count.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Columns</span>
                      <span className="font-bold text-slate-200">{ds.column_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fraud Target</span>
                      <span className="font-semibold text-emerald-400">{ds.target_fraud_column || 'None Detected'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">File Size</span>
                      <span className="font-semibold text-slate-300">{(ds.file_size_bytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-brand-400 group-hover:text-brand-300">
                  <span className="flex items-center space-x-1">
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>View Dynamic Profile</span>
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Branded Custom Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetDataset}
        title="Delete Banking Dataset"
        message={`Are you sure you want to delete dataset "${deleteTargetDataset?.filename}"? This action cannot be undone.`}
        confirmText="Delete Dataset"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetDataset(null)}
      />
    </div>
  );
};
