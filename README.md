# CurreChat

LLM chat built for University of Helsinki staff and students, for education and research.

Some key features include:

- Access based on enrolments and staff role
- Custom system prompts managed by teachers
- Retrieval-augmented generation: teachers can bring their own source material for a course

<!-- This badge enables weekly refreshes to CurreChat deepwiki page (deepwiki/gptwrapper) -->

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/UniversityOfHelsinkiCS/gptwrapper)

## Development

Quickstart:

- Install npm, docker and docker compose
- Clone the repository
- Copy `.env.template` as `.env` file and fill in the required values
- Run `npm i` and `npm start` to setup and start the development environment

## Environment setup

See `compose.yaml` for local development. In short, in addition to the CC server, you need

- PostgreSQL (docker)
- Redis (docker)
- Ollama (docker)
- Azure
- S3 (minio, docker)

### Azure

Azure is used for OpenAI LLMs.

Create an AI foundry resource (or something) and create deployment for the models you want to use (gpt-5 for example). Always set the deployment name to the acual model name. So for model gpt-5, the deployment name should be gpt-5.

Then populate .env with the following:

```
AZURE_RESOURCE=<name-of-the-resource-you-created>
AZURE_API_KEY=<asd>
```

### S3

(using minio by default, no need to do this locally)

S3 is used for storing user-uploaded files and their processed versions.

Create an S3 bucket and populate .env with the following:

```
S3_HOST=<host-url>
S3_BUCKET=<name-of-the-bucket-you-created>
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
```

## Developers: things to know

### Debugging in production

In browser console, run

```
toggleDevtools()
```

### Common issues

Getting `Error: Cannot find module @rollup/rollup-linux-arm64-musl` on MacOS?
This is likely because you ran `npm i` locally.
Try removing package-lock.json locally and running

```
docker compose build
```

If then you're getting `concurrently not found`, prepend the `npm run dev` script with `npm i` and run once with that.

## E2E Testing

Playwright e2e tests are located in `e2e`. `playwright.config.ts` is also important.

Run the tests with

```bash
npm run e2e
```

To run just one test, mark it with `.only`:

```ts
test.only('test name', async ({ page }) => {
  // test code
})
```

When writing new spec file, make sure to import the test function from the fixtures file, like this:

```ts
import { teacherTest as test } from './fixtures'
```

So that the global foreach function runs for your tests. For different user roles (`studentTest`, `teacherTest`, `adminTest`), import the corresponding test function:

```ts
import { studentTest as test } from './fixtures'
```

### Test setup and data

Test user headers are defined in `src/shared/testData.ts`. TEST_COURSES are also defined there.

Before each test, the test data of a test user is reset by calling the `/test/reset-test-data` endpoint. It is found at `src/server/routes/testUtils.ts`.

When running the tests, the headers `x-test-user-idx` and `x-test-user-role` are set, defining the test user's id and iam-based role. They are read at `src/server/middleware/user.ts`.

The tests are isolated so that each (should at least) modifies their own data discriminated by the user's id. This allows parallel execution.


## Trivia

The terms `course` and `chatInstance` refer to the same thing in the codebase. However, only `chatInstance` is correct, always prefer it.
