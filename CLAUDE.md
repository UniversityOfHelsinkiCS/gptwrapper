# CLAUDE.md

CurreChat (gptwrapper): LLM chat for University of Helsinki courses. Express + Sequelize (PostgreSQL) backend, React + MUI + TanStack Query frontend, shared TypeScript types. See `README.md` for setup and `documentation/` for architecture, RAG and accessibility notes.

## Layout

- `src/server`: Express routes (`routes/`), Sequelize models and migrations (`db/`), business logic (`services/`), Sisu/Importer sync (`updater/`), auth middleware (`middleware/`)
- `src/client`: React app, components in `components/`, data hooks in `hooks/`, translations in `locales/{fi,en,sv}.json`
- `src/shared`: types and helpers used by both sides; put API request/response types here
- `e2e/`: Playwright tests, including the axe accessibility scans in `e2e/checks/axe-scan.spec.ts`

## Checks (CI runs all of these, deploys require them to pass)

```
npm run translations -- --lang fi,en   # every t('ns:key') must exist
npm run lint                           # oxlint
npm run tsc
npm run test                           # vitest
npm run test:e2e                       # Playwright, needs the app running
```

Format with prettier (`npx prettier --write <files>`).

## Conventions

- **Translations**: every user-visible string goes through `t()`. Add the key to all three of `fi.json`, `en.json` and `sv.json`. Reuse existing keys when the text fits.
- **Accessibility is tested in CI** (axe). Keep interactive elements labelled, prefer `describeChild` on MUI `Tooltip`s whose child already has an `aria-label`, and remember that an open tooltip or popover during an axe scan is reported as content outside landmarks.
- **Authorization**: user and roles come from Shibboleth headers in `middleware/user.ts`. Admin-only routes live in `routes/admin.ts`, which is guarded as a whole by `adminRouter.use(adminMiddleware)`. Course-level access goes through `requireFullAccess` / `getAccessLevel` in `services/chatInstances/access.ts`. The `/api/external` routes use API keys and are not behind Shibboleth.
- **Backend route tests** mock the Sequelize models and mount the router with `startTestServer` (see `src/server/routes/admin.test.ts`). Test the 403 case for anything restricted.
- **Frontend component tests** use Testing Library without jest-dom matchers. Hook mocks must return stable object references, otherwise components that copy hook data into state in effects re-render forever.
- **Embedded mode** (`?embedded=true`, `useIsEmbedded()`) is the chat inside an iframe, for example in Moodle. It has a narrow always-visible sidebar and a reduced global menu; check layout changes there too.

## Domain

- A course is a `ChatInstance`. Its `courseId` is the Sisu course unit realisation id (for example `hy-opt-cur-…` or `otm-…`), which is also what URLs use (`/chat/<courseId>`). The `id` column is an internal id.
- The updater creates ChatInstances, enrolments and responsibilities (teachers) from Sisu nightly for all realisations, whether or not the course has been activated in Curre. Courses without course units are custom courses (workspaces).
- Token usage has two counters per scope: `usage`/`usageCount` is reset weekly by cron, `totalUsage`/`totalUsageCount` is cumulative. General chat usage is on `User`, course chat usage on `UserChatInstanceUsage`.
