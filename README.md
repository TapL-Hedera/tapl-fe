# Tapl Frontend

Tapl frontend is a React + TypeScript + Vite application for the Tapl trading game on **Hedera Testnet**.

## What This App Includes

- Intro dashboard and workflow entry
- Trading interface
- Wallet deposit/withdraw flow
- Trade history view
- HCS Anchor view
- LP page shell (coming soon, currently unavailable)

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- wagmi + viem
- TanStack Query
- react-router-dom

## Network

- Chain: Hedera Testnet (`id: 296`)
- Native asset: `HBAR`
- RPC: `https://testnet.hashio.io/api`

## API

Frontend currently calls:

- `https://api-tap-fun-hedera.nysm.work`

(defined in `src/constant/index.tsx`)

## Routes

- `/` - Intro
- `/trade` - Trading
- `/history` - History
- `/wallet` - Wallet
- `/hcs-anchor` - HCS Anchor
- `/lp` - LP (coming soon)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start dev server

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Type-check and build
- `npm run preview` - Preview built app
- `npm run lint` - Run ESLint
- `npm run generate:api` - Regenerate API client with Orval

## Notes

- The LP feature is intentionally disabled for now and marked as coming soon in the UI.
- Wallet connection/sign-in is required for most app actions.
