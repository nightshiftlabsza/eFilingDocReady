import React from 'react';
import { Activity, Share2, Download, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReceiptCardProps {
    originalSize: number;
    compressedSize: number;
    onDownload: () => void;
    onRestart: () => void;
    isPremium: boolean;
    partCount?: number;
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
    originalSize,
    compressedSize,
    onDownload,
    onRestart,
    isPremium,
    partCount = 1
}) => {
    const reduction = Math.round((1 - compressedSize / originalSize) * 100);
    const isSafe = compressedSize < 5 * 1024 * 1024;

    return (
        <div className="w-full max-w-md mx-auto space-y-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-8 relative overflow-hidden border border-white/10"
            >
                {/* Status Badge */}
                <div className="flex justify-center mb-6">
                    <div className="bg-[#10b981]/10 text-[#10b981] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[#10b981]/20 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        {reduction > 85 ? 'Legibility Risk (Manual Review)' : reduction > 60 ? 'OCR Pass (Acceptable)' : 'High Quality (Print Ready)'}
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">Optimization Receipt</h3>
                    <p className="text-sm text-slate-400">Your document is ready for eFiling.</p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-slate-400 text-sm">Input Size</span>
                        <span className="text-white font-medium">{formatBytes(originalSize)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-slate-400 text-sm font-semibold">Output Size</span>
                        <div className="text-right">
                            <span className="text-2xl font-black text-[#10b981]">{formatBytes(compressedSize)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-[#10b981]/10 rounded-xl border border-[#10b981]/20">
                        <Activity className="w-4 h-4 text-[#10b981]" />
                        <span className="text-xs text-[#10b981] font-bold">
                            REDUCED BY {reduction}%
                        </span>
                    </div>

                    <div className={`p-4 rounded-2xl flex gap-3 ${isSafe ? 'bg-white/5 border border-white/10' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <ShieldCheck className={`w-5 h-5 shrink-0 ${isSafe ? 'text-primary' : 'text-red-500'}`} />
                        <p className={`text-xs leading-relaxed ${isSafe ? 'text-slate-300' : 'text-red-400'}`}>
                            {isSafe
                                ? "This file is within the 5MB limit and is audit-compliant for eFiling."
                                : "Warning: This file still exceeds 5MB. It may be rejected during upload."}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onDownload}
                        className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active-scale"
                    >
                        <Download className="w-5 h-5" />
                        {partCount > 1 ? `Download All Parts (${partCount})` : 'Download Final PDF'}
                        {!isPremium && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-lg border border-white/10">PREMIUM</span>}
                    </motion.button>

                    <button
                        onClick={onRestart}
                        className="w-full py-4 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 font-bold rounded-2xl border border-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Scan Another Doc
                    </button>

                    <button
                        onClick={() => {
                            const text = `Fixed my eFiling upload error! Compressed my docs from ${formatBytes(originalSize)} to ${formatBytes(compressedSize)} instantly. Check out DocReady!`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                        }}
                        className="w-full py-3 text-slate-500 hover:text-[#25D366] text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-4 h-4" /> Share Success on WhatsApp
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
