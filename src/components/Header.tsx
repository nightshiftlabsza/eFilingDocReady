import React from 'react';
import { Shield, LayoutDashboard, Settings } from 'lucide-react';

interface HeaderProps {
    onOpenSettings: () => void;
    onStartOver: () => void;
    onOpenPricing: () => void;
    currentMode?: 'landing' | 'taxpayer-info' | 'practitioner-info' | 'workspace';
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onStartOver, onOpenPricing, currentMode = 'landing' }) => {
    return (
        <nav className="navbar glass-panel">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onStartOver}>
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                    <Shield className="text-primary w-6 h-6" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-bold tracking-tight text-white leading-none">DocReady</span>
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[10px] uppercase tracking-widest text-[#10b981] font-semibold whitespace-nowrap">Audit-Ready</span>
                        <span className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-500 font-bold uppercase tracking-tight whitespace-nowrap">
                            <Shield className="w-2 h-2" />
                            Local Only
                        </span>
                    </div>
                </div>
            </div>

            <div className="nav-links">
                {currentMode === 'workspace' && (
                    <button className="flex items-center gap-2 text-sm font-medium opacity-80 hover:opacity-100 transition-opacity">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </button>
                )}

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenPricing();
                    }}
                    className="hidden sm:flex items-center gap-2 text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                >
                    Features
                </button>

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenPricing();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                    View Pricing
                </button>

                <button
                    onClick={onOpenSettings}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors active-scale"
                    aria-label="Settings"
                >
                    <Settings className="w-6 h-6 text-slate-600 dark:text-[#94a3b8]" />
                </button>
            </div>
        </nav>
    );
};
