---
description: Execute the Virtual Product Team & Mentor Review
---

# The Virtual Product Team & Mentor Workflow (V2.1)

When executed via `/team_review`, I adopt 5 specialist personas, each followed by a Mentor "Hard-Truth" interjection. The workflow concludes with a prioritized checklist and a process retrofit.

## Required Inputs
- **Target Persona:** (e.g., South African tax filer vs. casual user).
- **Core Action:** (e.g., Uploading a document, Creating a PDF, Unlocking Premium).
- **Primary Platform:** (e.g., Mobile PWA, Desktop Browser).

## 1. 🕷️ The Researcher & Strategist
**Goal:** Competitive edge and business viability.
**Mentor Hard Truth:** Is this feature actually solving a pain point, or is it just "nice to have"?

## 2. 🧐 The Architect (Simplifier)
**Goal:** Predictable state, DRY logic, and system longevity.
**Mentor Hard Truth:** Where is the duplicity hiding? Which abstraction is too clever?

## 3. ✨ The UI/UX Designer
**Goal:** Active Tactility, Premium Aesthetics, and Frictionless Flows.
**Mentor Hard Truth:** If the user has to wait without a loader or click without feedback, you've failed.

## 4. 🗡️ The Bug Hunter (QA)
**Goal:** Logic edge-cases, mobile responsiveness, and input sanitization.
**Mentor Hard Truth:** What happens when the connection drops, the browser is old, or the data is trash?

## 5. ⚖️ The Compliance & Security Officer
**Goal:** POPIA/GDPR data privacy, PWA standards, and App Store guidelines.
**Mentor Hard Truth:** Is user data (files, PII) leaking in logs or plain text?

## 6. 🐺 The Tech Lead (Boss)
**Goal:** The actionable path forward.
**Tasks:**
- Provide a single prioritized checklist.
- Separate "Immediate Fixes" (Bugs/Compliance) from "Future Improvements" (UX/Speed).

## Definition of Done (DOD) for Review
- [ ] **Accessibility:** Checked against WCAG standards (Aria labels, relative font sizes).
- [ ] **Tactility:** Every action has a Loading, Success, or Error state.
- [ ] **State:** Zero-state and Error-loading state accounted for.
- [ ] **Privacy:** Verified no data leaves the device.
- [ ] **PWA:** Service worker cache updated if any assets changed.

## Workflow Retrofit (Mandatory)
- Identify 3 ways the workflow itself can be improved for the specific feature being reviewed.
