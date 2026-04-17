import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Header } from './components/Header';
import { FileWorkspace } from './components/FileWorkspace';
import { PricingModal } from './components/PricingModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ReceiptCard } from './components/ReceiptCard';
import { Toaster, toast } from 'react-hot-toast';
import { buildPurePdf, rasterizePdf, splitPdfIfNeeded } from './lib/pdf-generator';
import { addPasswordToPdf } from './lib/lockPdf';
import { motion, AnimatePresence } from 'framer-motion';
import { ConsentModal } from './components/ConsentModal';
import { PrivacyModal } from './components/PrivacyModal';
import { TaxpayerView } from './components/TaxpayerView';
import { PractitionerView } from './components/PractitionerView';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { apiFetchJson } from './lib/api';
import { getCurrentBrowserSession, signInWithMagicLink, signOutBrowserSession, subscribeToAuthChanges } from './lib/browserAuth';
import type { AccountResponse, PaymentStatusResponse } from './types/account';
import { LegalPage } from './components/LegalPage';

const DEFAULT_OUTPUT_BASENAME = 'docready-document';

const EMPTY_ACCOUNT: AccountResponse = {
    authenticated: false,
    email: null,
    persona: null,
    activePlan: null,
    hasPremiumAccess: false,
    source: 'server',
};

function toSafeOutputBasename(filename?: string) {
    if (!filename) return DEFAULT_OUTPUT_BASENAME;

    const withoutExtension = filename.replace(/\.[^.]+$/, '');
    const normalized = withoutExtension.normalize('NFKD').replace(/[^\u0020-\u007E]/g, '');
    const kebabCase = normalized
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return kebabCase || DEFAULT_OUTPUT_BASENAME;
}

function parseHomeMode(hash: string) {
    if (hash === '#taxpayer-info') {
        return { mode: 'taxpayer-info' as const, persona: 'taxpayer' as const };
    }
    if (hash === '#practitioner-info') {
        return { mode: 'practitioner-info' as const, persona: 'practitioner' as const };
    }
    if (hash.startsWith('#workspace')) {
        return { mode: 'workspace' as const, persona: null };
    }
    return { mode: 'landing' as const, persona: null };
}

