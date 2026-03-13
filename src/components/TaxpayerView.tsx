import React from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, Zap, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';


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
                <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">I am a Taxpayer</h2>
                <p className="text-xl opacity-70 max-w-2xl mx-auto">
                    Combine IDs, receipts, and PDFs into a single, optimized file. Perfectly sized for the 5MB eFiling limit.
                    Zero server involvement. Your sensitive documents never leave your device.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="glass-panel p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                        <Shield className="text-blue-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">100% Private</h3>
                    <p className="text-sm opacity-60">No uploads. Processing happens entirely in your browser.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                        <Zap className="text-emerald-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">SARS Optimized</h3>
                    <p className="text-sm opacity-60">Automatically targets 4.9MB to ensure successful eFiling uploads.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="text-amber-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Password Removal</h3>
                    <p className="text-sm opacity-60">Safely strip security from bank statements for SARS processing.</p>
                </div>
            </div>

            <div className="glass-panel p-8 md:p-12 mb-12 border-blue-500/30 bg-blue-500/[0.02]">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-grow">
                        <div className="badge mb-4">Limited Offer</div>
                        <h3 className="text-3xl font-bold mb-4">Lifetime Access</h3>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-emerald-500" /> Unlimited Merges & Compressions</li>
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-emerald-500" /> No Watermarks</li>
                            <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-emerald-500" /> Advanced Legibility Mode</li>
                        </ul>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black">R89</span>
                            <span className="text-sm opacity-50 font-medium">ONCE-OFF</span>
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex flex-col gap-4">
                        <button
                            onClick={() => {
                                toast.success("Opening Taxpayer Workspace...");
                                onEnterWorkspace();
                            }}
                            className="btn-primary py-4 px-10 text-lg shadow-xl shadow-blue-500/20"
                        >
                            Try for Free (3 Credits)
                        </button>
                        <button onClick={onOpenPricing} className="btn-secondary py-4 px-10 text-lg">Buy Premium Pass</button>
                    </div>

                </div>
            </div>

            <p className="text-center text-sm opacity-40">
                Credits never expire.
            </p>
        </motion.div>
    );
};
