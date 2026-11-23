import { describe, expect, test } from 'vitest'
import { scopeCss } from './pdfjs'

describe('scopeCss', () => {
  test('wraps the stylesheet in a scope and moves :root variables to the scope root', () => {
    const css = ':root{\n  --page-margin:1px;\n}\n:root *{ --x:1 }\n.page{ margin:var(--page-margin) }\n@media print{ .hidden{ display:none } }'
    expect(scopeCss(css, 'viewer')).toBe(
      '@scope (.viewer) {\n:scope{\n  --page-margin:1px;\n}\n:scope *{ --x:1 }\n.page{ margin:var(--page-margin) }\n@media print{ .hidden{ display:none } }\n}',
    )
  })
})
