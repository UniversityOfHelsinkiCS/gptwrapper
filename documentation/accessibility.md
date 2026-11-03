# Accessibility

Developer notes on how accessibility is built into the client. For what users are told about the current state of the service, see [`accessibility-statement.md`](accessibility-statement.md); update it when you fix or introduce something it lists.

The shared helpers live in two places:

- [`src/client/components/common/accessibility/`](../src/client/components/common/accessibility/) — live regions, snackbar announcing and focus, scrollable regions
- [`src/client/util/accessibility.ts`](../src/client/util/accessibility.ts) — focus indicator styles, `ariaSort`, focus after navigation

Screen-reader-only strings go in the `accessibility` namespace of `locales/{fi,en,sv}.json`.

## Page structure

[`App.tsx`](../src/client/App.tsx) sets up the landmarks every page shares:

- `<header>` with a visually hidden `<h1>` (the app name) and the global menu. Page headings therefore start from `h2`.
- `<main id="main-content" tabIndex={-1}>` around the routed content.
- A "Skip to content" link as the first focusable element (hidden on mobile). It focuses the element marked with `data-skip-target` if the page has one, otherwise `#main-content`. The chat view puts `data-skip-target` on the chat column so the link also skips the sidebar.
- The chat sidebar is an `<aside>` labelled with `sidebar:landmark`.

Give every routed page a title with `usePageTitle(...)` ([`hooks/usePageTitle.ts`](../src/client/hooks/usePageTitle.ts)); it produces `Page – CurreChat` and restores the plain app name on unmount.

`index.html` hard-codes `<html lang="en">` and nothing updates it when the UI language changes. This is a known WCAG 3.1.1 issue listed in the accessibility statement.

## `Alert` vs `InfoBox`

We use two visually identical components for coloured message boxes. Which one you pick decides whether a screen reader interrupts the user.

|               | Use it for                                                                              | Announced?                                         |
| ------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------- |
| MUI `<Alert>` | Something changed as a result of a user action, or an error the user must be told about | **Yes** — `role="alert"`, an assertive live region |
| `<InfoBox>`   | Static page descriptions, tips, disclaimers, hints inside dialogs                       | No                                                 |

`InfoBox` lives in [`src/client/components/common/InfoBox.tsx`](../src/client/components/common/InfoBox.tsx). It renders a MUI `Alert` internally with `role="presentation"`, so it is pixel-identical to `<Alert severity="…" />` and always will be — including any future `MuiAlert` theme override.

### Why this distinction exists

In MUI v7, `Alert` defaults to `role="alert"` for **every** severity — `info` and `success` included, not just `error` and `warning`. It is easy to reach for `Alert` because it looks right, and silently add an assertive live region to the page. Before this split, toggling the advanced-parsing checkbox in the RAG upload dialog mounted three `role="alert"` nodes at once and made a screen reader read out three paragraphs of static caveat text.

So: **if you would not want a screen reader to interrupt the user and read the box aloud, it is an `InfoBox`.** Do not use `Alert` because you like the colour.

`InfoBox` deliberately has no `onClose`, no `variant` and no `style` prop. A dismissible box is interactive and belongs on `Alert`; `variant` would let `InfoBox` drift away from "identical to a standard Alert"; and `sx` is the house styling convention.

### Notification banners

[`NotificationBanner`](../src/client/components/common/NotificationBanner.tsx) (admin-managed service notifications) uses `Alert` with `role="alert"`, but only the first time each notification is rendered per page load. The banner remounts often (for example whenever a chat finishes loading), so a module-level set remembers which ids have been announced and later renders get `role="note"`. Error and warning notifications get a visually hidden "Error:" / "Warning:" prefix, because colour and icon alone do not reach a screen reader.

## Announcing things that are not visible notifications

For state changes with no visual message box of their own, use the live-region primitives in [`src/client/components/common/accessibility/StatusAnnouncer.tsx`](../src/client/components/common/accessibility/StatusAnnouncer.tsx):

- `StatusAnnouncer` — a visually hidden `role="status"` / `aria-live="polite"` region. Pass it a `message`; changing the message announces it. Render it unconditionally, so the region exists before its text changes.
- `StreamStatusAnnouncer` — wraps the assistant-turn lifecycle (`processing` → `writing` → `ready` / `canceled` / `error`). The pure `resolveAnnouncementState` reducer behind it is unit-tested in `StreamStatusAnnouncer.test.tsx`.
- `SearchResultsAnnouncer` — announces the result count of a search that updates while typing. It empties the region while searching, so a new search with the same count is announced again.

All three are polite rather than assertive, and `StreamStatusAnnouncer` never contains the response content itself — only the state. An unchanged live region produces no new announcement, which is why it reports coarse states rather than streaming tokens. While a response streams, the assistant message is also marked `aria-busy`.

For a one-off confirmation where a component-owned region is awkward (copied to clipboard, prompt selected, file attached…), call `announceToScreenReader(message, { assertive? })` from `SnackbarAnnouncer.ts`. It goes through the same live regions as snackbars (see below), so it also works while a dialog is open.

## Snackbars

