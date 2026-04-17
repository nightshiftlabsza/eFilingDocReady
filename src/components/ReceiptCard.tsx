import React from 'react';
import { Activity, Share2, Download, RefreshCw, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReceiptCardProps {
    originalSize: number;
    compressedSize: number;
    maxPartSize?: number;
    onDownload: () => void;
    onRestart: () => void;
    partCount?: number;
    isSafe: boolean;
    workspaceMode?: 'efiling' | 'general';
    truncated?: boolean;
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
    workspaceMode = 'efiling',
    truncated = false,
}) => {
    const reduction = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;
    const isSplit = partCount > 1;
    const isEfiling = workspaceMode === 'efiling';

    return (
        <div className="w-full max-w-md mx-auto space-y-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-8 relative overflow-hidden border border-white/10"
            >
                <div className="flex justify-center mb-6">
                    <div className="bg-[#10b981]/10 text-[#10b981] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[#10b981]/20 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        {isEfiling ? 'Prepared for strict upload limits' : 'Merged locally'}
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-[var(--text-color)] mb-2">
                        {isEfiling ? 'Preparation Complete' : 'Merge Complete'}
                    </h3>
                    <p className="text-sm text-[var(--text-color)]/60">
                        {isEfiling
                            ? 'DocReady prepared your output locally in the browser.'
                            : 'Your files were merged into one PDF without compression.'}
                    </p>
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
                            {isSplit && (
                                <div className="text-xs text-[var(--text-color)]/50 mt-0.5">
                                    {partCount} part{partCount === 1 ? '' : 's'} generated
                                </div>
                            )}
                            {isSplit && maxPartSize > 0 && (
                                <div className="text-xs text-[var(--text-color)]/50 mt-0.5">
                                    Largest part: {formatBytes(maxPartSize)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-[#10b981]/10 rounded-xl border border-[#10b981]/20">
                        <Activity className="w-4 h-4 text-[#10b981]" />
                        <span className="text-xs text-[#10b981] font-bold">
                            {isEfiling ? `SIZE CHANGED BY ${reduction}%` : 'MERGED INTO ONE PDF'}
                        </span>
                    </div>

                    {truncated && (
                        <div className="p-4 rounded-2xl flex gap-3 bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                            <p className="text-xs leading-relaxed text-amber-300">
                                The output was capped at 20 parts. The last part may still be larger than your target.
                            </p>
                        </div>
                    )}

                    <div className={`p-4 rounded-2xl flex gap-3 ${isSafe ? 'bg-white/5 border border-white/10' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <ShieldCheck className={`w-5 h-5 shrink-0 ${isSafe ? 'text-primary' : 'text-red-500'}`} />
                        <p className={`text-xs leading-relaxed ${isSafe ? 'text-[var(--text-color)]/60' : 'text-red-400'}`}>
                            {isEfiling
                                ? isSafe
                                    ? 'This output was prepared toward strict upload limits, but acceptance still depends on the receiving platform.'
                                    : 'One or more output parts may still be larger than your target. DocReady does not guarantee upload acceptance.'
                                : 'This output was merged locally without compression.'}
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
                        Prepare Another File
                    </button>

                    <button
                        onClick={() => {
                            const text = `Prepared my supporting documents locally with DocReady and reduced them from ${formatBytes(originalSize)} to ${formatBytes(compressedSize)}.`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                        }}
                        className="w-full py-3 text-[var(--text-color)]/40 hover:text-[#25D366] text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-4 h-4" /> Share on WhatsApp
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
