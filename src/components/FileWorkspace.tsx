import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Image as ImageIcon, Trash2, GripVertical, AlertCircle, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sanitizeSarsFilename, isFilenameRisky } from '../lib/sanitizer';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FileWorkspaceProps {
    onFilesReady: (files: File[]) => void;
    isProcessing: boolean;
}

export const FileWorkspace: React.FC<FileWorkspaceProps> = ({ onFilesReady, isProcessing }) => {
    const [files, setFiles] = useState<File[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const sanitizedFiles = acceptedFiles.map(file => {
            const sanitizedName = sanitizeSarsFilename(file.name);
            if (sanitizedName !== file.name) {
                // Return a new File object with the sanitized name
                return new File([file], sanitizedName, { type: file.type });
            }
            return file;
        });
        setFiles(prev => [...prev, ...sanitizedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png'],
            'application/pdf': ['.pdf'],
        },
        disabled: isProcessing
    });

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleCompress = () => {
        if (files.length > 0) {
            onFilesReady(files);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={cn(
                    "w-full p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 glass-panel",
                    isDragActive ? "border-[#10b981] bg-[#10b981]/10 scale-[1.02]" : "border-white/10 hover:border-[#10b981]/50 bg-white/5",
                    isProcessing && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
            >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-[#10b981]/10 rounded-2xl flex items-center justify-center mb-4">
                    <UploadCloud className={cn("w-8 h-8", isDragActive ? "text-[#10b981]" : "text-[#94a3b8]")} />
                </div>
                <h3 className="text-xl font-bold mb-2">
                    {isDragActive ? "Drop to Scan" : "Drag Documents Here"}
                </h3>
                <p className="text-sm text-slate-400 max-w-[300px] mx-auto">
                    Combine IDs, Payslips, or PDFs. They stay 100% on your device.
                </p>
            </div>

            {/* File List */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between px-2">
                            <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Collection Stack ({files.length})
                            </span>
                            <span className="text-xs text-slate-500">Drag to reorder pages</span>
                        </div>

                        <Reorder.Group axis="y" values={files} onReorder={setFiles} className="space-y-3">
                            {files.map((file, index) => (
                                <Reorder.Item
                                    key={`${file.name}-${index}`}
                                    value={file}
                                    className="glass-panel p-4 flex items-center gap-4 hover:border-white/20 transition-colors cursor-grab active:cursor-grabbing group"
                                >
                                    <GripVertical className="w-5 h-5 text-slate-600 group-hover:text-slate-400 shrink-0" />
                                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/5 shrink-0">
                                        {file.type === 'application/pdf' ? (
                                            <FileText className="w-5 h-5 text-red-400" />
                                        ) : (
                                            <ImageIcon className="w-5 h-5 text-blue-400" />
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                            <AnimatePresence>
                                                {isFilenameRisky(file.name) && (
                                                    <motion.span
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="auto-fixed-badge"
                                                    >
                                                        <Zap className="w-2 h-2 fill-current" />
                                                        Auto-Fixed
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                        className="p-2 hover:bg-red-500/10 hover:text-red-500 text-slate-500 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {/* Action Button */}
                        <motion.button
                            onClick={handleCompress}
                            disabled={isProcessing}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active-scale disabled:opacity-50"
                        >
                            <Zap className="w-5 h-5" />
                            {isProcessing ? 'Processing PDF Engine...' : 'Scan & Merge for eFiling'}
                        </motion.button>

                        <div className="bg-[#10b981]/5 border border-[#10b981]/20 rounded-xl p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-[#10b981] shrink-0" />
                            <div>
                                <p className="text-xs text-[#10b981] font-bold uppercase mb-1 tracking-wider">Audit-Ready Optimization Active</p>
                                <p className="text-xs text-[#10b981]/80 leading-relaxed">
                                    We'll merge these {files.length} files and keep the output under 5MB using <strong>100% Client-Side Adaptive Compression</strong>.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
