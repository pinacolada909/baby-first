# BabyFirst Development Tasks - Full Session Summary

## Project: BabyFirst (宝宝第一)
**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Supabase (auth + DB), Recharts
**Deployed at:** https://baby-first-iota.vercel.app/
**GitHub:** https://github.com/pinacolada909/baby-first

---

## Session 1 — Foundation Fixes & Email Summary (Feb 12, 2026)

### 1. Password Reset Flow Fix
**Issue:** Clicking the password reset email link logged the user in directly without prompting for a new password.
**Solution:** Detected `PASSWORD_RECOVERY` auth event in AuthContext, showed a modal to set new password.
**Files:** `AuthContext.tsx`, `UpdatePasswordModal.tsx` (new), `App.tsx`, translations

### 2. Feeding Tracker Form & Analytics Fix
**Issue:** Volume field hidden for Breastmilk; analytics showed counts instead of volume.
**Solution:** Always show Volume (mL); analytics chart shows total mL per time bucket.
**Files:** `FeedingTrackerPage.tsx`

### 3. Sleep Analytics Chart
**Issue:** No visualization for sleep patterns.
**Solution:** Bar chart with daily sleep hours, week/month toggle, green 14h reference line.
**Files:** `SleepTrackerPage.tsx`, translations

### 4. Daily Email Summary Feature
**Goal:** Send daily CSV email summaries at 8pm PST via Supabase Edge Function + Resend API.
**Files:** `supabase/functions/daily-summary/index.ts`, `useEmailPreferences.ts`, `EmailSettings.tsx`, translations
**Setup:** `email_preferences` table, Resend API key secret, `pg_cron` scheduling

---

## Session 2 — Join Flow & Shareable Invite Links (Feb 12, 2026)

### 5. Shareable Invite Link & /join Page
**What:** Created a dedicated `/join` route so caregivers can be invited via a shareable URL like `https://baby-first-iota.vercel.app/join?code=ABC123`.
**Files:** `JoinBabyPage.tsx` (new), `App.tsx` route, `CaregiverManager.tsx` (copy link button), translations

### 6. Join Flow Error Messages Fix
**Issue:** `redeem_invite` RPC returned 400 but the UI showed generic "Something went wrong" instead of the actual database error.
**Root Cause:** The RPC function worked correctly — it was the error *display* that was broken. PostgREST wraps DB `RAISE` exceptions as 400 responses, and the code wasn't parsing the specific message.
**Solution:** Parse `error.message` from the 400 response; added translated keys `join.error.invalidCode` and `join.error.alreadyMember`.
**Files:** `JoinBabyPage.tsx`, `CaregiverManager.tsx`, translations

---

## Session 3 — Unified Sign-Up & Activity Dashboard (Feb 13, 2026)

### 7. Unified Sign-Up Flow with Role Selection
**Goal:** Instead of separate sign-up → then setup, combine everything into one form. Users pick "New Baby" or "Join Existing Baby" during sign-up.

**Key Design Decision: localStorage Pending Action Pattern**
The challenge: sign-up creates an account but the session may not be immediately available (email confirmation required). The RPC calls (`create_baby_with_caregiver` or `redeem_invite`) need an authenticated session. Solution:
1. User fills sign-up form with role + baby name or invite code
2. `setPendingSignupAction()` saves the intended action to localStorage
3. `signUp()` creates the Supabase account
4. When session becomes available (immediate or after email confirmation), `usePendingSignupAction` hook detects the pending action, executes the RPC, and clears localStorage

**Files Created:**
- `src/hooks/usePendingSignupAction.ts` — localStorage pending action hook

**Files Modified:**
- `src/contexts/AuthContext.tsx` — `signUp` returns `{ error, confirmationRequired }` instead of error
- `src/components/auth/SignUpForm.tsx` — Role tabs + conditional fields (baby name / invite code)
- `src/components/layout/Layout.tsx` — Mounts `usePendingSignupAction` hook
- `src/pages/JoinBabyPage.tsx` — Passes `defaultRole` and `defaultInviteCode` props
- Translations (7 new keys each in en.ts / zh.ts)

### 8. Activity Dashboard (Replaces Time Management)
**Motivation:** The old Time Management page required manual time-block logging and didn't actually help balance caregiver workload. The new Activity Dashboard automatically aggregates existing tracking data.

