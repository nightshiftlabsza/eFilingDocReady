import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Image as ImageIcon, Trash2, GripVertical, AlertCircle, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sanitizeSarsFilename, isFilenameRisky } from '../lib/sanitizer';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FileWorkspaceProps {
    onFilesReady: (files: File[]) => void;
    isProcessing: boolean;
}

export const FileWorkspace: React.FC<FileWorkspaceProps> = ({ onFilesReady, isProcessing }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const objectUrlsRef = useRef<Set<string>>(new Set());

    // Cleanup all object URLs on unmount
    useEffect(() => {
        const urls = objectUrlsRef.current;
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Generate thumbnails whenever files change
    useEffect(() => {
        let cancelled = false;
        let currentRenderTask: pdfjsLib.RenderTask | null = null;

        const generateThumbnails = async () => {
            for (const file of files) {
                if (cancelled) break;

                const key = `${file.name}-${file.size}`;
                if (thumbnails[key]) continue; // already cached

                if (file.type === 'application/pdf') {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        if (cancelled) break;

                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        if (cancelled) break;

                        const page = await pdf.getPage(1);
                        const viewport = page.getViewport({ scale: 0.4 });

                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d')!;

                        // Capture task reference before awaiting so cleanup can cancel it
                        currentRenderTask = page.render({ canvasContext: ctx, canvas, viewport });
                        await currentRenderTask.promise;
                        currentRenderTask = null;

                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        if (!cancelled) {
                            setThumbnails(prev => ({ ...prev, [key]: dataUrl }));
                        }
                    } catch (error: any) {
                        if (error?.name === 'RenderingCancelledException') {
                            // Intentional — effect cleaned up mid-render. Exit the loop.
                            break;
                        }
                        // Silently ignore encrypted or corrupt PDFs — fallback icon shown
                    }
                } else if (file.type.startsWith('image/')) {
                    const objectUrl = URL.createObjectURL(file);
                    objectUrlsRef.current.add(objectUrl);
                    if (!cancelled) {
                        setThumbnails(prev => ({ ...prev, [key]: objectUrl }));
                    }
                }
            }
        };

        generateThumbnails();
        return () => {
            cancelled = true;
            // Cancel any in-progress PDF.js render to free the worker immediately
            if (currentRenderTask) {
                currentRenderTask.cancel();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const sanitizedFiles = acceptedFiles.map(file => {
            const sanitizedName = sanitizeSarsFilename(file.name);
            if (sanitizedName !== file.name) {
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

    // Uses functional updater so we always access the latest state, not a stale closure.
    // Checks startsWith('blob:') to distinguish revocable object URLs (images) from
    // base64 data URLs (PDF thumbnails rendered via canvas), which must not be revoked.
    const removeFile = useCallback((index: number) => {
        setFiles(prevFiles => {
            const newFiles = [...prevFiles];
            const fileToRemove = newFiles[index];

            if (fileToRemove) {
                const key = `${fileToRemove.name}-${fileToRemove.size}`;
                setThumbnails(prevThumbnails => {
                    const newThumbnails = { ...prevThumbnails };
                    const thumbUrl = newThumbnails[key];
                    if (thumbUrl && thumbUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(thumbUrl);
                        objectUrlsRef.current.delete(thumbUrl);
                    }
                    delete newThumbnails[key];
                    return newThumbnails;
                });
            }

            newFiles.splice(index, 1);
            return newFiles;
        });
    }, []);

    // Keyboard-accessible reorder — shifts a file up or down by one position.
    const moveFile = useCallback((index: number, direction: 'up' | 'down') => {
        setFiles(prevFiles => {
            const newFiles = [...prevFiles];
            if (direction === 'up' && index > 0) {
                [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
            } else if (direction === 'down' && index < newFiles.length - 1) {
                [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
            }
            return newFiles;
        });
    }, []);

    const handleCompress = () => {
        if (files.length > 0) {
            onFilesReady(files);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
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
                    {isDragActive ? "Drop your files here" : "Drag documents here, or click to upload"}
                </h3>
                <p className="text-sm text-[var(--text-color)]/60 max-w-[300px] mx-auto">
                    ID documents, payslips, bank statements — all processed privately on your device.
                </p>
            </div>

            {/* File Grid */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between px-2">
                            <span className="text-sm font-semibold text-[var(--text-color)]/50 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Collection Stack ({files.length})
                            </span>
                            <span className="text-xs text-[var(--text-color)]/40">Drag to reorder</span>
                        </div>

                        <Reorder.Group
                            axis="y"
                            values={files}
                            onReorder={setFiles}
                            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                            {files.map((file, index) => {
                                const key = `${file.name}-${file.size}`;
                                const thumb = thumbnails[key];
                                return (
                                    <Reorder.Item
                                        key={`${file.name}-${index}`}
                                        value={file}
                                        className="glass-panel overflow-hidden flex flex-col hover:border-white/20 transition-colors cursor-grab active:cursor-grabbing group"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative w-full h-32 bg-white/5 flex items-center justify-center overflow-hidden">
                                            {thumb ? (
                                                <img
                                                    src={thumb}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    {file.type === 'application/pdf'
                                                        ? <FileText className="w-10 h-10 text-red-400/50" />
                                                        : <ImageIcon className="w-10 h-10 text-blue-400/50" />
                                                    }
                                                </div>
                                            )}
                                            {/* Drag handle */}
                                            <div className="absolute top-2 left-2 p-1 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                <GripVertical className="w-4 h-4 text-white/80" />
                                            </div>
                                            {/* Delete button */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                                aria-label={`Remove ${file.name}`}
                                                className="absolute top-2 right-2 p-1 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                            >
                                                <Trash2 className="w-4 h-4 text-white" />
                                            </button>

                                            {/* Keyboard reorder controls — sr-only until keyboard-focused,
                                                then revealed as a semi-transparent overlay so keyboard
                                                users can visually see and operate the controls. */}
                                            <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-0 focus-within:bg-black/80 focus-within:z-20 focus-within:flex focus-within:flex-col focus-within:items-center focus-within:justify-center focus-within:gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveFile(index, 'up'); }}
                                                    disabled={index === 0}
                                                    aria-label={`Move ${file.name} up in the list`}
                                                    className="px-3 py-1 bg-white/20 text-white rounded text-xs font-bold disabled:opacity-30 hover:bg-white/40"
                                                >
                                                    Move Up
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveFile(index, 'down'); }}
                                                    disabled={index === files.length - 1}
                                                    aria-label={`Move ${file.name} down in the list`}
                                                    className="px-3 py-1 bg-white/20 text-white rounded text-xs font-bold disabled:opacity-30 hover:bg-white/40"
                                                >
                                                    Move Down
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info strip */}
                                        <div className="p-3">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <p className="text-xs font-semibold text-[var(--text-color)] truncate flex-1">{file.name}</p>
                                                <AnimatePresence>
                                                    {isFilenameRisky(file.name) && (
                                                        <motion.span
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="auto-fixed-badge shrink-0"
                                                        >
                                                            <Zap className="w-2 h-2 fill-current" />
                                                            Fixed
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <p className="text-xs text-[var(--text-color)]/40">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase() ?? 'FILE'}
                                            </p>
                                        </div>
                                    </Reorder.Item>
                                );
                            })}
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
                                <p className="text-xs text-[#10b981] font-bold uppercase mb-1 tracking-wider">Ready to prepare for eFiling</p>
                                <p className="text-xs text-[#10b981]/80 leading-relaxed">
                                    We'll combine your {files.length} document{files.length !== 1 ? 's' : ''} and compress everything to under 5 MB — without uploading anything.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
