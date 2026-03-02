# MyNook — AI Context for Claude Code

## Project Overview
**MyNook** is a location recommendation and review system (cafes, restaurants, study spaces).
Key features: Hybrid Search (Vector + NLP), WebSockets for real-time updates, AI-powered recommendations.

## Repository Structure
```
mynook-location-recommendation-system/
├── mynook-be/        # NestJS backend (API + WebSocket server)
└── mynook-fe/        # Next.js 15 frontend (App Router)
```

---

## Backend — `mynook-be` (NestJS)

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | NestJS (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL (`pg`) |
| Config | `@nestjs/config` |
| API Docs | `@nestjs/swagger` |
| WebSocket | `@nestjs/websockets` + `socket.io` |

### Source Structure (`src/`)
```
src/
├── app.module.ts              # Root module — imports all feature modules
├── main.ts                    # Bootstrap (port 3001)
├── modules/
│   ├── auth/                  # Authentication (JWT, login, register)
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   ├── users/                 # User profile management
│   ├── venues/                # Venue CRUD
│   ├── reviews/               # Review CRUD
│   ├── search/                # Hybrid search orchestrator
│   │   ├── search.module.ts
│   │   ├── search.controller.ts
│   │   ├── search.service.ts
│   │   └── strategies/        # Factory Method pattern — search algorithms
│   │       └── search-strategy.interface.ts
│   │       # Add: vector.strategy.ts, nlp.strategy.ts, hybrid.strategy.ts
│   ├── ai/                    # Embeddings, NLP, AI recommendations
│   └── gateway/               # WebSocket gateway (socket.io, namespace: /ws)
│       ├── gateway.module.ts
│       ├── gateway.gateway.ts
│       └── gateway.service.ts
├── common/
│   ├── guards/                # JwtAuthGuard, RolesGuard
│   ├── decorators/            # @CurrentUser(), @Roles(), @Public()
│   ├── filters/               # HttpExceptionFilter, AllExceptionsFilter
│   └── interceptors/          # LoggingInterceptor, TransformInterceptor
├── config/                    # app.config.ts, database.config.ts, jwt.config.ts
└── database/                  # DB providers, migrations, seeds
```

### Key Patterns
- **Modular architecture**: each domain is a self-contained NestJS module
- **Factory Method** for search strategies: implement `ISearchStrategy` from `search/strategies/search-strategy.interface.ts`
- **Global config**: `ConfigModule.forRoot({ isGlobal: true })` — use `ConfigService` anywhere
- **WebSocket namespace**: `/ws` on port 3001

### Scripts
```bash
cd mynook-be
npm run start:dev   # Development
npm run build       # Production build
npm run test        # Unit tests
```

---

## Frontend — `mynook-fe` (Next.js 15)

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| HTTP Client | Axios |
| State Management | Zustand |
| Icons | lucide-react |
| UI Components | Shadcn/ui (to be installed) |

### Source Structure (`src/`)
```
src/
├── app/                       # App Router pages & layouts (Next.js)
├── components/
│   ├── ui/                    # Shadcn/ui components (install with: npx shadcn@latest add <component>)
│   └── features/              # Domain-specific components (VenueCard, SearchBar, etc.)
├── services/
│   ├── api.client.ts          # Axios instance with interceptors (base URL from NEXT_PUBLIC_API_URL)
│   ├── venue.service.ts       # Venue API calls
│   └── auth.service.ts        # Auth API calls
├── hooks/
│   ├── useVenues.ts           # Fetch all venues
│   └── useSearch.ts           # Hybrid search hook
├── store/
│   ├── auth.store.ts          # Zustand: token + user state
│   └── venue.store.ts         # Zustand: venues list + selected venue
├── types/
│   ├── venue.types.ts         # Venue interface
│   ├── user.types.ts          # User + AuthResponse interfaces
│   └── review.types.ts        # Review interface
└── lib/
    └── utils.ts               # cn() utility (ready for tailwind-merge + clsx)
```

### Key Patterns
- **Path alias**: `@/*` maps to `src/*`
- **API calls**: always go through `src/services/api.client.ts` (Axios instance)
- **State**: Zustand stores in `src/store/` — no Redux, no Context for global state
- **Shadcn/ui**: drop components into `src/components/ui/` — run `npx shadcn@latest init` first

### Scripts
```bash
cd mynook-fe
npm run dev     # Development (port 3000)
npm run build   # Production build
```

---

## Environment Variables

### Backend (`mynook-be/.env`)
```
NODE_ENV=development
PORT=3001
DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD / DB_NAME
JWT_SECRET / JWT_EXPIRES_IN
OPENAI_API_KEY
VECTOR_DB_URL
WS_CORS_ORIGIN=http://localhost:3000
```

### Frontend (`mynook-fe/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

## Development Conventions
- **Package manager**: npm (both projects)
- **Port**: BE = 3001, FE = 3000
- **API prefix**: `/api` (configure in `main.ts`)
- **Naming**: kebab-case for files, PascalCase for classes/components
- **Imports**: use `@/*` alias in FE, relative paths in BE
- **No business logic in boilerplate** — controllers/services are empty shells ready to implement