Always import `enqueueSnackbar` from [`components/common/Snackbar.tsx`](../src/client/components/common/Snackbar.tsx), never from `notistack` directly. The wrapper and the code in `common/accessibility/` handle what notistack does not:

- **Announcing** ([`SnackbarAnnouncer.ts`](../src/client/components/common/accessibility/SnackbarAnnouncer.ts)): notistack mounts each snackbar with `role="alert"` together with its text, which many screen readers announce late or not at all. The `onEnter` hook removes that role and copies the text into persistent polite/assertive live regions instead. Errors and warnings use the assertive region. Snackbars arriving within 7 seconds are announced together, newest first, with a count.
- **Inside dialogs**: an open MUI modal hides the rest of the page with `aria-hidden`, so the live regions are moved into the topmost open modal. If focus moves to another container right after an announcement (a dialog opening or closing), the announcement is repeated there.
- **Duplicates**: enqueuing a message that is already open does not show it twice, but announces it again and restarts its timer.
- **Auto-hide**: snackbars close after 20 seconds. The timer is paused while focus or the mouse is in the notification region or the window is not focused, and after a pause the snackbar gets half the time again.
- **Focus after close** ([`SnackbarFocus.ts`](../src/client/components/common/accessibility/SnackbarFocus.ts)): closing a snackbar with its focused close button moves focus to the next open snackbar, else to `#chat-input`, else back to where focus was before the notifications.
- **Labelling**: the notistack container is labelled as a region with the number of open notifications, and error/warning snackbars get a visually hidden severity prefix.

Known gaps (snackbars are not reachable by keyboard while a dialog is open, the virtual cursor does not pause the timer, the oldest snackbar is dropped when a fifth arrives) are listed in the accessibility statement.

## Focus

### Focus indicator

The theme ([`theme.ts`](../src/client/theme.ts)) draws a 3px `--focus-indicator` outline on `:focus-visible` everywhere. The colour is set per light/dark mode in `GlobalStyles.tsx`, so always reference `focusIndicator` instead of a hard-coded colour. Ripples are disabled globally.

Where MUI's own focus styling gets in the way, use the helpers in `util/accessibility.ts`:

- `focusIndicatorStyle({ color?, selector? })` — an inset outline for `.Mui-focusVisible`. Pass `selector: '&:has(:focus-visible)'` when focus lands on a child, for example a hidden file input inside a label button.
- `optionFocusIndicatorStyle()` — for radio/checkbox options with a `FormControlLabel`, outlines the whole option.
- `switchFocusIndicatorStyle` — outlines the thumb of a MUI `Switch`.

### Moving focus

- When an element that has focus disappears (a dialog closes, a row is deleted, a button is swapped for another), move focus somewhere sensible yourself. Otherwise it falls back to `<body>` and keyboard and screen reader users lose their place. Several such cases are still open in the accessibility statement.
- To focus something after a navigation that may tear down the DOM (route change, page swap), call `requestFocusAfterNavigate(elementId)` before navigating and `consumePendingFocusTarget()` on the destination. The target id is kept in `sessionStorage` and the request stays pending while the target is behind an open modal. The prompt modal uses this to focus `#chat-input` after a prompt is selected.
- The chat's "Go to latest response" button focuses the newest assistant message (`latestResponseRef` in `ChatV2.tsx`).
- Use `autoFocus` only where focus is expected to land, such as the first field of a dialog the user just opened.

## Colour and contrast

WCAG AA requires a contrast ratio of at least 4.5:1 for normal text, and 3:1 for large text (about 24px, or 18.5px bold), icons, borders of inputs and other UI components, and focus indicators. Both themes must meet these on every background the element can sit on.

### Light and dark mode

Dark mode is a user setting (`DarkModeConfigurator` in the settings dialog), stored in `localStorage` under `dark-mode` and off by default; it does not follow `prefers-color-scheme`. The palette is built in [`theme.ts`](../src/client/theme.ts) and switches with `palette.mode`.

- Take colours from the theme (`text.primary`, `text.secondary`, `background.paper`, `divider`, `error.main`…) instead of hex values. The theme values are chosen per mode; a hard-coded colour is right in one mode and usually wrong in the other.
- Backgrounds: `background.default` for the page, `paper` for cards and dialogs, `subtle` for tinted areas such as input backgrounds, `elevated` for things on top of paper. Avoid `grey.50`/`grey.100`: they stay light in dark mode.
- When a mode needs a different value, use `theme.applyStyles('dark', {...})` in `sx` or a style override, as `MuiButton.outlinedPrimary` and `MuiTab` do in `theme.ts`. Use `theme.palette.mode === 'dark'` only outside `sx`, for example when passing a colour to a chart library.
- Links in rendered Markdown (chat responses, tool results, the disclaimer) get `darkModeLinkColors` in dark mode; the MUI default link colour is too dark on `#121212`.
- Icons drawn as dark-on-transparent images (`CustomIcon`) are inverted in dark mode.

### Palette colours that do not pass everywhere

