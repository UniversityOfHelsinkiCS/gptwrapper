import { mkdirSync, writeFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

import { AXE_CONFIG } from './axe.config'

export type Finding = { state: string; rule: string; impact: string; help: string; target: string; html: string }

const NAMED_ROLE_SELECTOR =
  'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="combobox"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="searchbox"]'

// The npm script pins --workers=1 so every state accumulates into this one array and
// writeAxeReport can write a single report. Running the project multi-worker would split it.
const findings: Finding[] = []

export async function scan(page: Page, state: string) {
  const builder = new AxeBuilder({ page }).options({
    runOnly: { type: 'tag', values: AXE_CONFIG.wcagTags },
    rules: Object.fromEntries(AXE_CONFIG.extraRules.map((id) => [id, { enabled: true }])),
  })
  for (const selector of AXE_CONFIG.exclude) {
    builder.exclude(selector)
  }

  const { violations } = await builder.analyze()

  const axeFindings: Finding[] = []
  for (const violation of violations) {
    for (const node of violation.nodes) {
      axeFindings.push({
        state,
        rule: violation.id,
        impact: violation.impact ?? 'unknown',
        help: violation.help,
        target: node.target.join(' '),
        html: node.html.replace(/\s+/g, ' ').slice(0, 200),
      })
    }
  }

  const stateFindings = [...axeFindings, ...(await findNamelessElements(page, state))]
  findings.push(...stateFindings)

  expect.soft(stateFindings, report(stateFindings)).toEqual([])
}

// axe drops nodes it considers hidden from screen readers, so a zero-size or empty
// interactive element is never reported by button-name and friends. This pass walks the
// DOM directly and does not care whether the element renders.
async function findNamelessElements(page: Page, state: string): Promise<Finding[]> {
  return page.evaluate(
    ({ selector, state }) => {
      const visibleText = (el: Element): string => {
        if (el.getAttribute('aria-hidden') === 'true') return ''
        let text = ''
        for (const node of Array.from(el.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? ''
          if (node.nodeType === Node.ELEMENT_NODE) text += visibleText(node as Element)
        }
        return text
      }

      const named = (el: Element): boolean => {
        if (el.getAttribute('aria-label')?.trim()) return true

        const labelledby = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
        if (labelledby.some((id) => visibleText(document.getElementById(id) ?? document.createElement('span')).trim())) return true

        if (visibleText(el).trim()) return true
        if (el.getAttribute('title')?.trim()) return true
        if (Array.from(el.querySelectorAll('img[alt], area[alt]')).some((img) => img.getAttribute('alt')?.trim())) return true
        if (el.querySelector('svg > title')?.textContent?.trim()) return true
        if ((el as HTMLInputElement).labels?.length) return true
        if (el.closest('label') && visibleText(el.closest('label') as Element).trim()) return true
        if (el.tagName === 'INPUT' && ['submit', 'reset'].includes((el as HTMLInputElement).type)) return true
        if (el.tagName === 'INPUT' && (el as HTMLInputElement).value.trim()) return true

        return false
      }

      const excluded = (el: Element): boolean =>
        el.getAttribute('aria-hidden') === 'true' ||
        el.closest('[aria-hidden="true"]') !== null ||
        el.hasAttribute('disabled') ||
        ['presentation', 'none'].includes(el.getAttribute('role') ?? '')

      return Array.from(document.querySelectorAll(selector))
        .filter((el) => !excluded(el) && !named(el))
        .map((el) => ({
          state,
          rule: 'missing-accessible-name',
          impact: 'serious',
          help: `<${el.tagName.toLowerCase()}> is interactive but has no accessible name (strict DOM pass)`,
          target: el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(/\s+/)[0]}` : ''),
          html: el.outerHTML.replace(/\s+/g, ' ').slice(0, 200),
        }))
    },
    { selector: NAMED_ROLE_SELECTOR, state },
  )
}

export function report(rows: Finding[]): string {
  const byRule = new Map<string, Finding[]>()
  for (const finding of rows) {
    byRule.set(finding.rule, [...(byRule.get(finding.rule) ?? []), finding])
  }

  const order = ['critical', 'serious', 'moderate', 'minor', 'unknown']
  const rules = [...byRule.entries()].sort(([, a], [, b]) => order.indexOf(a[0].impact) - order.indexOf(b[0].impact) || b.length - a.length)

  const lines = [`${rows.length} axe violation node(s) across ${new Set(rows.map((f) => f.state)).size} state(s)`]
  for (const [rule, items] of rules) {
    lines.push('', `  ${rule} [${items[0].impact}] (${items.length}) - ${items[0].help}`)
    for (const item of items) {
      lines.push(`    - ${item.state}`, `      ${item.target}`, `      ${item.html}`)
    }
  }
  return lines.join('\n')
}

export function writeAxeReport() {
  const outputFile = `${AXE_CONFIG.outputDir}/axe-findings.json`
  mkdirSync(AXE_CONFIG.outputDir, { recursive: true })
  writeFileSync(outputFile, `${JSON.stringify(findings, null, 2)}\n`)
  console.log(`\n${report(findings)}\n\nWritten to ${outputFile}`)
}