**What it shows:**
- **Workload Summary Cards** — per-caregiver activity counts with colored borders
- **Workload Balance Bar** — horizontal stacked bar showing % split between caregivers
- **Activity Breakdown Chart** — Recharts grouped bar chart (feedings, diapers, sleep put-downs, household tasks)
- **Household Task Logger** — Quick-log grid with 9 task types + recent task history
- **Date Range Filter** — Today / This Week / This Month
- **Multi-caregiver support** — All components dynamically iterate over N caregivers (no hardcoded limit)
- **Demo mode** — 3 mock caregivers with sample data for unauthenticated visitors

**Household task types:** cooking, cleaning, laundry, doctor visit, shopping, bathing, sterilizing, playtime, other

**Files Created (7):**
- `src/pages/ActivityDashboardPage.tsx` — Main page composing all sections
- `src/hooks/useActivityDashboard.ts` — Aggregation hook (sleep/feeding/diaper/task data per caregiver)
- `src/components/dashboard/DateRangeFilter.tsx`
- `src/components/dashboard/WorkloadSummaryCards.tsx`
- `src/components/dashboard/WorkloadBalanceBar.tsx`
- `src/components/dashboard/ActivityBreakdownChart.tsx`
- `src/components/dashboard/HouseholdTaskLogger.tsx`

**Files Modified:**
- `src/types/index.ts` — Added TaskType values + `HOUSEHOLD_TASK_TYPES` constant
- `src/translations/en.ts` — Replaced `time.*` with `dashboard.*` keys (~27 new keys)
- `src/translations/zh.ts` — Matching Chinese translations
- `src/App.tsx` — Swapped `TimeManagementPage` → `ActivityDashboardPage`
- `src/components/settings/EmailSettings.tsx` — Removed email address display (user privacy)

**Files Deleted:**
- `src/pages/TimeManagementPage.tsx`
- `src/hooks/useTimeBlocks.ts`

**DB Migration (run in Supabase SQL Editor):**
```sql
ALTER TABLE public.care_tasks DROP CONSTRAINT care_tasks_task_type_check;
ALTER TABLE public.care_tasks ADD CONSTRAINT care_tasks_task_type_check
  CHECK (task_type IN (
    'change_diapers', 'feeding',
    'cooking', 'cleaning', 'laundry', 'doctor_visit', 'shopping',
    'bathing', 'sterilizing', 'playtime', 'other'
  ));
```

---

## Git Commit History (chronological)

| Hash | Message |
|------|---------|
| `4ae1a68` | Initial commit: BabyFirst baby tracking web app |
| `ceb27bb` | Fix unused variable errors breaking Vercel build |
| `5bd7a31` | Remove unused COLORS constant |
| `f1d6312` | Fix blank page on Vercel: add SPA rewrites and safe Supabase init |
| `8afa522` | Improve sign-up error handling and email confirmation detection |
| `16c559e` | Fix Vercel config: set framework, build command, and output dir |
| `26f8a8f` | Fix baby creation RLS error with atomic RPC function |
| `70a7bc1` | Show actual error message when baby creation fails |
| `a5d093b` | Add forgot password feature |
| `ae0ea6c` | Force rebuild to pick up RPC function changes |
| `132c56e` | Fix BabySelector to use RPC function for baby creation |
| `1e8eaac` | Add CaregiverManager to Time Management page |
| `f247193` | Add debug logging for CaregiverManager |
| `4f9c471` | Fix caregivers query - remove broken profiles join |
| `bce2225` | Remove debug console.log from CaregiverManager |
| `eab030d` | Add password update modal for reset flow |
| `d6d9826` | Fix feeding analytics chart |
| `71f4998` | Fix feeding form and analytics |
| `a5aeb3b` | Add sleep analytics chart to Sleep Tracker |
| `fadfc79` | Fix TypeScript error in Tooltip formatter |
| `21cf00a` | Add daily email summary feature |
| `80fdd98` | Trigger Vercel redeploy |
| `724bcca` | Add missing shadcn Switch component |
| `251ce20` | Fix daily email summary: add Switch component and Deno compatibility |
| `4f7c5ed` | Add shareable invite link and dedicated /join page |
| `651fe23` | Improve join flow error messages with specific translated errors |
| `cd7fd24` | Unified sign-up flow with role selection and automatic baby setup |
| `04808d5` | Replace Time Management with Activity Dashboard |
| `b92d8f2` | Fix unused import causing tsc build failure |

---

## Key Learnings & Debugging Methods

### Architecture Patterns

