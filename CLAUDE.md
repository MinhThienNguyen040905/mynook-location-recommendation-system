# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyNook is a location review & discovery system built with **Nx monorepo** + **NestJS microservices** + **Next.js** frontend.

## Architecture

- **api-gateway** (port 3000): the ONLY HTTP entry point, prefixed `/api`. Forwards requests to microservices via TCP message patterns.
- **4 microservices** (auth:3001, venue:3002, interaction:3003, search-ai:3004): NestJS apps using `Transport.TCP`, no HTTP endpoints exposed.
- **web-client**: Next.js 16 App Router frontend.
- Production communication switches to RabbitMQ via `@mynook/rmq-messaging`.

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
| shared-types | `@mynook/shared-types` | Enums (UserRole, VenueCategory, BookingStatus), interfaces (IUser, IVenue, IReview), service name constants (AUTH_SERVICE, VENUE_SERVICE, etc.) |
| database | `@mynook/database` | DB connection config, entity schemas |
| rmq-messaging | `@mynook/rmq-messaging` | `RmqModule.register()` for RabbitMQ client/server setup |

## Key Conventions

- Microservice communication uses `@nestjs/microservices` message patterns (e.g., `{ cmd: 'get_venue' }`), not HTTP calls between services.
- Service name constants for `ClientProxy` injection tokens are defined in `@mynook/shared-types` (AUTH_SERVICE, VENUE_SERVICE, etc.).
- Gateway registers TCP clients via `ClientsModule.register()` in its app module.
- TypeScript strict mode is enabled. Module resolution is `nodenext`.
- Nx workspace uses `@nx/js/typescript`, `@nx/next/plugin`, and `@nx/webpack/plugin` inferred targets.

## Port Assignments

| Service | Port | Transport |
|---------|------|-----------|
| web-client | 3000 (dev) | HTTP |
| api-gateway | 3000 | HTTP REST |
| auth-service | 3001 | TCP |
| venue-service | 3002 | TCP |
| interaction-service | 3003 | TCP |
| search-ai-service | 3004 | TCP |

Note: web-client and api-gateway share port 3000 by default. When running together, Next.js auto-selects the next available port.
