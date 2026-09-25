# Accessibility

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

## Announcing things that are not visible boxes

For state changes with no visual message box of their own — a response finishing, a request failing — use the live-region primitives in [`src/client/components/common/StatusAnnouncer.tsx`](../src/client/components/common/StatusAnnouncer.tsx):

- `StatusAnnouncer` — a visually hidden `role="status"` / `aria-live="polite"` region. Pass it a `message`; changing the message announces it.
- `StreamStatusAnnouncer` — wraps the assistant-turn lifecycle (`processing` → `writing` → `ready` / `canceled` / `error`). The pure `resolveAnnouncementState` reducer behind it is unit-tested in `StreamStatusAnnouncer.test.tsx`.

Both are polite rather than assertive, and never contain the response content itself — only the state. An unchanged live region produces no new announcement, which is why `StreamStatusAnnouncer` reports coarse states rather than streaming tokens.

## Checks

```bash
npm run axe:scan   # playwright --project=axe; needs the dev server running
```

`e2e/checks/axe-scan.spec.ts` currently covers only the `/` first load, the prompt modal on `/general`, and the global menu. A green run is a no-regression signal, not proof — most routes are unscanned. Extend the spec when you touch a route it does not cover.

Automated scans cannot tell you whether an announcement was _appropriate_. For that, open the page with a screen reader (Orca on Linux, NVDA on Windows) and confirm that nothing is spoken on render that should not be.
