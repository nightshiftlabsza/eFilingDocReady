import { X, Moon, Sun, ExternalLink, ShieldCheck, Trash2, AlertTriangle, Scale, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
                    />

                    {/* Drawer Content */}
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
                                Project Settings
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent dark:hover:border-white/10 rounded-full transition-colors active-scale"
                            >
                                <X className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Theme Toggling Section */}
                            <section>
                                <label className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3 block">Theme Preferences</label>
                                <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-2xl border border-white/5">
                                    <button
                                        onClick={() => theme !== 'dark' && onToggleTheme()}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all",
                                            theme === 'dark' ? "bg-white/10 text-white border border-white/10 shadow-sm" : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        <Moon className="w-4 h-4" /> Dark
                                    </button>
                                    <button
                                        onClick={() => theme !== 'light' && onToggleTheme()}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all",
                                            theme === 'light' ? "bg-white/10 text-white border border-white/10 shadow-sm" : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        <Sun className="w-4 h-4" /> Light
                                    </button>
                                </div>
                            </section>

                            <section>
                                <label className="text-xs uppercase tracking-widest text-[#2563eb] dark:text-slate-400 font-bold mb-3 block">Compliance & Privacy</label>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex gap-3">
                                        <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-color)' }}>Zero-Data Architecture</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                All tax and personal data remains strictly on your device. We do not transmit, store, or process your information on external servers.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
                                        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-500">POPIA Data Retention</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                Clearing your browser data will permanently delete your records. Data is stored solely to facilitate your current session.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col gap-3">
                                        <div className="flex gap-3">
                                            <Trash2 className="w-6 h-6 text-red-500 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-red-500">Accountability</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                                                    Request deletion of all personal information as per POPIA mandates.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("Are you sure you want to wipe all local data? This cannot be undone.")) {
                                                            localStorage.clear();
                                                            sessionStorage.clear();
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active-scale"
                                                >
                                                    Wipe My Data
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
                                        <Scale className="w-6 h-6 text-blue-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-blue-500">SARS-Style Disclaimer</p>
                                            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                The calculations and information provided by this tool are intended as guidance only and do not constitute a binding legal or tax ruling. This tool does not take the place of official SARS legislation.
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
                                    POPIA Privacy Notice <ExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={onOpenPrivacy}
                                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-colors text-left"
                                >
                                    Information Officer Contact <ExternalLink className="w-3 h-3" />
                                </button>
                                <div className="text-[10px] text-slate-500 dark:text-slate-600 flex flex-col mt-2">
                                    <span>DocReady v3.1 (POPIA Verified)</span>
                                    <span className="text-primary font-bold">Client-Side Architecture</span>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

