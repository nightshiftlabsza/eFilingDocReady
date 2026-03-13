import React from 'react';
import { X, ShieldCheck, Mail, UserCheck, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-primary w-6 h-6" />
                                <h2 className="text-xl font-bold text-white">Privacy Details</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 text-slate-300">
                            <section>
                                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-blue-500" /> 1. Introduction
                                </h3>
                                <p className="text-sm leading-relaxed">
                                    DocReady is an independent productivity tool. It is not a law firm and does not provide legal, tax, or compliance advice. This page explains how your data is handled when you use the app.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> 2. Data Processing Strategy
                                </h3>
                                <p className="text-sm leading-relaxed mb-3">
                                    Our application follows a "Zero-Server" architecture. All processing of your tax documents and personal information occurs exclusively within your browser's local environment.
                                </p>
                                <ul className="list-disc list-inside text-xs space-y-2 ml-2">
                                    <li>Files are never uploaded to any server.</li>
                                    <li>No personal data is stored in our databases.</li>
                                    <li>All data is volatile and cleared upon session termination or manual wiping.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-3">3. Purpose of Collection</h3>
                                <p className="text-sm leading-relaxed">
                                    Providing information is voluntary. The data is processed solely to:
                                </p>
                                <ul className="list-disc list-inside text-xs space-y-2 mt-2 ml-2">
                                    <li>Merge multiple files into a single PDF.</li>
                                    <li>Compress documents to meet SARS 5MB limits.</li>
                                    <li>Sanitize filenames for SARS eFiling compliance.</li>
                                </ul>
                                <p className="text-xs text-amber-500 mt-3 font-medium">
                                    Consequence of failure to provide info: The tool will be unable to perform the requested optimizations.
                                </p>
                            </section>

                            <section className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <UserCheck className="w-5 h-5 text-primary" /> Information Officer
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Mail className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase tracking-wider">Direct Inquiries</p>
                                            <a href="mailto:nightshiftlabsza@gmail.com" className="text-sm text-primary hover:underline">nightshiftlabsza@gmail.com</a>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 italic mt-4">
                                        For any questions about how DocReady handles data, contact us at the address below. DocReady is not affiliated with SARS and does not act as an information officer under any regulatory framework.
                                    </p>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
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
