import React from 'react';
import { X, ShieldCheck, Mail, UserCheck, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LEGAL_OPERATOR_NAME, SUPPORT_EMAIL } from '../lib/site';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2005] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-2xl glass-panel border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-primary w-6 h-6" />
                                <h2 className="text-xl font-bold text-white">Privacy Notice</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Close privacy notice">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 text-slate-300">
                            <section>
                                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-blue-500" /> 1. Service position
                                </h3>
                                <p className="text-sm leading-relaxed">
                                    DocReady is an independent document-preparation tool operated by {LEGAL_OPERATOR_NAME}. It is not affiliated with SARS and does not guarantee submission acceptance.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> 2. Local document processing
                                </h3>
                                <ul className="list-disc list-inside text-xs space-y-2 ml-2">
                                    <li>Document files are processed in your browser.</li>
                                    <li>Customer document blobs, filenames, and document-derived metadata are not stored remotely for processing.</li>
                                    <li>No server endpoint accepts customer PDFs or images for compression or merging.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-3">3. Remote records</h3>
                                <ul className="list-disc list-inside text-xs space-y-2 mt-2 ml-2">
                                    <li>Email-based authentication records may be stored to support sign-in and restore access.</li>
                                    <li>Payment transactions, entitlements, and webhook events may be stored to verify paid access truthfully.</li>
                                    <li>Third-party services used for these functions may include Supabase, Paystack, Railway, and Cloudflare.</li>
                                </ul>
                            </section>

                            <section className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-primary" /> Contact
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Mail className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase tracking-wider">Support Email Placeholder</p>
                                            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm text-primary hover:underline">{SUPPORT_EMAIL}</a>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 italic mt-4">
                                        Replace this placeholder with the final launch support email if it changes before go-live.
                                    </p>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium border border-white/10"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
