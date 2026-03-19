# DocReady — Project Context for AI Coding Assistants

## What this app is
DocReady (docready.co.za) is a Progressive Web App (PWA) for South Africans to:
- Merge multiple PDFs and images into a single PDF
- Compress documents to meet SARS eFiling's strict 5 MB limit
- General document editing (merge, rotate, password add/remove)
- Export/share the compiled document for SARS eFiling or general use

## Target domain
**docready.co.za** (deployed via Vercel at e-filing-doc-ready.vercel.app)

## Tech stack
- React 19 + TypeScript (Vite build system)
- Tailwind CSS 4.0 + Framer Motion for animations
- @cantoo/pdf-lib for PDF generation, merging, encryption
- pdfjs-dist for PDF page rendering and thumbnails
- react-dropzone for file upload
- react-hot-toast for notifications
- lucide-react for icons
- Paystack (@paystack/inline-js) for premium payments
- Service Worker (`sw.js`) for PWA/offline support and Android share target
- Cloudflare Worker (`cloudflare-worker.js`) for Paystack IPN verification

## File structure
- `index.html` — Vite SPA root
- `src/main.tsx` — React entry point
- `src/App.tsx` — Main app shell, routing, processing pipeline
- `src/App.css` — Global styles + CSS variables
- `src/components/` — React components:
  - `LandingPage.tsx` — Hero + dual-audience gateway
  - `TaxpayerView.tsx` — Taxpayer onboarding info
  - `PractitionerView.tsx` — Practitioner onboarding info
  - `FileWorkspace.tsx` — File upload, preview, reorder, mode toggle, processing controls
  - `ReceiptCard.tsx` — Results display with download
  - `Header.tsx` — Navigation bar
  - `PricingModal.tsx` — Payment tiers + Paystack integration
  - `SettingsDrawer.tsx` — Theme toggle, privacy settings
  - `ConsentModal.tsx` — Privacy consent
  - `PrivacyModal.tsx` — Full privacy policy
  - `UnlockerModal.tsx` — Password removal prompt
- `src/lib/` — Core logic:
  - `pdf-generator.ts` — Merge (buildPurePdf), rasterize (300 DPI), split (max 20 parts)
  - `lockPdf.ts` — AES-256 output encryption
  - `unlockPdf.ts` — Password removal (ignoreEncryption + password fallback)
  - `sanitizer.ts` — SARS-safe filename sanitization
  - `storage.ts` — localStorage + IndexedDB dual-write for premium flag
  - `paystack.ts` — Paystack payment launcher
- `api/` — Vercel serverless functions:
  - `me.ts` — Session/premium status check
  - `webhooks/paystack.ts` — Payment entitlement
  - `auth/magic-link/` — Magic link request + consume
- `sw.js` — Service worker (caching + share target POST handler)
- `cloudflare-worker.js` — Paystack IPN handler
- `manifest.json` — PWA manifest
- `docfit-tool/` — Companion Python compression tool (not used in web app)

## Dual processing modes
The app has TWO distinct workspace modes with different pipeline behavior:

### eFiling mode (SARS compliance)
- Forced grayscale (B&W)
- Forced 300 DPI rasterization
- Forced <5MB per part
- Auto-split into max 20 files
- Aggressive 9-pass JPEG compression

### General editing mode
- Color preserved (no rasterization)
- No forced size limits
- Native lossless merge
- No splitting
- Optional password protection

## Premium / freemium model
- Free tier: 3 free compression credits, unlimited merge-only
- Premium tiers via Paystack:
  - Taxpayer: R29 (pay-as-you-go, 5 bundles) or R199/yr (unlimited)
  - Practitioner: R399-R2,499/yr (firm licensing)
- Unlock stored in localStorage `docready-premium` + IndexedDB (dual-write)
- Magic-link email auth for license restoration
- Server session via HTTP-only cookie `sess` (30-day)

## Architecture rules
- Zero-server processing: no user data ever leaves the device
- All PDF processing is client-side (merge, compress, encrypt)
- Server only stores: premium flag, payment records, magic-link tokens
- Service worker cache name: `docready-v6`
- localStorage keys: `docready-premium`, `dr_free_credits`, `dr_consent_accepted`, `dr_eb_count`, `data-theme`

## DO NOT
- Store user documents on any server
- Improvise colors, fonts, or spacing — follow existing CSS variables and Tailwind classes
- Change the Paystack integration without updating payment webhook handling
- Break offline/PWA functionality (always update sw.js cache version if assets change)
- Remove the dual-write premium storage (localStorage + IndexedDB)
