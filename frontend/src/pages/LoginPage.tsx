import React, { useState } from 'react';
import { 
  Database, ShieldCheck, Cpu, TrendingUp, Sparkles, Mail, Lock, 
  User, Building, Eye, EyeOff, ArrowRight, RefreshCw, AlertCircle, Layers, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        login(res.access_token, res.user);
      } else {
        const res = await api.register({
          email,
          password,
          full_name: fullName,
          organization: organization || 'Academic Researcher',
        });
        login(res.access_token, res.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-[#080b11] text-slate-100 selection:bg-brand-500/30 relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Centered Glassmorphic Auth Container */}
      <div className="w-full max-w-4xl bg-slate-900/80 border border-slate-800/90 rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950 overflow-hidden backdrop-blur-2xl grid grid-cols-1 md:grid-cols-12 relative z-10 my-auto">
        
        {/* Left Side: Brand Visual & Feature Highlights */}
        <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-b from-brand-950/30 via-slate-900/50 to-slate-950/80 border-b md:border-b-0 md:border-r border-slate-800/80 text-left">
          <div>
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-brand-500/25">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center space-x-0.5">
                  <Database className="w-4 h-4 text-brand-400" />
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-brand-300">
                DGen AI
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug mb-3">
              Next-Gen Synthetic Banking Data
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Privacy-preserving generative modeling with user-controlled fraud ratio targeting and downstream ML benchmarking.
            </p>

            {/* Compact Highlights List */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 mt-0.5">
                  <Cpu className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">CTGAN & Tabular VAE</h4>
                  <p className="text-[11px] text-slate-400">Deep neural tabular architectures</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Rules & Privacy Defense</h4>
                  <p className="text-[11px] text-slate-400">Constraint repair & DCR protection</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Layers className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Controlled Fraud Ratio</h4>
                  <p className="text-[11px] text-slate-400">Target fraud percentages 5%–30%</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                  <TrendingUp className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Downstream ML Utility</h4>
                  <p className="text-[11px] text-slate-400">F1 & ROC-AUC empirical testing</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800/60 hidden md:block">
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Isolated Multi-User Workspace</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Auth Form */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center text-left">
          {/* Card Top Heading */}
          <div className="space-y-1 mb-5">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {mode === 'login' ? 'Sign in to your Workspace' : 'Create an Account'}
            </h3>
            <p className="text-xs text-slate-400">
              {mode === 'login' 
                ? 'Enter your credentials to access datasets and experiments' 
                : 'Register to start synthesizing financial data'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold mb-4">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                mode === 'login' 
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(null); }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                mode === 'register' 
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message Banner */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Yashwanth Kumar"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>
                </div>

                {/* Organization */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    Organization / University
                  </label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. Computer Science Department"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-9 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/25 border border-brand-500/40 transition flex items-center justify-center space-x-2 mt-4 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switch Footer */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-400">
              {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrorMsg(null);
              }}
              className="text-[11px] font-bold text-brand-400 hover:text-brand-300 transition cursor-pointer ml-1"
            >
              {mode === 'login' ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
