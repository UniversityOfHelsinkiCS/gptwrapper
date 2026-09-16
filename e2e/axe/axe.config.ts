export const AXE_CONFIG = {
  wcagTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  extraRules: [
    'label-content-name-mismatch',
    'focus-order-semantics',
    'p-as-heading',
    'td-has-header',
    'table-fake-caption',
    'target-size',
  ],
  exclude: ['[data-testid="sentinelStart"]', '[data-testid="sentinelEnd"]'],
  outputDir: 'gitignored',
}
