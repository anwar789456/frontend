# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200 (proxies API to local gateway)
npm run build      # Production build
npm test           # Unit tests with Vitest
npm run watch      # Build in watch mode
npm run serve:ssr:minolingo-frontend  # Run SSR Express server
```

## Architecture

**Minolingo** is an e-learning platform built with **Angular 21** using standalone components (no NgModules). All components use the modern standalone pattern with `imports` arrays instead of shared modules.

### Routing & Role-Based Access

Three distinct role paths enforced by guards in [src/app/shared/guards/](src/app/shared/guards/):
- `authGuard` — requires a valid session token
- `guestGuard` — redirects authenticated users away from login/register
- `roleGuard` — splits routing between `ADMIN`, `TUTEUR`, and `ETUDIANT`

Route structure in [src/app/app.routes.ts](src/app/app.routes.ts):
- `/admin/**` → lazy-loaded admin module
- `/tutor/**` → lazy-loaded tutor module  
- `/user/**` → lazy-loaded student module (default for `ETUDIANT` role)

### State Management

No centralized state library. State is managed via:
- **RxJS BehaviorSubjects** in service classes for shared reactive state
- **localStorage** for auth session persistence (token + user object)
- Component-local state for UI concerns

### API Integration

- Base URL: `/api` (configured per service for local Docker/Nginx proxying)
- Local dev uses [proxy.conf.json](proxy.conf.json) to forward `/api` requests to the local gateway
- Pattern: `HttpClient` injected into service classes returning `Observable<T>`
- Auth token attached manually per request in service methods (no HTTP interceptor)

### Feature Structure

Each feature module follows this pattern:
```
feature/
  models/       # TypeScript interfaces
  services/     # API communication (HttpClient calls)
  pages/        # Route-level components
  components/   # Sub-components used within pages
  *.routes.ts   # Lazy-loaded route definitions
```

### Shared Infrastructure

[src/app/shared/](src/app/shared/) contains:
- `services/auth.service.ts` — login (email/password, face recognition, Google OAuth), token management, logout with server session invalidation
- `services/avatar.service.ts` — AI avatar state
- `components/face-recognition/` — biometric auth component
- `components/ai-avatar/` — AI avatar display (current branch: `ai-avatar-base`)
- `components/layout/` + `components/sidebar/` — main app shell

### Key Third-Party Integrations

- **Stripe** (`@stripe/stripe-js`) — subscription payments in `src/app/user/subscription/`
- **Chart.js** — analytics dashboards in admin module
- **Leaflet** — maps
- **html5-qrcode** — QR scanning

### SSR

The app supports Server-Side Rendering via `@angular/ssr` + Express. Entry points: [src/main.server.ts](src/main.server.ts) and [src/server.ts](src/server.ts). SSR output goes to `dist/minolingo-frontend/server/server.mjs`.
