# DocReady — To-Do List

## Backend / Infrastructure

- [ ] **Replace localStorage early bird counter with a real backend count.**
  The current `dr_eb_count` key in `localStorage` (seeded at 23) is cosmetic only — it increments locally per device and does not reflect actual purchases across users. Once a backend or Paystack webhook is in place, replace `getEarlyBirdCount()` / `claimEarlyBirdSlot()` in `src/components/PricingModal.tsx` with a real API call to a shared counter (e.g. a KV store, Supabase row, or Paystack event count).
