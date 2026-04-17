import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Shield, SplitSquareVertical, Users } from 'lucide-react';

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
                <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">Practitioner View</h2>
                <p className="text-xl md:text-2xl opacity-70 max-w-3xl mx-auto leading-relaxed">
                    Prepare client supporting documents privately in your browser. The launch practitioner pass is one once-off purchase
                    for one practitioner or one office user.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                <div className="glass-panel p-6 flex flex-col items-start">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Users className="text-indigo-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Single-user scope</h3>
                    <p className="text-sm opacity-60">This launch pass is not a team dashboard, seat manager, or practice platform.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-start">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Shield className="text-green-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Client files stay local</h3>
                    <p className="text-sm opacity-60">Document processing happens in the browser, not on a remote storage service.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-start">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                        <SplitSquareVertical className="text-amber-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Auto-split large outputs</h3>
                    <p className="text-sm opacity-60">Keep preparing packs even when one output still needs to be broken into smaller parts.</p>
                </div>
                <div className="glass-panel p-6 flex flex-col items-start">
                    <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Lock className="text-rose-500 w-6 h-6" />
                    </div>
                    <h3 className="font-bold mb-2">Password tools included</h3>
                    <p className="text-sm opacity-60">Unlock incoming PDFs when you know the password and optionally protect the output file.</p>
                </div>
            </div>

            <div className="glass-panel p-8 p-12-lg border-indigo-500/30 bg-indigo-500/[0.02] shadow-2xl shadow-indigo-500/10">
                <h3 className="text-3xl font-bold mb-4">Practitioner Pass</h3>
                <p className="text-lg opacity-70 mb-8">
                    R399 once-off for one practitioner or one office user. No team seats, no admin console, and no fake enterprise bundle.
                </p>
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <ul className="space-y-3">
                        <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-indigo-400" /> Merge supported files into one PDF</li>
                        <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-indigo-400" /> Compress toward strict upload limits</li>
                        <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-indigo-400" /> Auto-split oversized outputs</li>
                    </ul>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-indigo-400" /> Optional password add and remove</li>
                        <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-indigo-400" /> Restore access by email</li>
                        <li className="flex items-center gap-2 opacity-80"><Check className="w-4 h-4 text-indigo-400" /> Files processed in-browser</li>
                    </ul>
                </div>
                <p className="text-sm opacity-60 mb-8">
                    DocReady helps prepare files for strict upload limits, but it does not guarantee upload success and is not affiliated with SARS.
                </p>
                <div className="flex flex-col gap-4 md:flex-row">
                    <button
                        onClick={onEnterWorkspace}
                        className="btn-cta practitioner-mode py-4 px-8 text-lg"
                    >
                        Open Workspace
                    </button>
                    <button onClick={onOpenPricing} className="btn-secondary py-4 px-8 text-lg">View Practitioner Pass</button>
                </div>
            </div>
        </motion.div>
    );
};
