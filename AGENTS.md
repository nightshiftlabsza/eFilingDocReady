# DocReady — Project Context for AI Coding Assistants

## What this app is
DocReady (docready.co.za) is a Progressive Web App (PWA) for South Africans to:
- Merge multiple PDFs and images into a single PDF
- Compress documents to meet SARS eFiling's strict 5 MB limit
- Export/share the compiled document for SARS eFiling

## Target domain
**docready.co.za** (deployed via Vercel at e-filing-doc-ready.vercel.app)

## Tech stack
- Pure HTML/CSS/JavaScript (no framework, no build step required)
- PDF-lib for PDF generation and merging
- pdf.js for PDF page rendering
- Paystack for premium unlock (R69 once-off payment)
- Cloudflare Worker (`cloudflare-worker.js`) for Paystack IPN verification
- Service Worker (`sw.js`) for PWA/offline support and Android share target

## File structure
- `index.html` — entire app (all UI + all logic in one file)
- `sw.js` — service worker (caching + share target POST handler)
- `cloudflare-worker.js` — Paystack IPN handler (deploy to Cloudflare Workers)
- `manifest.json` — PWA manifest (icons, share_target, file_handlers)
- `vercel.json` — static hosting config
- `docfit-tool/` — companion Python compression tool
- `.well-known/assetlinks.json` — Android TWA asset links

## Design system
- Mobile-first card layout, max-width 480px on mobile
- Desktop: sticky nav bar, two-column layout, scales up to 2400px+
- Color tokens (CSS variables):
  - `--primary: #154734` (dark forest green)
  - `--primary-hover: #0E3324`
  - `--accent: #CBA052` (warm gold)
  - `--bg: #F4F5F2` (light) / `#141615` (dark)
  - `--card: #FFFFFF` (light) / `#1F2220` (dark)
  - `--border: #E6E8E3` (light) / `#303431` (dark)
  - `--radius: 10px`
- Font: Outfit (Google Fonts, weights 300–600)
- Dark mode via `html.dark-mode` class, stored in localStorage as `docready-theme`
- Three theme modes: `light`, `dark`, `system`

## Premium / freemium model
- Free tier: merge-only (no compression), no size limit enforcement
- Premium (R69 once-off via Paystack): smart compression to any target size
- Unlock stored in localStorage as `docready-premium = '1'`
- Paystack public key: `pk_test_3520c14017518f98180b12907a3069d4916eac7c`

## Architecture rules (DO NOT CHANGE)
- Zero-server: no user data ever leaves the device
- All processing is client-side (PDF generation, compression, image resizing)
- No npm, no build step, no transpilation — plain ES5-compatible JavaScript
- Service worker cache name: `docready-v3`
- localStorage keys: `docready-theme`, `docready-premium`, `docready-ref`, `sars_recent_v1`

## DO NOT
- Add npm packages or a build system
- Introduce any framework (React, Vue, Next.js, etc.)
- Store user data on any server
- Improvise colors, fonts, or spacing — follow existing CSS variables strictly
- Change the Paystack integration without updating the Cloudflare Worker too
- Break offline/PWA functionality (always update sw.js cache version if assets change)
