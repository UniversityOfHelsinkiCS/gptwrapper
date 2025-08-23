# Notes about e2e tests

When writing new spec file, make sure to import the test function from the fixtures file, like this:
```ts
import { teacherTest as test } from './fixtures'
```

So that the global foreach function runs for your tests. For different user roles (`studentTest`, `teacherTest`, `adminTest`), import the corresponding test function:
```ts
import { studentTest as test } from './fixtures'
```

## Test setup and data

Test user headers are defined in `src/shared/testData.ts`. TEST_COURSES are also defined there.

Before each test, the test data of a test user is reset by calling the `/test/reset-test-data` endpoint. It is found at `src/server/routes/testUtils.ts`.

When running the tests, the headers `x-test-user-idx` and `x-test-user-role` are set, defining the test user's id and iam-based role. They are read at `src/server/middleware/user.ts`.

The tests are isolated so that each (should at least) modifies their own data discriminated by the user's id. This allows parallel execution.
