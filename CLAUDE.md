# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyNook is a location review & discovery system built with **Nx monorepo** + **NestJS microservices** + **Next.js** frontend.

## Architecture

- **api-gateway** (port 3000): the ONLY public HTTP entry point, prefixed `/api`. Forwards requests to microservices via HTTP (`@nestjs/axios`).
- **4 microservices** (auth:3001, venue:3002, interaction:3003, search-ai:3004): NestJS HTTP apps, internal only (not exposed publicly in production).
- **web-client**: Next.js 16 App Router frontend.
- Inter-service async events use RabbitMQ via `@mynook/rmq-messaging` (production).

## Commands

```bash
# Serve all apps
npx nx run-many -t serve

# Serve single app
npx nx serve api-gateway
npx nx dev web-client

# Build
npx nx run-many -t build
npx nx build <app-name>

# Typecheck
npx nx run-many -t typecheck

# Dependency graph
npx nx graph

# List all projects
npx nx show projects
```

## Package Installation

All packages install at the **root** — never `cd` into an app directory.

```bash
npm install <package>        # runtime dependency
npm install -D <package>     # dev dependency
npx shadcn@latest add <component> --cwd apps/web-client  # shadcn UI
```

## Shared Libraries

| Library | Import path | Purpose |
|---------|------------|---------|
| shared-types | `@mynook/shared-types` | Enums (UserRole, VenueCategory, BookingStatus), interfaces (IUser, IVenue, IReview), service URL constants (AUTH_SERVICE_URL, VENUE_SERVICE_URL, etc.) |
| database | `@mynook/database` | DB connection config, entity schemas |
| rmq-messaging | `@mynook/rmq-messaging` | `RmqModule.register()` for RabbitMQ client/server setup |

## Key Conventions

- API Gateway communicates with microservices via HTTP REST using `@nestjs/axios` (HttpService).
- Service URL constants are defined in `@mynook/shared-types` (AUTH_SERVICE_URL, VENUE_SERVICE_URL, etc.), configurable via environment variables.
- Each microservice is a standard NestJS HTTP app with its own port.
- TypeScript strict mode is enabled. Module resolution is `nodenext`.
- Nx workspace uses `@nx/js/typescript`, `@nx/next/plugin`, and `@nx/webpack/plugin` inferred targets.

## Port Assignments

| Service | Port | Transport |
|---------|------|-----------|
| web-client | 3000 (dev) | HTTP |
| api-gateway | 3000 | HTTP REST |
| auth-service | 3001 | HTTP |
| venue-service | 3002 | HTTP |
| interaction-service | 3003 | HTTP |
| search-ai-service | 3004 | HTTP |

Note: web-client and api-gateway share port 3000 by default. When running together, Next.js auto-selects the next available port.
