import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Shield, SplitSquareVertical, Zap } from 'lucide-react';

interface TaxpayerViewProps {
    onEnterWorkspace: () => void;
    onOpenPricing: () => void;
}

export const TaxpayerView: React.FC<TaxpayerViewProps> = ({ onEnterWorkspace, onOpenPricing }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto w-full px-4 py-12"
        >
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">Taxpayer View</h2>
                <p className="text-xl opacity-70 max-w-2xl mx-auto">
                    Use DocReady to prepare your own supporting documents. Merge files for free, and unlock compression,
                    splitting, and password tools with one once-off taxpayer pass.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="glass-panel p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                        <Shield className="text-blue-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Private by default</h3>
                    <p className="text-sm opacity-60">Your files stay in the browser while you work.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                        <SplitSquareVertical className="text-emerald-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Split large outputs</h3>
                    <p className="text-sm opacity-60">Premium mode compresses and splits large results when one file is still too big.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="text-amber-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Password options</h3>
                    <p className="text-sm opacity-60">Remove a known password from an incoming PDF or add one to the final file.</p>
                </div>
            </div>

            <div className="glass-panel p-8 md:p-12 mb-12 border-emerald-500/30 bg-emerald-500/[0.02]">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-grow">
                        <div className="badge mb-4">Taxpayer Pass</div>
                        <h3 className="text-3xl font-bold mb-4">R49 once-off</h3>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-emerald-500" /> Merge supported files into one PDF</li>
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-emerald-500" /> Compress toward strict upload limits</li>
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-emerald-500" /> Auto-split oversized results</li>
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-emerald-500" /> Optional password add and remove</li>
                        </ul>
                        <p className="text-sm opacity-60">
                            Not affiliated with SARS. DocReady helps you prepare files, but it does not guarantee that any upload will be accepted.
                        </p>
                    </div>
                    <div className="w-full md:w-auto flex flex-col gap-4">
                        <button
                            onClick={onEnterWorkspace}
                            className="btn-primary py-4 px-10 text-lg shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                            <Zap className="w-5 h-5" />
                            Open Workspace
                        </button>
                        <button onClick={onOpenPricing} className="btn-secondary py-4 px-10 text-lg">View Taxpayer Pass</button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
