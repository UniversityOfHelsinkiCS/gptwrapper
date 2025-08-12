# Notes about e2e tests

When writing new spec file, make sure to import the test function from the fixtures file, like this:
```
import { test } from './fixtures'
```
.

So that the global foreach function runs for your tests.
