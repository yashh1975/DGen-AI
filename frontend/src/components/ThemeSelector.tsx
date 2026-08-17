import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles, Zap, ShieldCheck, Flame, ChevronDown } from 'lucide-react';
import { useTheme, THEMES, ThemeId } from '../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme, themeConfig } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (id: ThemeId) => {
    switch (id) {
      case 'cyber':
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      case 'nebula':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'emerald':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'solar':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs font-medium"
        title="Change Visual Color Theme"
      >
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr p-0.5 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeConfig.primaryColor}, ${themeConfig.secondaryColor})` }}>
          <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
            <Palette className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <span className="hidden sm:inline font-semibold">{themeConfig.name}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-2xl p-2 z-50 animate-fade-in space-y-1">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Palette className="w-3 h-3 text-brand-400" />
              <span>Select Color Palette</span>
            </span>
          </div>

          {THEMES.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between transition text-left cursor-pointer group ${
                  isSelected
                    ? 'bg-slate-900 border border-slate-700 shadow-md'
                    : 'hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${t.previewBg} p-0.5 shrink-0 flex items-center justify-center shadow-sm`}>
                    <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                      {getThemeIcon(t.id)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>{t.name}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{t.subtitle}</div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
