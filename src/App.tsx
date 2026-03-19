import { useState, useEffect } from 'react';
import './App.css';
import { readPremiumFlag, writePremiumFlag } from './lib/storage';
import { Header } from './components/Header';
import { FileWorkspace } from './components/FileWorkspace';
import { PricingModal } from './components/PricingModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ReceiptCard } from './components/ReceiptCard';
import { Toaster, toast } from 'react-hot-toast';
import { buildPurePdf, rasterizePdf, splitPdfIfNeeded, type SplitResult } from './lib/pdf-generator';
import { addPasswordToPdf } from './lib/lockPdf';
import { motion, AnimatePresence } from 'framer-motion';
import { ConsentModal } from './components/ConsentModal';
import { PrivacyModal } from './components/PrivacyModal';
import { TaxpayerView } from './components/TaxpayerView';
import { PractitionerView } from './components/PractitionerView';
import { LandingPage } from './components/LandingPage';

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
    const [resultWorkspaceMode, setResultWorkspaceMode] = useState<'efiling' | 'general'>('efiling');
    const [resultTruncated, setResultTruncated] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Routing: Synchronize state with history for back-button support
    useEffect(() => {
        // Handle initial hash if present
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            if (hash === 'taxpayer-info') {
                setMode('taxpayer-info');
                setPersona('taxpayer');
            } else if (hash === 'practitioner-info') {
                setMode('practitioner-info');
                setPersona('practitioner');
            } else if (hash.startsWith('workspace')) {
                setMode('workspace');
                // Persona is usually remembered if navigation was internal, 
                // but for fresh loads we'll just stay in workspace.
            }
        }

        // Initial state
        const initialState = { mode, persona, hasResults: finalPdfUrls.length > 0 };
        window.history.replaceState(initialState, '');

        const handlePopState = (event: PopStateEvent) => {
            if (event.state) {
                const { mode: nMode, persona: nPersona, hasResults } = event.state;
                setMode(nMode);
                setPersona(nPersona);
                if (!hasResults) setFinalPdfUrls([]);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigateTo = (newMode: typeof mode, newPersona: typeof persona = persona, hasResults: boolean = false) => {
        const nextState = { mode: newMode, persona: newPersona, hasResults };
        const hash = newMode === 'landing' ? '' : `#${newMode}${hasResults ? '-results' : ''}`;
        window.history.pushState(nextState, '', hash || window.location.pathname);
        setMode(newMode);
        setPersona(newPersona);
        if (!hasResults) setFinalPdfUrls([]);
    };

    // Sync Pro status from server + local fallback
    useEffect(() => {
        // Local fast path
        readPremiumFlag().then(localStatus => {
            if (localStatus) setIsPremium(true);
            
            // Server truth path
            fetch('/api/me')
                .then(res => res.json())
                .then(data => {
                    if (data.hasProAccess) {
                        setIsPremium(true);
                        writePremiumFlag(true); // Sync back to local storage
                    } else if (localStatus) {
                        // If server says no access but local says yes, 
                        // we might let local persist or override. 
                        // For now, let local be a fallback if offline.
                    }
                })
                .catch(err => {
                    console.error('Failed to sync Pro status:', err);
                });
        });
    }, []);

    const handleFilesReady = async (
        files: File[],
        mergeOnly: boolean = false,
        targetMB: number = 5,
        outputPassword?: string,
        workspaceMode: 'efiling' | 'general' = 'efiling',
        rotations: Record<string, number> = {},
    ) => {
        const isEfiling = workspaceMode === 'efiling';

        // Gating Check — compression credits only matter in eFiling mode
        if (isEfiling && !mergeOnly && !isPremium && freeCredits <= 0) {
            toast.error("You've used your free credits — upgrade to keep compressing.");
            setIsPricingOpen(true);
            return;
        }

        setIsProcessing(true);
        const loadingToast = toast.loading("Combining your documents…");
        const targetBytes = targetMB * 1024 * 1024;

        try {
            // Phase 1: Native Merge Attempt (No Quality Loss)
            if (import.meta.env.DEV) console.log("Phase 1: Attempting Native Merge");
            let pdfBytes = await buildPurePdf(files, rotations);
            const initialSize = pdfBytes.length;

            let finalOutputBytes = [pdfBytes];
            let splitTruncated = false;

            if (isEfiling && !mergeOnly) {
                // ── eFiling Pipeline ─────────────────────────────────────────
                // Phase 2: Forced B&W, 300 DPI, aggressive compression
                if (initialSize > targetBytes) {
                    if (!isPremium && freeCredits <= 0) {
                        toast.error(`This file is over ${targetMB} MB — unlock compression to continue.`, { id: loadingToast, duration: 4000 });
                        setIsPricingOpen(true);
                        setIsProcessing(false);
                        return;
                    }

                    if (import.meta.env.DEV) console.log(`Native merge too large (${(initialSize / 1024 / 1024).toFixed(2)}MB). Phase 2: 300 DPI B&W compression.`);

                    const phase1Bytes = pdfBytes;
                    const qualitySteps = [0.70, 0.50, 0.35, 0.20, 0.15, 0.10, 0.07, 0.05, 0.03];
                    for (let qi = 0; qi < qualitySteps.length; qi++) {
                        const quality = qualitySteps[qi];
                        toast.loading(`Shrinking your file… (step ${qi + 1} of 9)`, { id: loadingToast });
                        pdfBytes = await rasterizePdf(phase1Bytes, {
                            scale: 300 / 72,
                            jpegQuality: quality,
                            grayscale: true,
                            onProgress: (current, total) => {
                                toast.loading(`Shrinking your file… page ${current} of ${total}`, { id: loadingToast });
                            },
                        });
                        if (pdfBytes.length <= targetBytes) break;
                    }
                }

                // Phase 3: Split if still over target (max 20 parts for SARS)
                finalOutputBytes = [pdfBytes];
                if (pdfBytes.length > targetBytes) {
                    if (import.meta.env.DEV) console.log(`Still > ${targetMB}MB. Phase 3: Multi-Volume Split (max 20 parts).`);
                    toast.loading("Almost there — splitting into upload-ready parts…", { id: loadingToast });
                    const splitResult = await splitPdfIfNeeded(pdfBytes, targetBytes * 0.9, 20);
                    finalOutputBytes = splitResult.parts;
                    splitTruncated = splitResult.truncated;
                }
            } else if (!isEfiling && !mergeOnly) {
                // ── General Editing Pipeline ─────────────────────────────────
                // No forced compression, no forced grayscale, no splitting.
                // Just native merge (already done above).
                // Future: optional user-requested compression can go here.
            }

            // Apply output password if set (premium feature)
            if (outputPassword) {
                toast.loading('Encrypting output PDF…', { id: loadingToast });
                finalOutputBytes = await Promise.all(
                    finalOutputBytes.map(bytes => addPasswordToPdf(bytes, outputPassword))
                );
            }

            const urls = finalOutputBytes.map(bytes => {
                const b = new Blob([bytes as any], { type: 'application/pdf' });
                return URL.createObjectURL(b);
            });

            const totalCompressedSize = finalOutputBytes.reduce((acc, bytes) => acc + bytes.length, 0);
            const maxPartSize = Math.max(...finalOutputBytes.map(b => b.length));
            const isSafe = isEfiling
                ? finalOutputBytes.every(b => b.length <= targetBytes)
                : true; // General mode has no size constraint

            setResultIsSafe(isSafe);
            setResultWorkspaceMode(workspaceMode);
            setResultTruncated(splitTruncated);
            setFileSizes({
                original: files.reduce((acc, f) => acc + f.size, 0),
                compressed: totalCompressedSize,
                maxPartSize,
            });
            setFinalPdfUrls(urls);
            window.history.pushState({ mode, persona, hasResults: true }, '', '#workspace-results');

            if (mergeOnly || !isEfiling) {
                toast.success(
                    isEfiling
                        ? "Done! Files merged — no compression applied."
                        : `Done! Documents merged (${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB).`,
                    { id: loadingToast, duration: 4000 },
                );
            } else {
                // Consume credit if compression was triggered
                if (!isPremium && (initialSize > targetBytes || finalOutputBytes.length > 1)) {
                    setFreeCredits(prev => {
                        const next = Math.max(0, prev - 1);
                        localStorage.setItem('dr_free_credits', next.toString());
                        return next;
                    });
                }

                if (splitTruncated) {
                    toast.error(`Split into ${urls.length} parts (SARS max 20). The last part may exceed ${targetMB} MB.`, { id: loadingToast, duration: 6000 });
                } else if (isSafe && urls.length > 1) {
                    toast.success(`Done! Saved as ${urls.length} parts — each ready to upload to eFiling.`, { id: loadingToast, duration: 4000 });
                } else if (isSafe) {
                    toast.success(`Done! Your file is ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB and ready for SARS eFiling.`, { id: loadingToast, duration: 4000 });
                } else {
                    toast.error(`Heads up: one or more parts may still be over ${targetMB} MB. Try uploading anyway.`, { id: loadingToast, duration: 6000 });
                }
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Something went wrong. Please try again with a different file.", { id: loadingToast, duration: 5000 });
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
            <Toaster
                position="top-center"
                toastOptions={{
                    style: { fontSize: '15px', maxWidth: '460px', padding: '14px 20px', fontWeight: 500 },
                    loading: { duration: Infinity },
                    success: { duration: 4000 },
                    error: { duration: 6000 },
                }}
            />
            <Header
                currentMode={mode}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenPricing={() => setIsPricingOpen(true)}
                onStartOver={() => {
                    navigateTo('landing', null, false);
                }}
            />

            <main className="content flex-grow">
                <AnimatePresence mode="wait">
                    {mode === 'landing' ? (
                        <LandingPage
                            onSelectTaxpayer={() => navigateTo('taxpayer-info', 'taxpayer')}
                            onSelectPractitioner={() => navigateTo('practitioner-info', 'practitioner')}
                            onViewPricing={() => setIsPricingOpen(true)}
                        />
                    ) : mode === 'taxpayer-info' ? (
                        <TaxpayerView
                            onEnterWorkspace={() => navigateTo('workspace')}
                            onOpenPricing={() => setIsPricingOpen(true)}
                        />
                    ) : mode === 'practitioner-info' ? (
                        <PractitionerView
                            onEnterWorkspace={() => navigateTo('workspace')}
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
                                    isPremium={isPremium}
                                />
                            ) : (
                                <ReceiptCard
                                    originalSize={fileSizes.original}
                                    compressedSize={fileSizes.compressed}
                                    maxPartSize={fileSizes.maxPartSize}
                                    onDownload={handleDownload}
                                    onRestart={() => navigateTo('workspace', persona, false)}
                                    partCount={finalPdfUrls.length}
                                    isSafe={resultIsSafe}
                                    workspaceMode={resultWorkspaceMode}
                                    truncated={resultTruncated}
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
