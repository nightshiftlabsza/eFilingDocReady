import React from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
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
                                <h2 id="consent-modal-title" className="text-2xl font-bold text-white tracking-tight">POPIA &amp; Privacy Consent</h2>
                                <p className="text-sm text-emerald-500 font-semibold uppercase tracking-wider">Browser-based document processing</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-8">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-white mb-1">Documents stay local</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Your PDFs and supported images are processed inside your browser. DocReady does not upload your document files to a server for processing.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-4">
                                <AlertCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-white mb-1">What may be stored remotely</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Email-based sign-in, payment verification, entitlement assignment, and restore access may use secure third-party services. Customer documents and document metadata are not stored remotely.
                                    </p>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 leading-relaxed italic border-t border-white/5 pt-4">
                                By continuing, you acknowledge this narrow launch scope and understand that DocReady is not affiliated with SARS and does not guarantee upload acceptance.
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={onAccept}
                                className="flex-grow btn-primary py-4 text-lg font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)] active-scale hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
                            >
                                I Accept &amp; Continue
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                onClick={onOpenPrivacy}
                                className="text-xs text-slate-500 hover:text-white transition-colors underline underline-offset-4"
                            >
                                Read full privacy notice
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