- The `*.main` palette colours are tuned for the light background. Do not use `primary.main` or `info.main` for normal-sized text, even in light mode. Use `text.primary` / `text.secondary`, and use the brand colour for backgrounds (with `primary.contrastText`), borders and large text.
- `success`, `info` and `error` have a lighter `main` in dark mode, with the light-mode colour as `dark` (which `Snackbar.tsx` uses as a filled background). `warning` does not, so warning-coloured text in dark mode needs an override (see `Feedback.tsx`).
- In dark mode, primary-coloured outlines, tab indicators and selected tabs use `text.primary` instead of `primary.main`.

### Ready-made colour sets

- Charts: `chartSeriesColor(theme, i)`, `chartAxisColor` and `chartTooltipStyle` from [`util/charts.ts`](../src/client/util/charts.ts). The series colours have separate light and dark sets.
- Usage gauge: `gaugeColor` in `UsageSelector.tsx` uses lighter colours in dark mode.
- Code blocks: `accessibleOneDark` in [`ChatV2/codeTheme.ts`](../src/client/components/ChatV2/codeTheme.ts) is Prism's One Dark with the comment and a couple of token colours lightened to reach 4.5:1. If you change the syntax theme, check its token colours the same way.
- Focus indicator: `focusIndicatorColors` (see [Focus indicator](#focus-indicator)).

When you add a new colour, check it against every background it can appear on in both modes, for example with the WebAIM contrast checker or the browser devtools colour picker. Remember disabled-looking text, placeholder text and text on hover/selected backgrounds.

### Colour alone

Colour must not be the only way information is shown (WCAG 1.4.1). Pair it with text, an icon, weight or a pattern: the severity prefixes on alerts and snackbars, `selectedTabStyle`, and distinguishable chart series are existing examples. Error states in forms need the error text, not just a red border.

## Tables, charts and wide content

- Sortable table headers: set `aria-sort={ariaSort(active, direction)}` on the `TableCell`. It returns `undefined` for inactive columns, as ARIA requires.
- Selected tabs: apply `selectedTabStyle` to `&.Mui-selected` (as in `Admin/index.tsx` and `Statistics.tsx`) so selection is shown by background and weight, not by colour alone.
- Content that cannot reflow (wide tables, long formulas, code): wrap it in `ScrollableRegion` with a `label` (`accessibility:scrollableTable`, `accessibility:scrollableFormula`). It scrolls horizontally on its own instead of widening the page, and is focusable so keyboard users can scroll it.
- Charts need a text alternative. `PromptUsageHistogram` has a "Show as table" switch that renders the same data as a table; follow that pattern for new charts, and do not distinguish series by colour alone.
- Math in chat responses is rendered with KaTeX using `output: 'htmlAndMathml'`, so screen readers get MathML.

## Labels and tooltips

- Every interactive element needs an accessible name. Icon buttons get an `aria-label`; error/warning state that is shown only by colour or icon gets a visually hidden text prefix.
- Prefer `describeChild` on MUI `Tooltip`s whose child already has an `aria-label`, so the tooltip text becomes the description instead of overwriting the name.
- Links that open a new tab: add `accessibility:opensInNewTab` to the accessible name, for example ``aria-label={`${label} (${t('accessibility:opensInNewTab')})`}``.

## Checks

### Automated

```bash
npm run axe:scan   # playwright --project=axe --workers=1; needs the app running
npm run test       # includes the vitest accessibility tests below
```

`e2e/checks/axe-scan.spec.ts` runs axe ([`e2e/axe/axe.config.ts`](../e2e/axe/axe.config.ts): WCAG 2.0–2.2 A/AA plus best-practice tags and a few extra rules such as `target-size` and `label-content-name-mismatch`) on these states:

- first load, global menu, and the settings, disclaimer, feedback and API key dialogs
- prompt modal: course preview, my-prompt creator and editor, prompt preview, university prompt gallery
- general chat with a prompt and a mocked response
- source materials: list, collection creator, collection details

Each `scan()` also runs a strict DOM pass that reports interactive elements with no accessible name, which axe skips when it considers them hidden. Scans soft-assert, so one run reports every failing state. The whole-run report is written to `gitignored/axe-findings.json`. Keep the project single-worker, otherwise the report only sees one worker's findings.

Not scanned: admin views, embedded mode and dark mode. A green run is a no-regression signal, not proof. Extend the spec when you touch a view it does not cover. An open tooltip or popover during a scan is reported as content outside landmarks, so move the pointer away first (see the course preview scan).

Unit tests:

- `components/common/accessibility/StreamStatusAnnouncer.test.tsx` — announcement states and the live region attributes
- `components/ChatV2/Conversation.a11y.test.tsx` — `aria-busy` while streaming, and the live region never containing response text

### Manual

Automated scans cannot tell you whether an announcement was _appropriate_, or whether focus ends up in a sensible place. For that:

- Go through the change with the keyboard only: everything reachable, focus always visible, focus not lost when elements disappear.
- Open the page with a screen reader (Orca on Linux, NVDA on Windows) and confirm that nothing is spoken on render that should not be, and that status changes are spoken once.
- Check dark mode and embedded mode (`?embedded=true`) when you change layout or colours.
