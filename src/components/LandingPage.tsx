import React from 'react';
import { ArrowRight, FileCheck, Lock, Scissors, Shield, SplitSquareVertical, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { LEGAL_LINKS, SUPPORTED_FILE_TYPES, SUPPORT_EMAIL } from '../lib/site';

interface LandingPageProps {
    onSelectTaxpayer: () => void;
    onSelectPractitioner: () => void;
    onViewPricing: () => void;
}

const featureCards = [
    {
        title: 'Merge supported files',
        description: 'Combine PDFs and supported images into one PDF without uploading them to a server.',
        icon: FileCheck,
    },
    {
        title: 'Shrink oversized outputs',
        description: 'Compress toward strict upload limits and auto-split large outputs when one file is still too big.',
        icon: SplitSquareVertical,
    },
    {
        title: 'Optional password tools',
        description: 'Add a password to the final PDF or remove a password from an incoming PDF when you know it.',
        icon: Lock,
    },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectTaxpayer, onSelectPractitioner, onViewPricing }) => {
    return (
        <div className="landing-v2">
            <section className="hero-v2 py-20 md:py-28 px-4 container mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-6xl mx-auto"
                >
                    <div className="mb-6 flex justify-center">
                        <motion.img
                            src="/logo.svg"
                            alt="DocReady Logo"
                            className="w-24 h-24 md:w-28 md:h-28 shadow-2xl rounded-3xl"
                            initial={{ scale: 0.8, rotate: -5 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        />
                    </div>

                    <div className="hero-badge-row">
                        <span className="hero-badge">South Africa only</span>
                        <span className="hero-badge">Files processed in your browser</span>
                        <span className="hero-badge">Not affiliated with SARS</span>
                    </div>

                    <div className="text-center max-w-5xl mx-auto">
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.02] tracking-tight">
                            Prepare supporting documents
                            <br />
                            <span>for strict upload limits.</span>
                        </h1>
                        <p className="hero-copy text-xl md:text-2xl max-w-4xl mx-auto mb-10 leading-relaxed">
                            DocReady helps South African taxpayers and practitioners merge supported files, shrink oversized outputs,
                            split large PDFs, and optionally add or remove passwords. Your files stay on your device while you work.
                        </p>
                    </div>

                    <div className="hero-trust-grid">
                        <div className="hero-trust-item">
                            <Shield className="w-5 h-5" />
                            <span>Private in-browser processing</span>
                        </div>
                        <div className="hero-trust-item">
                            <Scissors className="w-5 h-5" />
                            <span>No upload guarantee claims</span>
                        </div>
                        <div className="hero-trust-item">
                            <Users className="w-5 h-5" />
                            <span>One taxpayer offer and one practitioner offer</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                        <button
                            onClick={onSelectTaxpayer}
                            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-900/20"
                        >
                            Start as Taxpayer <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onSelectPractitioner}
                            className="hero-secondary-button w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg border transition-all"
                        >
                            Start as Practitioner
                        </button>
                    </div>

                    <p className="mt-6 text-sm hero-footnote font-medium text-center">
                        Free launch scope: merge into one PDF. Paid passes unlock compression, auto-splitting, and password tools.
                    </p>
                </motion.div>
            </section>

            <section className="why-choose py-20 px-4">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">What DocReady Actually Does</h2>
                        <p className="text-lg why-choose-copy">Focused launch scope built for document preparation, not for fake enterprise packaging.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {featureCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div key={card.title} className="feature-card-v2 p-10 rounded-3xl hover:translate-y-[-8px]">
                                    <div className="feature-icon-wrap">
                                        <Icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4">{card.title}</h3>
                                    <p className="feature-copy">{card.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="py-16 px-4 container mx-auto">
                <div className="glass-panel rounded-3xl p-8 md:p-10 max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-bold mb-3">Supported file types</p>
                            <h2 className="text-3xl font-black mb-4">Only the formats we support right now.</h2>
                            <p className="text-[var(--text-color)]/70 mb-6">
                                Launch scope is intentionally narrow. DocReady currently supports only the file types listed here.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {SUPPORTED_FILE_TYPES.map((type) => (
                                    <span key={type} className="px-4 py-2 rounded-full bg-white/10 text-sm font-semibold text-[var(--text-color)]">
                                        {type}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold mb-3">Important note</p>
                            <ul className="space-y-3 text-[var(--text-color)]/75">
                                <li>DocReady is not affiliated with SARS.</li>
                                <li>DocReady does not guarantee that any platform will accept an upload.</li>
                                <li>Payment and account actions use secure third-party services.</li>
                                <li>Support email is currently a placeholder config: {SUPPORT_EMAIL}.</li>
                            </ul>
                            <button
                                onClick={onViewPricing}
                                className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/15 text-[var(--text-color)] rounded-2xl font-semibold transition-colors"
                            >
                                View Launch Pricing
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section id="persona-select" className="perfect-for py-20 px-4 container mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Choose the view that fits your work</h2>
                    <p className="text-xl persona-section-copy">Both paths use the same private browser-based engine. The difference is the wording and pass that fit your use case.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <button onClick={onSelectTaxpayer} className="group persona-card persona-card-taxpayer text-left">
                        <div className="persona-icon persona-icon-taxpayer">
                            <FileCheck className="w-7 h-7" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4">I am a Taxpayer</h3>
                        <p className="persona-card-copy">
                            Prepare your own supporting documents with one straightforward once-off pass if you need the premium tools.
                        </p>
                        <div className="flex items-center justify-between mt-8">
                            <span className="text-sm font-bold text-blue-500/70">Taxpayer Pass: R49 once-off</span>
                            <span className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Continue</span>
                        </div>
                    </button>

                    <button onClick={onSelectPractitioner} className="group persona-card persona-card-practitioner text-left">
                        <div className="persona-icon persona-icon-practitioner">
                            <Users className="w-7 h-7" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4">I am a Practitioner</h3>
                        <p className="persona-card-copy">
                            Prepare client supporting documents with one once-off pass for one practitioner or one office user.
                        </p>
                        <div className="flex items-center justify-between mt-8">
                            <span className="text-sm font-bold text-indigo-500/70">Practitioner Pass: R399 once-off</span>
                            <span className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm">Continue</span>
                        </div>
                    </button>
                </div>
            </section>

            <footer className="footer-v2 py-16 px-4 border-t">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex flex-wrap gap-4 justify-center mb-8">
                        {LEGAL_LINKS.map((link) => (
                            <a key={link.href} href={link.href} className="opacity-70 hover:opacity-100 transition-opacity">
                                {link.label}
                            </a>
                        ))}
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 opacity-60 text-sm">
                        <p>&copy; 2026 DocReady. Independent document preparation tool for South Africa.</p>
                        <p className="mt-3 md:mt-0">Not affiliated with SARS.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
