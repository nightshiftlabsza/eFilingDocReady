import React from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, Zap, Users, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';


interface PractitionerViewProps {
    onEnterWorkspace: () => void;
    onOpenPricing: () => void;
}

export const PractitionerView: React.FC<PractitionerViewProps> = ({ onEnterWorkspace, onOpenPricing }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-6xl mx-auto w-full px-4 py-12"
        >
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">I am a Practitioner</h2>
                <p className="text-xl md:text-2xl opacity-70 max-w-3xl mx-auto leading-relaxed">
                    Secure, private folder management and document optimization.
                    Recover billable time and standardize your firm's document preparation.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                <div className="glass-panel p-6 flex flex-col items-start">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Clock className="text-indigo-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Save Hours Weekly</h3>
                    <p className="text-sm opacity-60">Save up to 20% of your workweek by automating retrieval and organization.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-start">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Users className="text-green-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Firm-Wide Support</h3>
                    <p className="text-sm opacity-60">Deskilling administrative tasks allows partners to focus on high-value work.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-start">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Zap className="text-amber-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">SARS Precision</h3>
                    <p className="text-sm opacity-60">Automatic "&" character stripping and 4.9MB sizing for foolproof uploads.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-start">
                    <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Shield className="text-rose-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Zero Privacy Risk</h3>
                    <p className="text-sm opacity-60">Sensitive data never leaves your firm's PC. Everything runs locally — zero cloud exposure.</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 mb-16 items-center">
                <div className="space-y-8">
                    <h3 className="text-3xl font-bold tracking-tight">Professional Comparison</h3>
                    <div className="space-y-6">
                        <div className="flex gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm mb-1 uppercase tracking-widest text-rose-500">The Problem (Adobe/iLovePDF)</h4>
                                <p className="text-sm opacity-60">Excessive annual fees (R5k+ per seat) or risky cloud uploads that expose client documents to third-party servers.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <Check className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm mb-1 uppercase tracking-widest text-indigo-500">The DocReady Advantage</h4>
                                <p className="text-sm opacity-70 font-medium">SARS-specific presets (Target 4.9MB), Smart Naming, and Offline Processing for a fraction of the cost.</p>
                            </div>
                        </div>
                        <p className="text-sm opacity-50 italic">
                            A single R900-R2000/hr saving of just 30 minutes pays for a practitioner license multiple times over.
                        </p>
                    </div>
                </div>

                <div className="glass-panel p-8 p-12-lg border-indigo-500/30 bg-indigo-500/[0.02] shadow-2xl shadow-indigo-500/10">
                    <h3 className="text-3xl font-bold mb-4">Firm Licensing</h3>
                    <div className="space-y-6 mb-8">
                        <div className="flex justify-between items-baseline border-b border-white/5 pb-4">
                            <div>
                                <h4 className="font-bold text-lg">Solo Practitioner</h4>
                                <p className="text-sm opacity-50 font-medium whitespace-nowrap">Annual Filing Season Pass</p>
                            </div>
                            <span className="text-3xl font-black text-indigo-500">R499</span>
                        </div>
                        <div className="flex justify-between items-baseline border-b border-white/5 pb-4">
                            <div>
                                <h4 className="font-bold text-lg">Small Firm</h4>
                                <p className="text-sm opacity-50 font-medium whitespace-nowrap">Up to 10 staff seats</p>
                            </div>
                            <span className="text-3xl font-black text-indigo-500">R1,899</span>
                        </div>
                        <div className="flex justify-between items-baseline border-b border-white/5 pb-4">
                            <div>
                                <h4 className="font-bold text-lg">Site License</h4>
                                <p className="text-sm opacity-50 font-medium whitespace-nowrap">Unlimited firm-wide</p>
                            </div>
                            <span className="text-3xl font-black text-indigo-500">R4,999</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => {
                                toast.success("Initializing Practitioner Hub...");
                                onEnterWorkspace();
                            }}
                            className="btn-cta practitioner-mode py-4 w-full text-lg"
                        >
                            Open Practitioner Hub
                        </button>
                        <button onClick={onOpenPricing} className="btn-secondary py-4 w-full text-lg">View Detailed B2B Pricing</button>
                    </div>

                    <p className="text-[10px] text-center mt-4 opacity-40 uppercase tracking-widest">
                        VAT-compliant invoicing and EFT support available.
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
