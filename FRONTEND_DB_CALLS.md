# Frontend Page Database Calls

This document summarizes how the listed frontend pages access the database, which tables they call, and the parameters used. All database access here uses the Supabase client via `createClient()` on the client side.

## Seed Customer IDs (Non-Support Pages)

These are the seed dataset customer IDs used across all non-support pages.

- Sarah Chen — `11111111-1111-1111-1111-111111111111`
- Mohammed Ali — `22222222-2222-2222-2222-222222222222`
- Emma Wilson — `33333333-3333-3333-3333-333333333333`
- Raj Patel — `44444444-4444-4444-4444-444444444444`
- Fatima Hassan — `55555555-5555-5555-5555-555555555555`

## Accounts (`app/(dashboard)/accounts/page.tsx`)

- `accounts` (SELECT `*`)
  - Filter: `user_id = currentBankingUserId`
- `transactions` (SELECT `*`)
  - Filter: `account_id IN accountIds`
  - Sort: `order("date", { ascending: false })`

## Admin (`app/(dashboard)/admin/page.tsx`)

- `policies` (SELECT `*`)
  - Filter: `is_active = true`

## Cards (`app/(dashboard)/cards/page.tsx`)

- `cards` (SELECT `*`)
  - Filter: `user_id = currentBankingUserId`

## Home (`app/(dashboard)/home/page.tsx`)

- No database calls. Content is rendered from static/mock data and local state.

## Investments (`app/(dashboard)/investments/page.tsx`)

- `portfolio_holdings` (SELECT `*`)
  - Filter: `user_id = currentBankingUserId`

## Investments Category (`app/(dashboard)/investments/[category]/page.tsx`)

- `portfolio_holdings` (SELECT `*`)
  - Filter: `user_id = currentBankingUserId`
  - Post-filter: client-side filter by `config.dbTypes` (no additional DB filter)
- Non-DB: Market data fetched via `/api/market-data?symbol=...`

## Loans (`app/(dashboard)/loans/page.tsx`)

- `loans` (SELECT `*`)
  - Filter: `user_id = currentBankingUserId`
- `loan_products` (SELECT `*`)
  - Filter: `is_active = true`

## Marketplace (`app/(dashboard)/marketplace/page.tsx`)

- No database calls. Marketplace catalog is defined inline in the page.

## Rewards (`app/(dashboard)/rewards/page.tsx`)

- `reward_profiles` (SELECT `*`)
  - Filter: `user_id = currentBankingUserId`
  - Modifier: `.single()`
- `reward_catalog` (SELECT `*`)
  - Sort: `order("points_cost", { ascending: true })`
- `reward_activities` (SELECT `*`)
  - Filter: `user_id = currentBankingUserId`
  - Sort: `order("created_at", { ascending: false })`
  - Limit: `limit(10)`
- `reward_activities` (INSERT)
  - Values: `user_id`, `amount`, `type`, `category`, `description`
- RPC: `deduct_points`
  - Params: `p_user_id`, `p_amount`
- Fallback update if RPC fails:
  - `reward_profiles` (UPDATE)
  - Update: `total_points = profile.totalPoints - item.pointsCost`
  - Filter: `user_id = currentBankingUserId`
- Refresh activities after redemption:
  - `reward_activities` (SELECT `*`)
  - Filter: `user_id = currentUser?.id`
  - Sort: `order("created_at", { ascending: false })`
  - Limit: `limit(10)`
