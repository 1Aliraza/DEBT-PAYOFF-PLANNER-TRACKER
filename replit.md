# DebtFree - Payoff Planner & Tracker

A comprehensive debt management app built with Expo React Native and Express backend.

## Architecture

- **Frontend**: Expo Router (React Native) with file-based routing
- **Backend**: Express.js (TypeScript) serving REST API
- **State**: React Context + AsyncStorage for local persistence
- **Database**: PostgreSQL (Neon-backed) via `pg` Pool
- **Styling**: React Native StyleSheet with dark/light mode support

## App Structure

```
app/
  _layout.tsx     - Root layout with AppNavigator (onboarding gate)
  onboarding.tsx  - 3-step onboarding flow (value prop → add debt → payoff reveal)
  (tabs)/
    index.tsx       - Debts tab: add, edit, delete, view debts
    strategy.tsx    - Strategy tab: Snowball, Avalanche, Custom with comparison
    plan.tsx        - Payoff Plan tab: month-by-month amortization
    dashboard.tsx   - Dashboard tab: progress, what-if, CTA cards

components/
  DebtForm.tsx    - Rebuilt add/edit debt form (type picker, validation, haptics)
  LeadForm.tsx    - Lead capture form (CTA conversion)
  CTACards.tsx    - Revenue trigger cards (5 triggers)
  ProgressRing.tsx - Animated SVG progress ring
  KeyboardAwareScrollViewCompat.tsx - Cross-platform keyboard-aware scroll

context/
  DebtContext.tsx - Global debt state + calculations + onboardingDone flag

lib/
  calculations.ts - Pure JS calculation engine (Snowball/Avalanche/Custom)

server/
  routes.ts       - Lead API endpoints, PostgreSQL persistence
```

## Features

- **Onboarding**: 3-step first-run flow that adds first debt and shows payoff date
- **4 Tabs**: Debts, Strategy, Payoff Plan, Dashboard
- **Calculation Engine**: Avalanche, Snowball, Custom strategies with full amortization
- **CTA System**: 5 revenue triggers (settlement, tax, high APR, multiple cards, missed payment)
- **Lead Form**: Collects contact info, stored persistently in PostgreSQL
- **What-If Scenarios**: Extra payment and lump sum simulation
- **Progress Tracking**: Payment logging, progress ring
- **Dark/Light Mode**: Full support

## Color Theme

- Primary: #2ECC71 (Emerald Green)
- Primary Dark: #27AE60
- Accent: #1ABC9C
- Danger: #E74C3C
- Warning: #F39C12

## Backend Endpoints

- `POST /api/leads` - Submit a lead (persistent PostgreSQL storage)
- `GET /api/leads` - List all leads (admin, last 100)
- `GET /api/leads/count` - Count total leads

## Database Schema

- `leads` table: id, first_name, last_name, email, phone, consent, debt_type, approximate_amount, call_time, state, trigger_type, created_at

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (provisioned automatically)
- `WEBHOOK_URL` (optional) - Forward leads to CRM/webhook
- `EXPO_PUBLIC_DOMAIN` - App domain for API calls
