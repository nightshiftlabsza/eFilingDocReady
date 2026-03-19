import React from 'react';
import { Shield, Lock, Zap, CheckCircle, ArrowRight, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
    onSelectTaxpayer: () => void;
    onSelectPractitioner: () => void;
    onViewPricing: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectTaxpayer, onSelectPractitioner, onViewPricing }) => {
    const scrollToPersona = () => {
        document.getElementById('persona-select')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="landing-v2">
            {/* Hero Section */}
            <section className="hero-v2 py-20 md:py-32 px-4 container mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="mb-10 flex justify-center">
                        <motion.img
                            src="/logo.svg"
                            alt="DocReady Logo"
                            className="w-24 h-24 md:w-32 md:h-32 shadow-2xl rounded-3xl"
                            initial={{ scale: 0.8, rotate: -5 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        />
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold uppercase tracking-wider mb-8">
                        <img src="/logo.svg" className="w-4 h-4" alt="" />
                        100% Private. Secure Processing. Fast & Easy.
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.05] tracking-tight">
                        Professional Documents.<br />
                        <span className="text-emerald-500">Zero Upload Friction.</span>
                    </h1>
                    <p className="text-xl md:text-2xl opacity-70 max-w-3xl mx-auto mb-12 leading-relaxed">
                        Compress, merge, and optimize your documents — everything runs directly on your device. Your sensitive files never leave your computer. No cloud, no uploads, no risk.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={scrollToPersona}
                            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-900/40"
                        >
                            Get Started <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onViewPricing}
                            className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-lg border border-white/10 transition-all"
                        >
                            View Pricing
                        </button>
                    </div>
                    <p className="mt-6 text-sm opacity-50 font-medium">
                        3 free optimizations included. No credit card required.
                    </p>
                </motion.div>
            </section>

            {/* Why Choose Section */}
            <section className="why-choose py-20 px-4 bg-black/20">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose DocReady?</h2>
                        <p className="text-lg opacity-60">Built for South African taxpayers and professionals</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <div className="feature-card-v2 p-10 rounded-3xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all hover:translate-y-[-8px]">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 text-emerald-500 border border-emerald-500/20">
                                <Lock className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">100% Private</h3>
                            <p className="opacity-60 leading-relaxed">
                                All processing happens on your device. We never access, store, or upload your documents.
                            </p>
                        </div>

                        <div className="feature-card-v2 p-10 rounded-3xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all hover:translate-y-[-8px]">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 text-emerald-500 border border-emerald-500/20">
                                <Shield className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Secure Processing</h3>
                            <p className="opacity-60 leading-relaxed">
                                Built with data protection in mind. Your sensitive information stays private and local.
                            </p>
                        </div>

                        <div className="feature-card-v2 p-10 rounded-3xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all hover:translate-y-[-8px]">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 text-emerald-500 border border-emerald-500/20">
                                <Zap className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Fast & Efficient</h3>
                            <p className="opacity-60 leading-relaxed">
                                Optimized compression and processing. Get your documents ready quickly and easily.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Choose Your Path — Dual-Audience Gateway */}
            <section id="persona-select" className="perfect-for py-32 px-4 container mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Choose Your Path</h2>
                    <p className="text-xl opacity-60">Whether you're filing your taxes or managing client documents</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Taxpayer Card */}
                    <div
                        onClick={onSelectTaxpayer}
                        className="group p-10 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-blue-500/10"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 text-blue-500 border border-blue-500/20">
                            <CheckCircle className="w-7 h-7" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4">I am a Taxpayer</h3>
                        <p className="text-base opacity-60 mb-8 leading-relaxed">
                            Combine IDs, receipts, and PDFs into a single, optimized file. Perfectly sized for the 5MB eFiling limit.
                        </p>
                        <ul className="space-y-4 mb-10">
                            {[
                                "Combine multiple documents into one optimized file",
                                "Automatically targets 4.9MB for SARS eFiling",
                                "Strip passwords from bank statements",
                                "Process everything offline, no account needed"
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm opacity-70 leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-blue-500/70">From R29</span>
                            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all group-hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20">
                                Continue as Taxpayer <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Practitioner Card */}
                    <div
                        onClick={onSelectPractitioner}
                        className="group p-10 rounded-3xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-indigo-500/10"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-8 text-indigo-500 border border-indigo-500/20">
                            <Users className="w-7 h-7" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4">I am a Practitioner</h3>
                        <p className="text-base opacity-60 mb-8 leading-relaxed">
                            Recover billable time and standardize your firm's document preparation. Secure, private, and built for scale.
                        </p>
                        <ul className="space-y-4 mb-10">
                            {[
                                "Manage client documents securely and privately",
                                "Automate document preparation for multiple clients",
                                "Standardize naming and organization across the firm",
                                "Save hours weekly on admin tasks"
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm opacity-70 leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-indigo-500/70">From R399/yr</span>
                            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all group-hover:scale-105 active:scale-95 shadow-lg shadow-indigo-900/20">
                                Continue as Practitioner <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="bottom-cta py-32 px-4 container mx-auto text-center border-t border-white/5">
                <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight max-w-4xl mx-auto">
                    Ready to Simplify Your Document Prep?
                </h2>
                <p className="text-xl opacity-60 mb-12 max-w-xl mx-auto">
                    Start with 3 free optimizations. No credit card required. Private and secure.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={onSelectTaxpayer}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/20"
                    >
                        I'm a Taxpayer
                    </button>
                    <button
                        onClick={onSelectPractitioner}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-900/20"
                    >
                        I'm a Practitioner
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer-v2 py-20 px-4 bg-black/40 border-t border-white/10">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                        <div className="flex flex-col gap-6">
                            <h4 className="font-bold text-lg">Product</h4>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Features</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); onViewPricing(); }} className="opacity-50 hover:opacity-100 transition-opacity">Pricing</a>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Security</a>
                        </div>
                        <div className="flex flex-col gap-6">
                            <h4 className="font-bold text-lg">Company</h4>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">About</a>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Blog</a>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Contact</a>
                        </div>
                        <div className="flex flex-col gap-6">
                            <h4 className="font-bold text-lg">Legal</h4>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Privacy Policy</a>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Terms of Service</a>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">POPIA Notice</a>
                        </div>
                        <div className="flex flex-col gap-6">
                            <h4 className="font-bold text-lg">Support</h4>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Help Center</a>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Contact Support</a>
                            <a href="#" className="opacity-50 hover:opacity-100 transition-opacity">Status Page</a>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 opacity-40 text-sm">
                        <p>&copy; 2026 DocReady. All rights reserved.</p>
                        <div className="flex items-center gap-6 mt-4 md:mt-0">
                            <span>Private by Design</span>
                            <span className="w-1 h-1 bg-white rounded-full"></span>
                            <span>Local by Choice</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
