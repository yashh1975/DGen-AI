import React, { useState, useEffect } from 'react';
import { 
  Database, ShieldCheck, Cpu, Activity, Sparkles, CheckCircle2, AlertCircle, 
  ArrowRight, LayoutDashboard, FileText, Settings, Play, Layers, BarChart2, 
  TrendingUp, Menu, X, LogOut, User as UserIcon, RefreshCw
} from 'lucide-react';
import { api } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ThemeSelector } from './components/ThemeSelector';
import { LoginPage } from './pages/LoginPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { DatasetDetailPage } from './pages/DatasetDetailPage';
import { GeneratePage } from './pages/GeneratePage';
import { EvaluationPage } from './pages/EvaluationPage';
import { ExperimentsPage } from './pages/ExperimentsPage';

type ViewMode = 'dashboard' | 'datasets' | 'dataset_detail' | 'generate' | 'evaluation' | 'experiments';

function MainApp() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await api.getHealth();
        setHealthStatus(health);
      } catch (err) {
        console.error('Backend health check failed:', err);
        setHealthStatus({ status: 'offline' });
      } finally {
        setIsHealthLoading(false);
      }
    };

    checkBackend();
  }, []);

  const navigateToDatasetDetail = (id: string) => {
    setSelectedDatasetId(id);
    setCurrentView('dataset_detail');
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'datasets', label: 'Datasets & Profiling', icon: FileText },
    { id: 'generate', label: 'AI Generation Studio', icon: Cpu },
    { id: 'evaluation', label: 'Quality & Privacy Hub', icon: BarChart2 },
    { id: 'experiments', label: 'Fraud ML Experiments', icon: TrendingUp },
  ];

  const handleNavClick = (view: ViewMode) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  // Auth Loading State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b11] text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <span className="text-xs font-semibold text-slate-400">Loading DGen AI Workspace...</span>
        </div>
      </div>
    );
  }

  // Standalone Full-Screen Login & Registration Page
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11] text-slate-100 selection:bg-brand-500/30">
      {/* Responsive Glassmorphism Header */}
      <header className="glass-panel sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => handleNavClick('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-brand-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center space-x-0.5">
                <Database className="w-3.5 h-3.5 text-brand-400" />
                <Sparkles className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-brand-300">
                  DGen AI
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || (item.id === 'datasets' && currentView === 'dataset_detail');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id as ViewMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-md shadow-brand-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Header Right Status & Profile Controls */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* System Status Pill */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-300">
                {isHealthLoading ? 'Connecting...' : healthStatus?.status === 'healthy' ? 'Backend Online' : 'Offline'}
              </span>
            </div>

            {/* Interactive Theme Palette Selector */}
            <ThemeSelector />

            {/* User Profile Badge & Logout Button */}
            <div className="flex items-center space-x-2">
              <div 
                className="flex items-center space-x-2 px-2.5 py-1 sm:px-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 shadow-sm max-w-[120px] xs:max-w-[160px] sm:max-w-none"
                title={`Signed in as ${user.full_name} (${user.email})`}
              >
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                  <UserIcon className="w-3 h-3" />
                </div>
                <div className="flex flex-col text-left truncate min-w-0">
                  <span className="font-bold leading-tight text-white text-[11px] sm:text-xs truncate">{user.full_name}</span>
                  <span className="text-[9px] text-slate-400 font-mono leading-none truncate hidden sm:inline max-w-[110px]">{user.organization || user.email}</span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-rose-400 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-rose-500/30 transition bg-slate-900/60 cursor-pointer"
                title="Sign out of account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">Sign Out</span>
              </button>
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-300" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden px-4 pt-3 pb-4 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl space-y-3 animate-fade-in text-left">
            {/* Mobile User Profile Info */}
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300 shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-white truncate">{user.full_name}</div>
                <div className="text-[10px] text-brand-400 font-mono truncate">{user.email}</div>
                {user.organization && (
                  <div className="text-[10px] text-slate-400 truncate">{user.organization}</div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id || (item.id === 'datasets' && currentView === 'dataset_detail');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id as ViewMode)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-3 transition cursor-pointer ${
                      isActive
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'text-slate-300 hover:bg-slate-900/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Footer Status & User */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
                <span className={`w-2 h-2 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-500'}`} />
                <span>Backend: {healthStatus?.status === 'healthy' ? 'Online' : 'Offline'}</span>
              </div>
              <button
                onClick={logout}
                className="text-xs text-rose-400 flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentView === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl glass-panel p-6 sm:p-8 border border-brand-500/20 shadow-2xl">
              <div className="absolute -right-16 -top-16 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-3xl text-left">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 text-xs font-semibold mb-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>DGen AI — The AI Synthetic Banking Dataset Generation Tool</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
                  AI-Powered Synthetic Banking Data Generation
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                  Generate privacy-compliant, statistically accurate banking transactions with user-controlled fraud ratio targeting, banking rule validation, and downstream ML evaluation.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setCurrentView('generate')}
                    className="glow-btn px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium text-xs transition shadow-lg shadow-brand-600/30 flex items-center space-x-2 cursor-pointer"
                  >
                    <span>Launch AI Generation Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Platform Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="glass-panel glass-panel-hover p-5 rounded-xl border border-slate-800 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dataset Engine</span>
                  <FileText className="w-5 h-5 text-brand-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">CSV & Profiler</div>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dynamic Profiler Ready</span>
                </div>
              </div>

              <div className="glass-panel glass-panel-hover p-5 rounded-xl border border-slate-800 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Generative AI Engine</span>
                  <Cpu className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">CTGAN & VAE</div>
                <div className="flex items-center space-x-1.5 text-xs text-brand-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PyTorch & SDV Active</span>
                </div>
              </div>

              <div className="glass-panel glass-panel-hover p-5 rounded-xl border border-slate-800 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fraud ML Utility</span>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">Downstream ML</div>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>F1 & ROC-AUC Benchmark</span>
                </div>
              </div>

              <div className="glass-panel glass-panel-hover p-5 rounded-xl border border-slate-800 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Authentication</span>
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">JWT Security</div>
                <div className="flex items-center space-x-1.5 text-xs text-purple-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Isolated User Data</span>
                </div>
              </div>
            </div>

            {/* Architecture Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div 
                onClick={() => setCurrentView('datasets')}
                className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 cursor-pointer space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition">
                  1. Banking Datasets Hub
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload, inspect schema profiles, and manage source financial transaction datasets for synthetic AI generation.
                </p>
                <div className="pt-2 flex items-center text-xs font-semibold text-brand-400 space-x-1">
                  <span>Explore Datasets</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('evaluation')}
                className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 cursor-pointer space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                  2. Quality & Privacy Scorecard
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Validate synthetic transactions against banking logical rules, statistical distributions (KS-Test, Wasserstein), and Distance-to-Closest-Record (DCR).
                </p>
                <div className="pt-2 flex items-center text-xs font-semibold text-emerald-400 space-x-1">
                  <span>View Scorecards</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div 
                onClick={() => setCurrentView('experiments')}
                className="glass-panel glass-panel-hover p-6 rounded-2xl border border-slate-800 cursor-pointer space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                  3. Downstream Fraud ML Utility
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Train machine learning classifiers on Real vs Synthetic vs Augmented data to prove synthetic data enhances downstream fraud detection metrics.
                </p>
                <div className="pt-2 flex items-center text-xs font-semibold text-indigo-400 space-x-1">
                  <span>Run Benchmark</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'datasets' && (
          <DatasetsPage onSelectDataset={navigateToDatasetDetail} />
        )}

        {currentView === 'dataset_detail' && selectedDatasetId && (
          <DatasetDetailPage 
            datasetId={selectedDatasetId} 
            onBack={() => setCurrentView('datasets')}
          />
        )}

        {currentView === 'generate' && (
          <GeneratePage />
        )}

        {currentView === 'evaluation' && (
          <EvaluationPage />
        )}

        {currentView === 'experiments' && (
          <ExperimentsPage />
        )}
      </main>

      {/* Responsive Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 px-4">
        <p>DGen AI — The AI Synthetic Banking Dataset Generation Tool &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
