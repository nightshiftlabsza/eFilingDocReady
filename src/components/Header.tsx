import React from 'react';
import { Settings } from 'lucide-react';

interface HeaderProps {
    onOpenSettings: () => void;
    onStartOver: () => void;
    onOpenPricing: () => void;
    onOpenAuth: () => void;
    onLogout: () => void;
    currentMode?: 'landing' | 'taxpayer-info' | 'practitioner-info' | 'workspace';
    isAuthenticated: boolean;
    accountEmail?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
    onOpenSettings,
    onStartOver,
    onOpenPricing,
    onOpenAuth,
    onLogout,
    currentMode = 'landing',
    isAuthenticated,
    accountEmail,
}) => {
    return (
        <nav className="navbar glass-panel">
            <button className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0" onClick={onStartOver}>
                <div className="w-10 h-10 flex items-center justify-center">
                    <img src="/logo.svg" alt="DocReady Logo" className="w-full h-full rounded-xl object-contain" />
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-xl font-bold tracking-tight text-white leading-none">DocReady</span>
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold whitespace-nowrap">
                        South Africa launch scope
                    </span>
                </div>
            </button>

            <div className="nav-links">
                {currentMode === 'workspace' && (
                    <span className="hidden sm:inline text-sm font-medium text-[var(--text-color)]/60">
                        In-browser document prep
                    </span>
                )}

                <button
                    onClick={onOpenPricing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                    View Pricing
                </button>

                {isAuthenticated ? (
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-sm font-semibold text-[var(--text-color)] hover:bg-white/15 transition-colors"
                        title={accountEmail ?? 'Signed in'}
                    >
                        Log Out
                    </button>
                ) : (
                    <button
                        onClick={onOpenAuth}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-sm font-semibold text-[var(--text-color)] hover:bg-white/15 transition-colors"
                    >
                        Restore Access
                    </button>
                )}

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
