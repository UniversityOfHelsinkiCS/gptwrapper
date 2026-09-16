#!/bin/sh
set -e

echo "Installing axe dependencies..."
npm install -D @axe-core/playwright@4.13.0 axe-core@4.13.0

if npx playwright --version >/dev/null 2>&1; then
	echo "Playwright already installed, skipping browser download."
else
	echo "Playwright not found, installing it and the chromium browser..."
	npm install -D @playwright/test@1.61.0
	npx playwright install --with-deps chromium
fi

cat <<'SNIPPETS'

Done. Three manual steps remain.

1. Add this project to the `projects` array in playwright.config.ts:

    {
      name: 'axe',
      testDir: './e2e/checks',
      testMatch: '**/axe-scan.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

2. Add this script to package.json:

    "axe:scan": "playwright test --project=axe --workers=1 --reporter=list"

3. Edit e2e/axe/axe.config.ts for this project (excludes, extra rules, output
   directory) and git-ignore the output directory.

Then write e2e/checks/axe-scan.spec.ts - see e2e/axe/README.md for a skeleton -
and run `npm run axe:scan`.
SNIPPETS
