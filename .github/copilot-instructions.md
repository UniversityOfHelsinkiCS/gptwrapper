# CurreChat - Copilot Instructions

CurreChat is a full-stack LLM chat application for University of Helsinki. React+Vite frontend and Node.js/Express backend in a single TypeScript monorepo.

## Commands

```bash
npm start              # Start full dev environment (docker compose up)
npm run dev            # Run frontend (Vite) + backend (tsx watch) concurrently
npm run dev:server     # Backend only with hot reload
npm run build          # Vite production build (frontend)
npm run lint           # ESLint on src/**/*.{ts,tsx}
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier on src/**/*.{ts,tsx}
npm run tsc            # TypeScript type-check
npm run test:e2e       # Playwright e2e tests (needs running dev environment)
npm run knip           # Find unused code/dependencies
```

### Running a single E2E test

Mark the test with `.only` and run `npm run test:e2e`. The dev environment must be running.

```ts
test.only('test name', async ({ page }) => { /* ... */ })
```

## Architecture

### Monorepo layout

- `src/client/` — React SPA (MUI, React Query, react-router v6, i18next)
- `src/server/` — Express API (Sequelize ORM, PostgreSQL, Redis/BullMQ, LangChain)
- `src/shared/` — Types and utilities shared between client and server
- `src/config.ts` — Shared constants (valid models, token limits, file types)
- `e2e/` — Playwright end-to-end tests
- `dalai/` — Separate worker microservice for background RAG processing (connects to Ollama/Redis/S3)

### Server structure (`src/server/`)

- `routes/` — Express route handlers (`/api/ai`, `/api/rag`, `/api/users`, `/api/chatinstances`, `/api/prompts`, etc.)
- `db/models/` — Sequelize model definitions
- `db/migrations/` — Timestamped migration files (`YYYYMMDD_NN_description.ts`)
- `services/` — Business logic (RAG pipeline, chat instances, LangChain integration, BullMQ jobs)
- `middleware/` — Shibboleth SSO auth, user header parsing, role-based access, error handling
- `updater/` — Scheduled sync of courses, users, and enrolments from university systems

### Client structure (`src/client/`)

- `components/` — Feature-based components (ChatV2, Admin, Courses, Rag, etc.)
- `hooks/` — React Query hooks for data fetching (`useCourse`, `usePrompts`, `useChatInstanceUsage`, etc.)
- `locales/` — i18n translations (en, fi, sv JSON files)
- `util/apiClient.ts` — Axios instance (base URL `/api`)

### Authentication

Users authenticate via Shibboleth SSO. Headers are parsed in `src/server/middleware/user.ts` to extract user identity and roles. In dev/test, headers can be set manually. Roles: admin, power user, stats viewer — derived from IAM groups.

### Infrastructure (compose.yaml)

Dev environment runs: app (port 3000/8000), PostgreSQL, Redis, Minio (S3), Adminer (port 8080), and dalai worker.

## Key Conventions

### Terminology

The terms `course` and `chatInstance` refer to the same concept. **Always use `chatInstance`** — this is the correct term.

### Database migrations

Migration files follow the naming pattern: `YYYYMMDD_NN_description.ts` in `src/server/db/migrations/`. Umzug handles migration execution.

### E2E test fixtures

Always import the role-specific test function from `e2e/fixtures.ts`:

```ts
import { teacherTest as test } from './fixtures'
// or: studentTest, adminTest
```

Each role sets appropriate auth headers and resets test data before each test. Tests are isolated by worker index for parallel execution. Test users and courses are defined in `src/shared/testData.ts`.

### i18n

All user-facing strings must use i18next. The ESLint rule `i18next/no-literal-string` enforces this (currently `warn`). Three languages: English, Finnish, Swedish.

### Supported models

Defined in `src/config.ts`: `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-5`, and `mock`. Azure OpenAI deployments must be named after the model (e.g., deployment name `gpt-5` for model gpt-5).

### API and data fetching

Client uses TanStack React Query with custom hooks in `src/client/hooks/`. Streaming LLM responses use a custom `postAbortableStream()` utility. The Axios client in `util/apiClient.ts` targets `/api`.

### Validation

Zod is used for runtime validation of data structures.