function PaymentCallbackPage({
    status,
    loading,
    error,
    onGoHome,
    onOpenWorkspace,
}: {
    status: PaymentStatusResponse | null;
    loading: boolean;
    error: string | null;
    onGoHome: () => void;
    onOpenWorkspace: () => void;
}) {
    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="glass-panel rounded-3xl p-8 md:p-10 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-bold mb-3">Payment callback</p>
                <h1 className="text-4xl font-black text-[var(--text-color)] mb-4">
                    {loading ? 'Verifying your payment…' : status?.entitlementReady ? 'Your pass is ready' : 'Payment update'}
                </h1>
                <p className="text-[var(--text-color)]/70 mb-8">
                    {loading
                        ? 'DocReady is confirming the payment with the backend.'
                        : error
                            ? error
                            : status?.entitlementReady
                                ? 'Server-side verification is complete. You can now use the premium document tools.'
                                : 'The payment has not been confirmed yet. Try again or return home.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {status?.entitlementReady && (
                        <button onClick={onOpenWorkspace} className="btn-primary py-4 px-8 text-lg">
                            Open Workspace
                        </button>
                    )}
                    <button onClick={onGoHome} className="btn-secondary py-4 px-8 text-lg">
                        Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    const [mode, setMode] = useState<'landing' | 'taxpayer-info' | 'practitioner-info' | 'workspace'>(() => parseHomeMode(window.location.hash).mode);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [persona, setPersona] = useState<'taxpayer' | 'practitioner' | null>(() => parseHomeMode(window.location.hash).persona);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [finalPdfUrls, setFinalPdfUrls] = useState<string[]>([]);
    const [fileSizes, setFileSizes] = useState<{ original: number; compressed: number; maxPartSize: number }>({ original: 0, compressed: 0, maxPartSize: 0 });
    const [resultIsSafe, setResultIsSafe] = useState(false);
    const [outputBaseName, setOutputBaseName] = useState(DEFAULT_OUTPUT_BASENAME);
    const [isConsentAccepted, setIsConsentAccepted] = useState<boolean>(() => localStorage.getItem('dr_consent_accepted') === 'true');
    const [resultWorkspaceMode, setResultWorkspaceMode] = useState<'efiling' | 'general'>('efiling');
    const [resultTruncated, setResultTruncated] = useState(false);
    const [authEmail, setAuthEmail] = useState<string | null>(null);
    const [accountState, setAccountState] = useState<AccountResponse>(EMPTY_ACCOUNT);
    const [guestPaymentState, setGuestPaymentState] = useState<PaymentStatusResponse | null>(null);
    const [accountRefreshKey, setAccountRefreshKey] = useState(0);
    const [currentPath, setCurrentPath] = useState(window.location.pathname);
    const [currentSearch, setCurrentSearch] = useState(window.location.search);
    const [paymentCallbackLoading, setPaymentCallbackLoading] = useState(false);
    const [paymentCallbackError, setPaymentCallbackError] = useState<string | null>(null);

    const legalPage = useMemo(() => {
        const route = currentPath.slice(1);
        if (route === 'terms' || route === 'privacy' || route === 'refunds' || route === 'contact' || route === 'popia' || route === 'paia') {
            return route;
        }
        return null;
    }, [currentPath]);

    const isPaymentCallbackRoute = currentPath === '/payment/callback';
    const isPremium = accountState.hasPremiumAccess || guestPaymentState?.hasPremiumAccess === true;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const handlePopState = () => {
            const homeState = parseHomeMode(window.location.hash);
            setCurrentPath(window.location.pathname);
            setCurrentSearch(window.location.search);
            setMode(homeState.mode);
            setPersona(homeState.persona);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadInitialSession = async () => {
            try {
                const session = await getCurrentBrowserSession();
                if (!isMounted) return;
                const nextEmail = session?.user.email?.trim().toLowerCase() ?? null;
                setAuthEmail(nextEmail);

                if (window.location.pathname === '/auth/callback' && session) {
                    window.history.replaceState(window.history.state, '', '/');
                    setCurrentPath('/');
                    setCurrentSearch('');
                    toast.success('Signed in successfully.');
                }
            } catch {
                if (isMounted) {
                    setAuthEmail(null);
                }
            }
        };

        void loadInitialSession();

        const { data } = subscribeToAuthChanges((session) => {
            const nextEmail = session?.user.email?.trim().toLowerCase() ?? null;
            setAuthEmail(nextEmail);

            if (!session) {
                setAccountState(EMPTY_ACCOUNT);
            }
        });

        return () => {
            isMounted = false;
            data.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const syncAccountState = async () => {
            if (!authEmail) {
                if (!cancelled) {
                    setAccountState(EMPTY_ACCOUNT);
                }
                return;
            }

            try {
                const account = await apiFetchJson<AccountResponse>('/api/account');
                if (!cancelled) {
                    setAccountState(account);
                }
            } catch {
                if (!cancelled) {
                    setAccountState({
                        ...EMPTY_ACCOUNT,
                        authenticated: true,
                        email: authEmail,
                    });
                }
            }
        };

        void syncAccountState();

        return () => {
            cancelled = true;
        };
    }, [authEmail, accountRefreshKey]);

    useEffect(() => {
        if (!isPaymentCallbackRoute) {
            setPaymentCallbackLoading(false);
            setPaymentCallbackError(null);
            return;
        }

        const reference = new URLSearchParams(currentSearch).get('reference');
        if (!reference) {
            setPaymentCallbackError('No payment reference was returned by Paystack.');
            return;
        }

        let cancelled = false;
        setPaymentCallbackLoading(true);
        setPaymentCallbackError(null);

        void (async () => {
            try {
                const status = await apiFetchJson<PaymentStatusResponse>('/api/payments/verify', {
                    method: 'POST',
                    body: JSON.stringify({ reference }),
                });
                if (cancelled) return;
                setGuestPaymentState(status);
                if (status.entitlementReady) {
                    toast.success('Payment verified successfully.');
                    if (authEmail) {
                        setAccountRefreshKey((value) => value + 1);
                    }
                }
            } catch (error) {
                if (cancelled) return;
                setPaymentCallbackError(error instanceof Error ? error.message : 'Payment verification failed.');
            } finally {
                if (!cancelled) {
                    setPaymentCallbackLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authEmail, currentSearch, isPaymentCallbackRoute]);

    const navigateToRootMode = (nextMode: typeof mode, nextPersona: typeof persona = persona, hasResults = false) => {
        const hash = nextMode === 'landing' ? '' : `#${nextMode}${hasResults ? '-results' : ''}`;
        window.history.pushState({}, '', `/${hash}`);
        setCurrentPath('/');
        setCurrentSearch('');
        setMode(nextMode);
        setPersona(nextPersona);
        if (!hasResults) {
            setFinalPdfUrls([]);
        }
    };

    const goHome = () => {
        navigateToRootMode('landing', null, false);
    };

    const requestMagicLink = async (email: string) => {
        const { error } = await signInWithMagicLink(email.trim().toLowerCase());
        if (error) {
            throw new Error(error.message);
        }
    };

    const handleLogout = async () => {
        const { error } = await signOutBrowserSession();
        if (error) {
            toast.error(error.message);
            return;
        }

        setAccountState(EMPTY_ACCOUNT);
        setAuthEmail(null);
        toast.success('You have been signed out.');
    };

    const handleFilesReady = async (
        files: File[],
        mergeOnly = false,
        targetMB = 5,
        outputPassword?: string,
        workspaceMode: 'efiling' | 'general' = 'efiling',
        rotations: Record<string, number> = {},
    ) => {
        const isEfiling = workspaceMode === 'efiling';

        if (isEfiling && !mergeOnly && !isPremium) {
            toast.error('Compression and auto-splitting are part of the paid passes.');
            setIsPricingOpen(true);
            return;
        }

        setIsProcessing(true);
        const loadingToast = toast.loading('Combining your documents…');
        const targetBytes = targetMB * 1024 * 1024;
        const nextOutputBaseName = toSafeOutputBasename(files[0]?.name);

        try {
            let pdfBytes = await buildPurePdf(files, rotations);
            const initialSize = pdfBytes.length;

            let finalOutputBytes = [pdfBytes];
            let splitTruncated = false;

            if (isEfiling && !mergeOnly) {
                if (initialSize > targetBytes) {
                    const phase1Bytes = pdfBytes;
                    const qualitySteps = [0.7, 0.5, 0.35, 0.2, 0.15, 0.1, 0.07, 0.05, 0.03];
                    for (let index = 0; index < qualitySteps.length; index += 1) {
                        const quality = qualitySteps[index];
                        toast.loading(`Shrinking your file… step ${index + 1} of ${qualitySteps.length}`, { id: loadingToast });
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

                finalOutputBytes = [pdfBytes];
                if (pdfBytes.length > targetBytes) {
                    toast.loading('Almost there — splitting into smaller parts…', { id: loadingToast });
                    const splitResult = await splitPdfIfNeeded(pdfBytes, targetBytes * 0.9, 20);
                    finalOutputBytes = splitResult.parts;
                    splitTruncated = splitResult.truncated;
                }
            }

            if (outputPassword) {
                toast.loading('Protecting output PDF…', { id: loadingToast });
                finalOutputBytes = await Promise.all(
                    finalOutputBytes.map((bytes) => addPasswordToPdf(bytes, outputPassword)),
                );
            }

            const urls = finalOutputBytes.map((bytes) => {
                const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
                return URL.createObjectURL(blob);
            });

            const totalCompressedSize = finalOutputBytes.reduce((acc, bytes) => acc + bytes.length, 0);
            const maxPartSize = Math.max(...finalOutputBytes.map((bytes) => bytes.length));
            const isSafe = isEfiling
                ? finalOutputBytes.every((bytes) => bytes.length <= targetBytes)
                : true;

            setResultIsSafe(isSafe);
            setResultWorkspaceMode(workspaceMode);
            setResultTruncated(splitTruncated);
            setOutputBaseName(nextOutputBaseName);
            setFileSizes({
                original: files.reduce((acc, file) => acc + file.size, 0),
                compressed: totalCompressedSize,
                maxPartSize,
            });
            setFinalPdfUrls(urls);
            window.history.pushState({}, '', '/#workspace-results');

            if (mergeOnly || !isEfiling) {
                toast.success('Done! Your files were merged into one PDF.', { id: loadingToast, duration: 4000 });
            } else if (splitTruncated) {
                toast.error(`Done, but the output hit the 20-part cap. The last part may still be over ${targetMB} MB.`, { id: loadingToast, duration: 6000 });
            } else if (isSafe && urls.length > 1) {
                toast.success(`Done! Saved as ${urls.length} parts.`, { id: loadingToast, duration: 4000 });
            } else if (isSafe) {
                toast.success('Done! Your output was prepared locally.', { id: loadingToast, duration: 4000 });
            } else {
                toast.error(`Done, but one or more parts may still be over ${targetMB} MB. DocReady does not guarantee acceptance.`, { id: loadingToast, duration: 6000 });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Something went wrong. Please try again with a different file.';
            toast.error(message, { id: loadingToast, duration: 5000 });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (finalPdfUrls.length === 0) return;

        finalPdfUrls.forEach((url, index) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = finalPdfUrls.length > 1
                ? `${outputBaseName}-part-${index + 1}.pdf`
                : `${outputBaseName}.pdf`;
            link.click();
        });
        toast.success(finalPdfUrls.length > 1 ? 'Downloaded all parts successfully.' : 'Download successful.');
    };

    if (legalPage) {
        return <LegalPage page={legalPage} onGoHome={goHome} />;
    }

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
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onLogout={() => { void handleLogout(); }}
                onStartOver={goHome}
                isAuthenticated={accountState.authenticated}
                accountEmail={authEmail}
            />

            <main className="content flex-grow">
                {isPaymentCallbackRoute ? (
                    <PaymentCallbackPage
                        status={guestPaymentState}
                        loading={paymentCallbackLoading}
                        error={paymentCallbackError}
                        onGoHome={goHome}
                        onOpenWorkspace={() => navigateToRootMode('workspace', guestPaymentState?.activePlan?.persona ?? persona, false)}
                    />
                ) : (
                    <AnimatePresence mode="wait">
                        {mode === 'landing' ? (
                            <LandingPage
                                onSelectTaxpayer={() => navigateToRootMode('taxpayer-info', 'taxpayer')}
                                onSelectPractitioner={() => navigateToRootMode('practitioner-info', 'practitioner')}
                                onViewPricing={() => setIsPricingOpen(true)}
                            />
                        ) : mode === 'taxpayer-info' ? (
                            <TaxpayerView
                                onEnterWorkspace={() => navigateToRootMode('workspace', 'taxpayer')}
                                onOpenPricing={() => setIsPricingOpen(true)}
                            />
                        ) : mode === 'practitioner-info' ? (
                            <PractitionerView
                                onEnterWorkspace={() => navigateToRootMode('workspace', 'practitioner')}
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
                                        onRestart={() => navigateToRootMode('workspace', persona, false)}
                                        partCount={finalPdfUrls.length}
                                        isSafe={resultIsSafe}
                                        workspaceMode={resultWorkspaceMode}
                                        truncated={resultTruncated}
                                    />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </main>

            <SettingsDrawer
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onOpenPrivacy={() => setIsPrivacyOpen(true)}
                theme={theme}
                onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            />

            <PricingModal
                isOpen={isPricingOpen}
                onClose={() => setIsPricingOpen(false)}
                persona={persona}
                email={authEmail ?? undefined}
                isAuthenticated={accountState.authenticated}
                onRequestMagicLink={requestMagicLink}
            />

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onRequestMagicLink={requestMagicLink}
                initialEmail={authEmail ?? undefined}
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
