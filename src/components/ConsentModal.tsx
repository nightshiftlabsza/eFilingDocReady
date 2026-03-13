import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConsentModalProps {
    isOpen: boolean;
    onAccept: () => void;
    onOpenPrivacy: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onAccept, onOpenPrivacy }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="consent-modal-title"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl glass-panel border border-white/10 shadow-2xl overflow-hidden p-8"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                <ShieldCheck className="text-primary w-7 h-7" />
                            </div>
                            <div>
                                <h2 id="consent-modal-title" className="text-2xl font-bold text-white tracking-tight">Privacy & Data Consent</h2>
                                <p className="text-sm text-emerald-500 font-semibold uppercase tracking-wider">Secure Local Environment</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-8">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-white mb-1">100% On-Device Processing</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Your tax documents, IDs, and personal data never leave this device. We use browser-based processing to ensure absolute privacy and SARS-level security.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4">
                                <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-white mb-1">Purpose of Collection</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Data is temporarily processed in your browser's memory solely to merge, compress, and optimize files for SARS eFiling compatibility. No data is stored on external servers.
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 leading-relaxed italic border-t border-white/5 pt-4">
                                By clicking "I Accept", you acknowledge that you are providing this information voluntarily for the purpose of document optimization. You understand that clearing your browser data will permanently delete any local records.
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={onAccept}
                                className="flex-grow btn-primary py-4 text-lg font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)] active-scale hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
                            >
                                I Accept & Continue
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={onOpenPrivacy}
                                className="text-xs text-slate-500 hover:text-white transition-colors underline underline-offset-4"
                            >
                                Read Full Privacy Details
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
