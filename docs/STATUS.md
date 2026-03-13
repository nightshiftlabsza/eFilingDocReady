# DocReady V3 — Project Status

**Last updated:** 2026-02-28
**Stack:** React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + pdf-lib + pdfjs-dist
**Repo:** `nightshiftlabsza/eFilingDocReady` (primary branch: `master`)
**Working path:** `D:\Apps\DocReady`

---

## ✅ Implemented

| Feature | File | Notes |
|---------|------|-------|
| 3-phase PDF pipeline | `src/lib/pdf-generator.ts` | Phase 1 native merge → Phase 2 300 DPI rasterize → Phase 3 split |
| rasterizePdf (300 DPI) | `src/lib/pdf-generator.ts` | pdfjs-dist render → Rec.709 grayscale + 1.15× contrast → JPEG 0.7 |
| 11-pass Canvas compression | `src/lib/compression.ts` | scale 1.0–2.0×, quality 0.28–0.80, targets configurable MB limit |
| Encrypted PDF guard | `src/lib/pdf-generator.ts` | `PDFDocument.load(bytes, { ignoreEncryption: true })` |
| pdfjs worker (local) | `src/lib/pdf-generator.ts` | `import.meta.url` Vite-compatible worker URL |
| Filename sanitization | `src/lib/sanitize.ts` | Strips SARS-illegal chars: `' & < > / \ \| ? * :` |
| IndexedDB dual-write | `src/lib/storage.ts` | Survives DevTools "Clear site data"; falls back to localStorage |
| Paystack payment | `src/lib/paystack.ts` | `VITE_PAYSTACK_PUBLIC_KEY` env var; persona-based amounts |
| Persona-based pricing | `src/components/PricingModal.tsx` | R89 taxpayer / R499 practitioner season pass |
| Download gate | `src/App.tsx` | Non-premium → opens pricing modal |
| parseInt NaN fix | `src/App.tsx` | Guards against `"NaN"` localStorage string → defaults to 3 |
| isPremium from IDB | `src/App.tsx` | `useEffect` + `readPremiumFlag()` on mount |
| PWA manifest | `public/manifest.json` | `display: standalone`, `theme_color: #154734`, en-ZA |
| vite-plugin-pwa | `vite.config.ts` | `autoUpdate` service worker, caches js/css/html/png/woff2 |
| Persona gateways | `src/App.tsx` | Taxpayer / Practitioner landing cards |
| Footer branding | `src/App.tsx` | NightShift Labs ZA + nightshiftlabsza@gmail.com |
| POPIA language | `src/components/PractitionerView.tsx` | "POPIA-compliant" copy |
| Upgrade button removed | `src/components/Header.tsx` | Not present |
| Consent modal | `src/components/ConsentModal.tsx` | First-run POPIA consent gate |

---

## ❌ Known Gaps / TODO

| Item | Priority | Notes |
|------|----------|-------|
| **PWA icons** | HIGH | `public/icon-192.png` and `public/icon-512.png` missing — Lighthouse will fail installability |
| **Processing gate still active** | MEDIUM | Free users still gated at processing time; outcome gate (process free, gate download) not fully applied |
| **sanitize.ts not wired into pdf-generator** | LOW | `sanitizeFilename` exists but not called on input filenames before PDF embed |
| **Practitioner R299/month tier** | LOW | Spec mentions R299/month option; only R499 season pass implemented |
| **E2E tests** | LOW | No Playwright/Cypress tests; only unit tests via Vitest |

---

## Free Trial Logic

- **3 free credits** stored in `localStorage('dr_free_credits')`
- Credits consumed only when Phase 2 or Phase 3 triggers (i.e. file > 5MB or split needed)
- Pure Phase 1 merges (under 5MB, no rasterization) are always free
- Premium flag persisted to both `localStorage('docready-premium')` + IndexedDB (`docready-db/flags/isPremium`)
- IDB survives DevTools clear; localStorage is fast-path read on init

---

## Environment Variables

| Key | Required | Purpose |
|-----|----------|---------|
| `VITE_PAYSTACK_PUBLIC_KEY` | YES | Paystack inline popup public key |

Create a `.env` file in the project root (never commit it — it's in `.gitignore`):
```
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxx
```

---

## Build & Dev

```bash
# Install deps
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build (for PWA/SW testing)
npm run preview

# Type check + lint
npx tsc --noEmit
npm run lint
```

---

## SARS eFiling Constraints

- Max **5 MB** per file upload
- Max 20 files per upload session
- No password-protected PDFs
- Filenames must not contain: `'` `&` `<` `>` `/` `\` `|` `?` `*` `:`
- Accepted formats: PDF, JPG, PNG, GIF, BMP, DOC, DOCX, XLS, XLSX

---

## Architecture

```
src/
  App.tsx              — Root: mode routing, processing pipeline, gating
  lib/
    pdf-generator.ts   — 3-phase pipeline (merge → rasterize → split)
    compression.ts     — 11-pass canvas compression
    sanitize.ts        — SARS filename compliance
    storage.ts         — IndexedDB + localStorage dual-write for premium flag
    paystack.ts        — Payment popup wrapper
  components/
    Header.tsx
    FileWorkspace.tsx
    ReceiptCard.tsx
    PricingModal.tsx
    TaxpayerView.tsx
    PractitionerView.tsx
    SettingsDrawer.tsx
    ConsentModal.tsx
    PrivacyModal.tsx
public/
  manifest.json        — PWA manifest
  icon-192.png         — ⚠️ MISSING — add before deploying
  icon-512.png         — ⚠️ MISSING — add before deploying
docs/
  STATUS.md            — This file
```
