import { X, Moon, Sun, ExternalLink, ShieldCheck, Trash2, AlertTriangle, Scale, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LEGAL_LINKS, SUPPORT_EMAIL } from '../lib/site';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenPrivacy: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose, onOpenPrivacy, theme, onToggleTheme }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-screen w-full max-w-sm glass-panel border-l border-white/10 z-[1001] shadow-2xl p-6"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
                                <Settings className="w-5 h-5 text-primary" />
                                Settings
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent dark:hover:border-white/10 rounded-full transition-colors active-scale"
                            >
                                <X className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <section>
                                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3 block">Theme</label>
                                <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-2xl border border-white/5">
                                    <button
                                        onClick={() => theme !== 'dark' && onToggleTheme()}
                                        className={cn(
                                            'flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all',
                                            theme === 'dark' ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-white',
                                        )}
                                    >
                                        <Moon className="w-4 h-4" /> Dark
                                    </button>
                                    <button
                                        onClick={() => theme !== 'light' && onToggleTheme()}
                                        className={cn(
                                            'flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all',
                                            theme === 'light' ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-white',
                                        )}
                                    >
                                        <Sun className="w-4 h-4" /> Light
                                    </button>
                                </div>
                            </section>

                            <section>
                                <label className="text-xs uppercase tracking-widest text-[#2563eb] dark:text-slate-400 font-bold mb-3 block">Privacy &amp; Limits</label>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex gap-3">
                                        <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-color)' }}>Documents stay local</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                The app processes customer files in the browser. Remote systems are used for sign-in, payment verification, and restore access only.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
                                        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-500">Truthful launch scope</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                DocReady helps prepare files for strict upload limits, but it is not affiliated with SARS and does not guarantee acceptance by any receiving platform.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col gap-3">
                                        <div className="flex gap-3">
                                            <Trash2 className="w-6 h-6 text-red-500 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-red-500">Clear local browser data</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                                                    This clears local preferences and session data on this device. Account and transaction records remain on the server for restore access.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to wipe local browser data on this device?')) {
                                                            localStorage.clear();
                                                            sessionStorage.clear();
                                                            window.location.assign('/');
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active-scale"
                                                >
                                                    Wipe local data
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
                                        <Scale className="w-6 h-6 text-blue-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-blue-500">Support email placeholder</p>
                                            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                Current configured support address: {SUPPORT_EMAIL}. Replace it before launch if the final address changes.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="pt-8 mt-4 border-t border-black/10 dark:border-white/10 flex flex-col gap-4">
                                <button
                                    onClick={onOpenPrivacy}
                                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-colors text-left"
                                >
                                    Privacy notice <ExternalLink className="w-3 h-3" />
                                </button>
                                {LEGAL_LINKS.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-colors text-left"
                                    >
                                        {link.label} <ExternalLink className="w-3 h-3" />
                                    </a>
                                ))}
                                <a
                                    href={`mailto:${SUPPORT_EMAIL}`}
                                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-colors text-left"
                                >
                                    Contact support <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
