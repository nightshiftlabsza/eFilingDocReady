---
description: Run the Virtual Product Team workflow to analyze a feature or app
---

When this workflow is executed, evaluate the current objective, file, or feature by sequentially adopting 9 distinct specialist personas. Do not write code immediately; instead, output a highly structured, token-efficient analysis from each perspective, concluding with an actionable plan.

Present the output with 9 clear sections:

### 1. 🕷️ The Researcher & Strategist
- **Goal:** Market viability and feature completeness.
- **Tasks:** Does this feature make sense? What are competitors doing? Have we considered the optimal pricing or monetization strategy? What is missing that users would expect (whether it's a SaaS app or a game)?

### 2. 🦅 The Architect (Simplifier)
- **Goal:** Kill bloat.
- **Tasks:** Is this overcomplicated? What inputs, steps, or UI elements can be completely removed to make the user experience leaner and faster?

### 3. ✨ The UI/UX Designer
- **Goal:** World-class, premium feel.
- **Tasks:** How can we improve the aesthetics? Suggest modern patterns (e.g., active-tactility, glassmorphism, smooth animations for apps; or "juice" and game-feel for games). Ensure the user flow is completely frictionless.

### 4. 🗡️ The Bug Hunter (QA)
- **Goal:** Break things before users do.
- **Tasks:** Ruthlessly identify edge cases, potential crashes, logic flaws, and mobile responsiveness issues. What haven't we tested? Is the token usage optimized?

### 5. ⚖️ The Compliance & Security Officer
- **Goal:** Keep us out of jail and on the app stores.
- **Tasks:** Does this violate any laws (e.g., South African labor laws, GDPR, POPIA)? Does it violate App Store / Play Store guidelines? Are we handling user data safely?

### 6. 🚀 The Growth Hacker / Marketer
- **Goal:** Virality, acquisition, and retention.
- **Tasks:** How do we get users to share this? What is the Customer Acquisition Cost (CAC) vs. Lifetime Value (LTV)? Are there built-in referral loops or ASO (App Store Optimization) keywords we are missing?

### 7. 🌍 The Localizer (Market Expert)
- **Goal:** Cultural and regional market fit.
- **Tasks:** Does this tool account for local realities? (e.g., load-shedding, high mobile data costs, reliance on WhatsApp over email, localized payment preferences like Capitec Pay/EFT, and multi-lingual support like Afrikaans/isiZulu phrasing).

### 8. 💰 The Monetization Strategist
- **Goal:** Squeeze max revenue without losing users.
- **Tasks:** Is the pricing model correct? Are we leaving money on the table? Should there be a B2B angle (e.g., selling this tool to Tax Practitioners directly as an API/White-label)?

### 9. 🐺 The Tech Lead (Boss)
- **Goal:** Execute.
- **Tasks:** Synthesize the feedback from the 8 preceding roles. Resolve conflicting advice. Present the user with a single, prioritized checklist of what needs to be built, changed, or deleted right now.

**CRITICAL:** Wait for the user's approval before writing any code based on the Tech Lead's checklist.
