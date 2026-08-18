import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Lock, User, Building, Eye, EyeOff, X, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail('');
      setPassword('');
      setFullName('');
      setOrganization('');
      setErrorMsg(null);
      setShowPassword(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email: email.trim(), password });
        login(res.access_token, res.user);
        onClose();
      } else if (mode === 'reset') {
        const res = await api.resetPassword({ email: email.trim(), new_password: password });
        login(res.access_token, res.user);
        onClose();
      } else {
        try {
          const res = await api.register({
            email: email.trim(),
            password,
            full_name: fullName.trim() || 'Research User',
            organization: organization.trim() || 'Academic Lab',
          });
          login(res.access_token, res.user);
          onClose();
        } catch (regErr: any) {
          if (regErr.message && (regErr.message.includes('already exists') || regErr.message.includes('exists'))) {
            const loginRes = await api.login({ email: email.trim(), password });
            login(loginRes.access_token, loginRes.user);
            onClose();
          } else {
            throw regErr;
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const demoEmail = `researcher_${Math.floor(Math.random() * 10000)}@dgen.ai`;
      const res = await api.register({
        email: demoEmail,
        password: 'Password123!',
        full_name: 'Academic Researcher',
        organization: 'Fintech AI Lab'
      });
      login(res.access_token, res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not launch instant demo session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-900/95 border border-slate-800/90 rounded-3xl p-7 shadow-2xl shadow-slate-950/90 space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create DGen AI Account' : 'Reset Password'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'login' 
                  ? 'Sign in to access your private synthetic data workspace' 
                  : mode === 'register' 
                  ? 'Register to manage datasets & model evaluations' 
                  : 'Set a new password for your account to regain access'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`py-2 rounded-xl transition ${
              mode === 'login' 
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`py-2 rounded-xl transition ${
              mode === 'register' 
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setMode('reset'); setErrorMsg(null); }}
            className={`py-2 rounded-xl transition ${
              mode === 'reset' 
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reset
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Yashwanth Kumar"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                  />
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                  University / Organization
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Computer Science Department"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
              {mode === 'reset' ? 'New Password' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 border border-brand-500/40 transition flex items-center justify-center space-x-2 mt-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>
                  {mode === 'login' 
                    ? 'Sign In to Workspace' 
                    : mode === 'register' 
                    ? 'Create Account' 
                    : 'Update Password & Sign In'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Instant Demo Session Button */}
        <div className="pt-3 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>⚡ 1-Click Instant Demo Login</span>
          </button>
          <p className="text-[10px] text-slate-500 mt-1.5">Instantly launches a full preloaded sandbox session without typing</p>
        </div>
      </div>
    </div>
  );
};
