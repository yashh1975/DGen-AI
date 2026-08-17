import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Delete Synthetic Job',
  message = 'Are you sure you want to delete this synthetic generation job? This action cannot be undone.',
  confirmText = 'Delete Job',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-md bg-slate-900/95 border border-slate-800/90 rounded-2xl p-6 shadow-2xl shadow-slate-950/90 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-inner ${
              isDanger 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-rose-500/10' 
                : 'bg-brand-500/10 text-brand-400 border-brand-500/25 shadow-brand-500/10'
            }`}>
              {isDanger ? <AlertTriangle className="w-5 h-5 text-rose-400" /> : <Trash2 className="w-5 h-5 text-brand-400" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Action Required</span>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {message}
          </p>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition flex items-center space-x-1.5 shadow-lg ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25 border border-rose-500/40' 
                : 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/25 border border-brand-500/40'
            }`}
          >
            {isDanger && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