**1. localStorage Pending Action Pattern**
When an operation depends on auth state that isn't available yet (e.g., sign-up with email confirmation), write the intended action to localStorage, then execute it when the session becomes available via a global hook. This bridges async auth flows without losing user intent.

**2. Automatic Data Aggregation > Manual Logging**
The old Time Management page required manual time-block entry. The new Activity Dashboard derives workload data from *existing* tracking tables (`sleep_sessions`, `feedings`, `diaper_changes`) using their `caregiver_id` columns. Users naturally generate the data they need — just surface it.

**3. SECURITY DEFINER for RLS Chicken-and-Egg**
When you need to insert into a table whose RLS SELECT policy depends on data that doesn't exist yet (e.g., creating a baby + linking caregiver atomically), use an RPC function with `SECURITY DEFINER` to bypass RLS for the operation.

### Debugging Methods

**4. "Generic Error" → Always Surface Specific Messages**
When a Supabase RPC returns an error, `error.message` contains the actual `RAISE` text from the PostgreSQL function. Never show "Something went wrong" — parse and translate the specific message. PostgREST wraps DB exceptions as HTTP 400 with the message in the response body.

**5. Vercel Build ≠ Local `vite build`**
The Vercel build runs `tsc -b && vite build` (from `package.json`). `tsc -b` enforces `noUnusedLocals` and `noUnusedParameters` from `tsconfig.app.json`. Vite's build alone skips type-checking. **Always run `tsc -b` locally before pushing** to catch what Vercel will catch.

**6. Grep Before You Fix**
When fixing a database operation pattern (e.g., `.from('babies').insert()`), always grep the entire codebase for that pattern. There may be duplicate code paths in unexpected places (e.g., `useBabies.ts` AND `BabySelector.tsx` both had baby creation logic).

**7. Supabase Debugging Cheat Sheet**

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 403 on insert | RLS policy blocking | Use RPC with SECURITY DEFINER |
| 400 on query | Bad join syntax | Simplify select, avoid foreign key joins |
| 400 on RPC | DB function raising error | Parse `error.message` for specifics |
| Blank page on Vercel | Missing env vars or bad framework preset | Check Production env vars, set framework to Vite |
| Old code after deploy | Browser cache | Hard refresh (Cmd+Shift+R) |
| Build passes locally, fails on Vercel | `tsc -b` stricter than `vite build` | Run `tsc -b` locally before pushing |

### Translation System

**8. Bilingual Translation Workflow**
`en.ts` exports the `TranslationKey` type via `as const`. `zh.ts` must implement `Record<TranslationKey, string>`. When adding keys:
1. Add to `en.ts` first (defines the type)
2. Add matching keys to `zh.ts` (TypeScript enforces completeness)
3. Use `t('key.name')` in components via `useLanguage()`

### Vercel Deployment

**9. Vercel Environment Variable Gotchas**
- Must be set for the **Production** environment (not just Preview)
- Require a **redeploy** after changes (env vars are baked at build time)
- Use the full JWT anon key (`eyJ...`), not the short publishable key
- Framework preset must be set to **Vite**

---

## Current App Architecture

```
/                       → HomePage (landing page)
/questions              → QuestionsPage (Q&A center)
/sleep-tracker          → SleepTrackerPage (with analytics chart)
/diaper-tracker         → DiaperTrackerPage
/feeding-tracker        → FeedingTrackerPage (with volume analytics)
/time-management        → ActivityDashboardPage (workload dashboard)
/join?code=ABC123       → JoinBabyPage (invite link landing)
```

### Key Data Flows

```
Sign-Up Flow:
  User fills form → picks role (New Baby / Join Existing)
    → pending action saved to localStorage → signUp() creates account
    → session available → usePendingSignupAction executes RPC
    → baby created or invite redeemed → navigate to home

Activity Dashboard:
  Tracking data (sleep/feeding/diaper) → caregiver_id on each record
    → useActivityDashboard aggregates per caregiver per date range
    → dashboard components visualize workload balance

Household Tasks:
  User taps task button → care_tasks insert (completed=true, completed_at=now)
    → appears in recent tasks list + counted in dashboard totals
```

---

## Known Issues
- Supabase CLI cannot be installed via npm — use Homebrew: `brew install supabase/tap/supabase`
- JS bundle is >1MB (single chunk) — could benefit from code splitting via dynamic imports

---

## Pending / Future Ideas
- Code splitting for bundle size optimization
- Push notifications for shift handoffs
- Export data to CSV from the dashboard
- Growth tracking (weight/height charts)
- Night duty rotation planner
