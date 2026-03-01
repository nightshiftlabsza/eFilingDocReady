import { useState, useEffect } from 'react';
import './App.css';
import { readPremiumFlag, writePremiumFlag } from './lib/storage';
import { Header } from './components/Header';
import { FileWorkspace } from './components/FileWorkspace';
import { PricingModal } from './components/PricingModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ReceiptCard } from './components/ReceiptCard';
import { Toaster, toast } from 'react-hot-toast';
import { buildPurePdf, rasterizePdf, splitPdfIfNeeded } from './lib/pdf-generator';
import { motion, AnimatePresence } from 'framer-motion';
import { ConsentModal } from './components/ConsentModal';
import { PrivacyModal } from './components/PrivacyModal';
import { TaxpayerView } from './components/TaxpayerView';
import { PractitionerView } from './components/PractitionerView';

export default function App() {
    const [mode, setMode] = useState<'landing' | 'taxpayer-info' | 'practitioner-info' | 'workspace'>('landing');
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [persona, setPersona] = useState<'taxpayer' | 'practitioner' | null>(null);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [freeCredits, setFreeCredits] = useState<number>(() => {
        const saved = localStorage.getItem('dr_free_credits');
        if (saved === null) return 3;
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 3 : Math.max(0, parsed);
    });
    const [finalPdfUrls, setFinalPdfUrls] = useState<string[]>([]);
    const [fileSizes, setFileSizes] = useState<{ original: number; compressed: number; maxPartSize: number }>({ original: 0, compressed: 0, maxPartSize: 0 });
    const [resultIsSafe, setResultIsSafe] = useState(false);
    const [isConsentAccepted, setIsConsentAccepted] = useState<boolean>(() => {
        return localStorage.getItem('dr_consent_accepted') === 'true';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Read premium flag from IndexedDB + localStorage on mount
    useEffect(() => {
        readPremiumFlag().then(setIsPremium);
    }, []);

    const handleFilesReady = async (files: File[]) => {
        // Gating Check
        if (!isPremium && freeCredits <= 0) {
            toast.error("Free credits exhausted. Upgrade for SARS Optimization.");
            setIsPricingOpen(true);
            return;
        }

        setIsProcessing(true);
        const loadingToast = toast.loading("Phase 1: Native PDF Merge without quality loss...");

        try {
            // Phase 1: Native Merge Attempt (No Quality Loss)
            console.log("Phase 1: Attempting Native Merge");
            let pdfBytes = await buildPurePdf(files);
            const initialSize = pdfBytes.length; // More efficient than new Blob().size

            // Phase 2: Native merge exceeded 5 MB — Optimize for eFiling at 300 DPI.
            if (initialSize > 5 * 1024 * 1024) {
                if (!isPremium && freeCredits <= 0) {
                    toast.error("File exceeds 5MB. Credits required for Advanced Compression.", { id: loadingToast, duration: 4000 });
                    setIsPricingOpen(true);
                    setIsProcessing(false);
                    return;
                }

                console.log(`Native merge too large (${(initialSize / 1024 / 1024).toFixed(2)}MB). Triggering Phase 2: Adaptive 300 DPI Optimization.`);

                // Adaptive quality: try progressively lower JPEG quality at constant 300 DPI
                // before falling through to Phase 3 split. Source is always the native Phase 1 bytes.
                const phase1Bytes = pdfBytes;
                const qualitySteps = [0.7, 0.5, 0.35, 0.20, 0.15, 0.10, 0.07];
                for (let qi = 0; qi < qualitySteps.length; qi++) {
                    const quality = qualitySteps[qi];
                    toast.loading(`Phase 2: 300 DPI compression (pass ${qi + 1}/7, quality ${Math.round(quality * 100)}%)`, { id: loadingToast });
                    pdfBytes = await rasterizePdf(phase1Bytes, {
                        scale: 300 / 72,
                        jpegQuality: quality,
                        grayscale: true,
                        onProgress: (current, total) => {
                            toast.loading(`Phase 2 (pass ${qi + 1}/7, q${Math.round(quality * 100)}%): page ${current}/${total}`, { id: loadingToast });
                        },
                    });
                    if (pdfBytes.length <= 5 * 1024 * 1024) break;
                }
            }

            // Phase 3: Split if final result still > 5MB
            let finalOutputBytes = [pdfBytes];
            if (pdfBytes.length > 5 * 1024 * 1024) {
                console.log("Still > 5MB. Triggering Phase 3 Multi-Volume Split.");
                toast.loading("Size still exceeds limits. Chunking into Multi-Volume Parts...", { id: loadingToast });
                finalOutputBytes = await splitPdfIfNeeded(pdfBytes, 4.8 * 1024 * 1024);
            }

            const urls = finalOutputBytes.map(bytes => {
                const b = new Blob([bytes as any], { type: 'application/pdf' });
                return URL.createObjectURL(b);
            });

            const totalCompressedSize = finalOutputBytes.reduce((acc, bytes) => acc + bytes.length, 0);
            const maxPartSize = Math.max(...finalOutputBytes.map(b => b.length));
            const isSafe = finalOutputBytes.every(b => b.length <= 5 * 1024 * 1024);

            setResultIsSafe(isSafe);
            setFileSizes({
                original: files.reduce((acc, f) => acc + f.size, 0),
                compressed: totalCompressedSize,
                maxPartSize,
            });
            setFinalPdfUrls(urls);

            // Consume credit if work was done (Phase 2 or Phase 3 triggered)
            if (!isPremium && (initialSize > 5 * 1024 * 1024 || finalOutputBytes.length > 1)) {
                setFreeCredits(prev => {
                    const next = Math.max(0, prev - 1);
                    localStorage.setItem('dr_free_credits', next.toString());
                    return next;
                });
            }

            if (isSafe && urls.length > 1) {
                toast.success(`Ready! Split into ${urls.length} SARS-Safe volumes.`, { id: loadingToast, duration: 4000 });
            } else if (isSafe) {
                toast.success(`Ready! ${(totalCompressedSize / 1024 / 1024).toFixed(2)}MB (SARS-Safe).`, { id: loadingToast, duration: 4000 });
            } else {
                toast.error(`Warning: Part sizes still exceed 5MB.`, { id: loadingToast, duration: 6000 });
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Process failed. Try a different file.", { id: loadingToast, duration: 5000 });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (finalPdfUrls.length === 0) return;

        // Processing is already gated by credits in handleFilesReady.
        // If finalPdfUrls is populated the user has already paid — with a free
        // credit or a premium license. Allow the download unconditionally.
        finalPdfUrls.forEach((url, index) => {
            const link = document.createElement('a');
            link.href = url;
            // Sanitized filenames: SARS rejects ' and & characters
            link.download = finalPdfUrls.length > 1
                ? `DocReady_Part_${index + 1}_${Date.now()}.pdf`
                : `DocReady_Final_${Date.now()}.pdf`;
            link.click();
        });
        toast.success(finalPdfUrls.length > 1 ? "Downloaded all parts successfully!" : "Download Successful!");
    };

    return (
        <div className="app-container">
            <Toaster position="top-center" />
            <Header
                currentMode={mode}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onStartOver={() => {
                    setMode('landing');
                    setFinalPdfUrls([]);
                }}
            />

            <main className="content flex-grow">
                <AnimatePresence mode="wait">
                    {mode === 'landing' ? (
                        <motion.section
                            key="landing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex flex-col items-center justify-center min-h-[75vh] px-4 max-w-5xl mx-auto w-full"
                        >
                            <div className="text-center mb-12">
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold text-sm mb-6 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                >
                                    100% Client-Side Processing • SARS Optimized • POPIA Compliant • 3 Free Trials Included
                                </motion.div>
                                <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-4 tracking-tight leading-tight">
                                    SARS-Ready Documents. <br /> Zero Upload Friction.
                                </h1>
                                <p className="text-lg md:text-2xl opacity-70 max-w-2xl mx-auto">
                                    The only tool with <span className="text-blue-500 font-semibold italic inline-block px-1 border-b border-blue-500/30">Smart 4.9MB</span> target compression and SARS-compliant filename sanitization. Instant compliance for any upload. No account, no cloud, no risk.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
                                {/* Taxpayer Gateway */}
                                <div
                                    className="glass-panel p-10 flex flex-col items-start hover-lift cursor-pointer transition-all border border-[var(--glass-border)] hover:border-blue-500 active:scale-95"
                                    onClick={() => {
                                        setPersona('taxpayer');
                                        setMode('taxpayer-info');
                                    }}
                                >
                                    <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-8">
                                        <div className="w-6 h-6 bg-blue-500 rounded-sm"></div>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>I am a Taxpayer</h2>
                                    <p className="opacity-70 mb-8 flex-grow leading-relaxed text-sm">
                                        Combine and optimize IDs, receipts, and PDFs for any upload. Perfectly sized for the 5MB eFiling limit. Fast, private, zero-server processing.
                                    </p>
                                    <div className="text-blue-500 font-bold flex items-center gap-2 group">
                                        View Solutions <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>

                                {/* Practitioner Gateway */}
                                <div
                                    className="glass-panel p-10 flex flex-col items-start hover-lift cursor-pointer transition-all border border-[var(--glass-border)] hover:border-indigo-500 active:scale-95"
                                    onClick={() => {
                                        setPersona('practitioner');
                                        setMode('practitioner-info');
                                    }}
                                >
                                    <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mb-8">
                                        <div className="w-6 h-6 bg-indigo-500 rounded-sm"></div>
                                        <div className="w-6 h-6 bg-indigo-400 rounded-sm -ml-2 -mt-2 opacity-80"></div>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-color)' }}>I am a Practitioner</h2>
                                    <p className="opacity-70 mb-8 flex-grow leading-relaxed text-sm">
                                        Secure, POPIA-compliant folder management. Request, optimize, and organize client documents without data leaks.
                                    </p>
                                    <div className="text-indigo-500 font-bold flex items-center gap-2 group">
                                        Open Practitioner Hub <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            </div>
                            <footer className="mt-20 py-8 border-t border-[var(--glass-border)] w-full text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-sm font-semibold opacity-60 tracking-tight">
                                        DocReady: Private Document Optimization
                                    </p>
                                    <div className="flex items-center gap-4 opacity-40 text-[10px] uppercase tracking-widest font-bold">
                                        <span>POPIA Compliant</span>
                                        <span className="w-1 h-1 bg-current rounded-full" />
                                        <span>100% Client-Side</span>
                                        <span className="w-1 h-1 bg-current rounded-full" />
                                        <a href="mailto:support@docready.co.za" className="hover:text-primary transition-colors">Support</a>
                                    </div>
                                </div>
                            </footer>

                        </motion.section>
                    ) : mode === 'taxpayer-info' ? (
                        <TaxpayerView
                            onEnterWorkspace={() => setMode('workspace')}
                            onOpenPricing={() => setIsPricingOpen(true)}
                        />
                    ) : mode === 'practitioner-info' ? (
                        <PractitionerView
                            onEnterWorkspace={() => setMode('workspace')}
                            onOpenPricing={() => setIsPricingOpen(true)}
                        />
                    ) : (
                        <motion.div
                            key="workspace"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="workspace py-12 px-4 relative"
                        >
                            {finalPdfUrls.length === 0 ? (
                                <FileWorkspace
                                    onFilesReady={handleFilesReady}
                                    isProcessing={isProcessing}
                                />
                            ) : (
                                <ReceiptCard
                                    originalSize={fileSizes.original}
                                    compressedSize={fileSizes.compressed}
                                    maxPartSize={fileSizes.maxPartSize}
                                    onDownload={handleDownload}
                                    onRestart={() => setFinalPdfUrls([])}
                                    partCount={finalPdfUrls.length}
                                    isSafe={resultIsSafe}
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Modals & UI Overlays */}
            <SettingsDrawer
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onOpenPrivacy={() => setIsPrivacyOpen(true)}
                theme={theme}
                onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            />
            <PricingModal
                isOpen={isPricingOpen}
                onClose={() => setIsPricingOpen(false)}
                persona={persona}
                onSuccess={() => {
                    writePremiumFlag(true).then(() => {
                        setIsPremium(true);
                        setTimeout(handleDownload, 500);
                    });
                }}
            />

            <ConsentModal
                isOpen={!isConsentAccepted}
                onAccept={() => {
                    localStorage.setItem('dr_consent_accepted', 'true');
                    setIsConsentAccepted(true);
                }}
                onOpenPrivacy={() => setIsPrivacyOpen(true)}
            />

            <PrivacyModal
                isOpen={isPrivacyOpen}
                onClose={() => setIsPrivacyOpen(false)}
            />
        </div>
    );
}
