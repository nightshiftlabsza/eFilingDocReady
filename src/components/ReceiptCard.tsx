import React from 'react';
import { Activity, Share2, Download, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReceiptCardProps {
    originalSize: number;
    compressedSize: number;
    maxPartSize?: number;
    onDownload: () => void;
    onRestart: () => void;
    partCount?: number;
    isSafe: boolean;
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
    maxPartSize = 0,
    onDownload,
    onRestart,
    partCount = 1,
    isSafe,
}) => {
    const reduction = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;
    const isSplit = partCount > 1;

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
                    <h3 className="text-2xl font-bold text-[var(--text-color)] mb-2">Optimization Receipt</h3>
                    <p className="text-sm text-[var(--text-color)]/60">Your document is ready for eFiling.</p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-[var(--text-color)]/50 text-sm">Input Size</span>
                        <span className="text-[var(--text-color)] font-medium">{formatBytes(originalSize)}</span>
                    </div>
                    <div className="flex justify-between items-start py-3 border-b border-white/5">
                        <span className="text-[var(--text-color)]/50 text-sm font-semibold">Output Size</span>
                        <div className="text-right">
                            <span className="text-2xl font-black text-[#10b981]">{formatBytes(compressedSize)}</span>
                            {isSplit && isSafe && (
                                <div className="text-xs text-emerald-500 font-semibold mt-1">
                                    Split into {partCount} SARS-safe parts ✓
                                </div>
                            )}
                            {isSplit && isSafe && maxPartSize > 0 && (
                                <div className="text-xs text-[var(--text-color)]/50 mt-0.5">
                                    Largest part: {formatBytes(maxPartSize)} (under 5MB ✓)
                                </div>
                            )}
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
                        <p className={`text-xs leading-relaxed ${isSafe ? 'text-[var(--text-color)]/60' : 'text-red-400'}`}>
                            {isSafe
                                ? isSplit
                                    ? `All ${partCount} parts are within the 5MB SARS eFiling limit and are audit-compliant.`
                                    : "This file is within the 5MB limit and is audit-compliant for eFiling."
                                : "Warning: Part sizes still exceed 5MB. They may be rejected during upload."}
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
                    </motion.button>

                    <button
                        onClick={onRestart}
                        className="w-full py-4 bg-white/5 text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:bg-white/10 font-bold rounded-2xl border border-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Scan Another Doc
                    </button>

                    <button
                        onClick={() => {
                            const text = `Fixed my eFiling upload error! Compressed my docs from ${formatBytes(originalSize)} to ${formatBytes(compressedSize)} instantly. Check out DocReady!`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                        }}
                        className="w-full py-3 text-[var(--text-color)]/40 hover:text-[#25D366] text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-4 h-4" /> Share Success on WhatsApp
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
