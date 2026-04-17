import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Image as ImageIcon, Trash2, GripVertical, AlertCircle, Zap, Lock, Eye, EyeOff, ShieldCheck, Crown, FileCheck, PenTool, RotateCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sanitizeSarsFilename, isFilenameRisky } from '../lib/sanitizer';
import * as pdfjsLib from 'pdfjs-dist';
import { UnlockerModal } from './UnlockerModal';
import { unlockEncryptedPdf } from '../lib/unlockPdf';
import { toast } from 'react-hot-toast';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FileWorkspaceProps {
    onFilesReady: (files: File[], mergeOnly?: boolean, targetMB?: number, outputPassword?: string, workspaceMode?: 'efiling' | 'general', rotations?: Record<string, number>) => void;
    isProcessing: boolean;
    isPremium: boolean;
}

export const FileWorkspace: React.FC<FileWorkspaceProps> = ({ onFilesReady, isProcessing, isPremium }) => {
    const [workspaceMode, setWorkspaceMode] = useState<'efiling' | 'general'>('efiling');
    const [files, setFiles] = useState<File[]>([]);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [targetMB, setTargetMB] = useState<number>(5);
    const [lockedFile, setLockedFile] = useState<File | null>(null);
    const [rotations, setRotations] = useState<Record<string, number>>({});
    const objectUrlsRef = useRef<Set<string>>(new Set());
    // Output password state (premium only)
    const [outputPasswordEnabled, setOutputPasswordEnabled] = useState(false);
    const [outputPassword, setOutputPassword] = useState('');
    const [outputPasswordConfirm, setOutputPasswordConfirm] = useState('');
    const [showOutputPassword, setShowOutputPassword] = useState(false);
    const passwordMismatch = outputPasswordEnabled && outputPassword.length > 0 && outputPassword !== outputPasswordConfirm;

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
                        if (error?.name === 'PasswordException') {
                            if (!cancelled) setLockedFile(prev => prev ? prev : file);
                        }
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
            'image/jpeg': ['.jpeg', '.jpg'],
            'image/png': ['.png'],
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

    const rotateFile = useCallback((key: string) => {
        setRotations(prev => ({
            ...prev,
            [key]: ((prev[key] || 0) + 90) % 360,
        }));
    }, []);

    const handleProcess = () => {
        if (files.length > 0) {
            const pwd = isPremium && outputPasswordEnabled && outputPassword && !passwordMismatch ? outputPassword : undefined;
            onFilesReady(files, false, targetMB, pwd, workspaceMode, rotations);
        }
    };

    const handleMergeOnly = () => {
        if (files.length > 0) {
            const pwd = isPremium && outputPasswordEnabled && outputPassword && !passwordMismatch ? outputPassword : undefined;
            onFilesReady(files, true, targetMB, pwd, workspaceMode, rotations);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* ── Mode Toggle ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit mx-auto">
                <button
                    type="button"
                    onClick={() => setWorkspaceMode('efiling')}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                        workspaceMode === 'efiling'
                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                            : "text-[var(--text-color)]/50 hover:text-[var(--text-color)]/80 hover:bg-white/5"
                    )}
                >
                    <FileCheck className="w-4 h-4" />
                    Strict Upload Mode
                </button>
                <button
                    type="button"
                    onClick={() => setWorkspaceMode('general')}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                        workspaceMode === 'general'
                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                            : "text-[var(--text-color)]/50 hover:text-[var(--text-color)]/80 hover:bg-white/5"
                    )}
                >
                    <PenTool className="w-4 h-4" />
                    General Document Editing
                </button>
            </div>

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
                    Supported types: PDF, JPG, JPEG, and PNG. Files stay on your device while you work.
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
                                                    className="w-full h-full object-cover transition-transform"
                                                    style={{ transform: `rotate(${rotations[key] || 0}deg)` }}
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
                                            {/* Action buttons */}
                                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); rotateFile(key); }}
                                                    aria-label={`Rotate ${file.name} 90°`}
                                                    className="p-1 bg-black/40 rounded-md hover:bg-blue-500/80"
                                                >
                                                    <RotateCw className="w-4 h-4 text-white" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                                    aria-label={`Remove ${file.name}`}
                                                    className="p-1 bg-black/40 rounded-md hover:bg-red-500/80"
                                                >
                                                    <Trash2 className="w-4 h-4 text-white" />
                                                </button>
                                            </div>
                                            {/* Rotation indicator */}
                                            {(rotations[key] || 0) > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="absolute bottom-2 right-2 flex items-center gap-1 bg-blue-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                >
                                                    <RotateCw className="w-2.5 h-2.5" /> {rotations[key]}°
                                                </motion.div>
                                            )}
                                            {/* Lock indicator badge for encrypted PDFs (premium can remove) */}
                                            {!thumbnails[`${file.name}-${file.size}`] && file.type === 'application/pdf' && isPremium && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="absolute bottom-2 left-2 flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                >
                                                    <Lock className="w-2.5 h-2.5" /> LOCKED
                                                </motion.div>
                                            )}

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

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {/* Target size — eFiling mode only */}
                            {workspaceMode === 'efiling' && (
                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                                    <label htmlFor="target-size" className="text-sm font-semibold text-[var(--text-color)]/80 flex-1">
                                        Target size per part (MB)
                                    </label>
                                    <input
                                        id="target-size"
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={targetMB}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (!isNaN(val)) setTargetMB(val);
                                        }}
                                        onBlur={(e) => {
                                            let val = parseInt(e.target.value, 10);
                                            if (isNaN(val) || val < 1) val = 1;
                                            if (val > 50) val = 50;
                                            setTargetMB(val);
                                        }}
                                        className="w-20 bg-black/20 border border-white/20 rounded-lg p-2 text-center text-[var(--text-color)] font-bold focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            )}

                            {/* ── Premium: Output Password Protection ─────────────────────── */}
                            {isPremium ? (
                                <motion.div
                                    layout
                                    className="overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5"
                                >
                                    {/* Toggle header */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOutputPasswordEnabled(prev => !prev);
                                            setOutputPassword('');
                                            setOutputPasswordConfirm('');
                                        }}
                                        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/5"
                                        aria-expanded={outputPasswordEnabled}
                                        aria-controls="output-password-panel"
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${outputPasswordEnabled ? 'bg-amber-500/20 border border-amber-400/40' : 'bg-white/5 border border-white/10'
                                            }`}>
                                            {outputPasswordEnabled
                                                ? <ShieldCheck className="w-4 h-4 text-amber-400" />
                                                : <Lock className="w-4 h-4 text-[var(--text-color)]/40" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold transition-colors ${outputPasswordEnabled ? 'text-amber-300' : 'text-[var(--text-color)]/70'
                                                }`}>Protect output with a password</p>
                                            <p className="text-xs text-[var(--text-color)]/40 truncate">
                                                {outputPasswordEnabled ? 'PDF will be encrypted on download' : 'Paid pass required'}
                                            </p>
                                        </div>
                                        <Crown className="w-4 h-4 text-amber-400/60 shrink-0" />
                                        <motion.div
                                            animate={{ rotate: outputPasswordEnabled ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="text-[var(--text-color)]/30 shrink-0"
                                        >
                                            ▾
                                        </motion.div>
                                    </button>

                                    {/* Expanded password fields */}
                                    <AnimatePresence initial={false}>
                                        {outputPasswordEnabled && (
                                            <motion.div
                                                id="output-password-panel"
                                                key="pw-panel"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 space-y-3">
                                                    <div className="h-px bg-white/5" />
                                                    {/* Password field */}
                                                    <div className="relative">
                                                        <label htmlFor="output-password" className="block text-[10px] uppercase tracking-widest text-amber-400/70 font-bold mb-1.5 ml-1">Password</label>
                                                        <div className="relative">
                                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-color)]/30" />
                                                            <input
                                                                id="output-password"
                                                                type={showOutputPassword ? 'text' : 'password'}
                                                                value={outputPassword}
                                                                onChange={e => setOutputPassword(e.target.value)}
                                                                placeholder="Enter password…"
                                                                autoComplete="new-password"
                                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-[var(--text-color)] placeholder-[var(--text-color)]/25 text-sm focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/40 outline-none transition-all font-mono tracking-wider"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowOutputPassword(p => !p)}
                                                                aria-label={showOutputPassword ? 'Hide password' : 'Show password'}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-color)]/30 hover:text-[var(--text-color)]/70 transition-colors"
                                                            >
                                                                {showOutputPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {/* Confirm field */}
                                                    <div className="relative">
                                                        <label htmlFor="output-password-confirm" className="block text-[10px] uppercase tracking-widest text-amber-400/70 font-bold mb-1.5 ml-1">Confirm</label>
                                                        <div className="relative">
                                                            <ShieldCheck className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${outputPasswordConfirm.length > 0 && !passwordMismatch ? 'text-green-400' : 'text-[var(--text-color)]/30'
                                                                }`} />
                                                            <input
                                                                id="output-password-confirm"
                                                                type={showOutputPassword ? 'text' : 'password'}
                                                                value={outputPasswordConfirm}
                                                                onChange={e => setOutputPasswordConfirm(e.target.value)}
                                                                placeholder="Repeat password…"
                                                                autoComplete="new-password"
                                                                className={`w-full bg-black/20 border rounded-xl py-3 pl-10 pr-4 text-[var(--text-color)] placeholder-[var(--text-color)]/25 text-sm focus:ring-2 outline-none transition-all font-mono tracking-wider ${passwordMismatch
                                                                    ? 'border-red-400/50 focus:ring-red-400/30'
                                                                    : outputPasswordConfirm.length > 0
                                                                        ? 'border-green-400/40 focus:ring-green-400/30'
                                                                        : 'border-white/10 focus:ring-amber-400/50 focus:border-amber-400/40'
                                                                    }`}
                                                            />
                                                        </div>
                                                        <AnimatePresence>
                                                            {passwordMismatch && (
                                                                <motion.p
                                                                    initial={{ opacity: 0, y: -4 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -4 }}
                                                                    className="text-xs text-red-400 mt-1.5 ml-1"
                                                                >
                                                                    Passwords don't match
                                                                </motion.p>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                    {/* Info note */}
                                                    <div className="flex items-start gap-2 bg-amber-400/5 rounded-xl p-3 border border-amber-400/10">
                                                        <AlertCircle className="w-3.5 h-3.5 text-amber-400/60 shrink-0 mt-0.5" />
                                                        <p className="text-[10px] text-[var(--text-color)]/50 leading-relaxed">
                                                            AES-256 encrypted. Keep this password safe — there is no recovery. The encrypted PDF should work in standard PDF viewers.
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                /* Teaser for free users */
                                <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-2xl p-4 opacity-60 cursor-not-allowed" title="Unlock with a paid pass">
                                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        <Lock className="w-4 h-4 text-[var(--text-color)]/30" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--text-color)]/40">Output Password Protection</p>
                                        <p className="text-xs text-[var(--text-color)]/25">Unlock with a paid pass</p>
                                    </div>
                                    <Crown className="w-4 h-4 text-amber-400/30 ml-auto shrink-0" />
                                </div>
                            )}

                            {workspaceMode === 'efiling' ? (
                                <>
                                    <motion.button
                                        onClick={handleProcess}
                                        disabled={isProcessing || (outputPasswordEnabled && (passwordMismatch || !outputPassword))}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active-scale disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {outputPasswordEnabled && !passwordMismatch && outputPassword
                                            ? <ShieldCheck className="w-5 h-5" />
                                            : <Zap className="w-5 h-5" />
                                        }
                                        {isProcessing ? 'Preparing output...' : 'Prepare Strict Upload Output'}
                                    </motion.button>
                                    <motion.button
                                        onClick={handleMergeOnly}
                                        disabled={isProcessing}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className="w-full py-3 bg-transparent border-2 border-[var(--glass-border)] hover:bg-white/5 text-[var(--text-color)] font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Merge only (no compression)
                                    </motion.button>
                                </>
                            ) : (
                                <>
                                    <motion.button
                                        onClick={handleProcess}
                                        disabled={isProcessing || (outputPasswordEnabled && (passwordMismatch || !outputPassword))}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active-scale disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {outputPasswordEnabled && !passwordMismatch && outputPassword
                                            ? <ShieldCheck className="w-5 h-5" />
                                            : <FileText className="w-5 h-5" />
                                        }
                                        {isProcessing ? 'Merging documents...' : 'Merge Documents'}
                                    </motion.button>
                                </>
                            )}
                        </div>

                        {/* Mode-specific info box */}
                        {workspaceMode === 'efiling' ? (
                            <div className="bg-[#10b981]/5 border border-[#10b981]/20 rounded-xl p-4 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-[#10b981] shrink-0" />
                                <div>
                                    <p className="text-xs text-[#10b981] font-bold uppercase mb-1 tracking-wider">Strict Upload Mode</p>
                                    <p className="text-xs text-[#10b981]/80 leading-relaxed">
                                        Your {files.length} document{files.length !== 1 ? 's' : ''} will be converted to black and white at 300 DPI, aimed at under {targetMB} MB per part, split into up to 20 files if needed, and saved with sequential filenames such as name-part-1.pdf. Acceptance still depends on the receiving platform.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                                <PenTool className="w-5 h-5 text-blue-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-blue-400 font-bold uppercase mb-1 tracking-wider">General Document Editing</p>
                                    <p className="text-xs text-blue-400/80 leading-relaxed">
                                        Your {files.length} document{files.length !== 1 ? 's' : ''} will be merged and edited normally, with original colour preserved where possible and no forced SARS compression or compatibility rules applied.
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {lockedFile && (
                <UnlockerModal
                    fileName={lockedFile.name}
                    isPremium={isPremium}
                    onCancel={() => {
                        setFiles(prev => prev.filter(f => f !== lockedFile));
                        setLockedFile(null);
                    }}
                    onUnlock={async (password) => {
                        try {
                            const decryptedBytes = await unlockEncryptedPdf(lockedFile, password);
                            const unlockedFile = new File([decryptedBytes as any], lockedFile.name, { type: 'application/pdf' });
                            setFiles(prev => prev.map(f => f === lockedFile ? unlockedFile : f));
                            setLockedFile(null);
                            toast.success(isPremium ? 'Password removed and file unlocked.' : 'File unlocked successfully.');
                        } catch (err: any) {
                            toast.error(err.message || "Incorrect password");
                        }
                    }}
                />
            )}
        </div>
    );
};
