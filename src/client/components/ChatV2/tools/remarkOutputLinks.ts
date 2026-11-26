import { baseName } from '../../../util/myFiles/paths'
import { outputPathOfHref } from './OutputFiles'

type MdNode = { type: string; value?: string; url?: string; children?: MdNode[]; data?: { hProperties?: Record<string, unknown> } }

/** Rendered as the `data-output-path` attribute, which `outputFileComponents` reads. */
const OUTPUT_PATH_PROPERTY = 'dataOutputPath'

const SKIP = new Set(['linkReference', 'imageReference', 'definition', 'code', 'html', 'math', 'inlineMath'])

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const mark = (node: MdNode, path: string): MdNode => {
  node.url = path
  node.data = { ...node.data, hProperties: { ...node.data?.hProperties, [OUTPUT_PATH_PROPERTY]: path } }
  return node
}

/**
 * The one place that decides which links and images in an answer are `Outputs/` files. It rewrites their URL to the
 * clean path (so `defaultUrlTransform` never sees a `sandbox:` or `javascript:` form of it) and marks them for the
 * renderers. It also links mentions of files the answer wrote: the full path or the file name, in text or inline code.
 * A file name counts only when no other written file has the same name.
 */
export const remarkOutputLinks = (outputPaths: string[] = []) => {
  const nameCounts = new Map<string, number>()
  for (const path of outputPaths) nameCounts.set(baseName(path), (nameCounts.get(baseName(path)) ?? 0) + 1)
  const targets = new Map(outputPaths.map((path) => [path, path]))
  for (const path of outputPaths) if (nameCounts.get(baseName(path)) === 1) targets.set(baseName(path), path)

  const alternatives = [...targets.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  // Not followed by more of a file name ("a.svg.bak"). Not being inside a longer word or path is checked in the loop,
  // as Safari before 16.4 throws on a lookbehind.
  const pattern = alternatives.length > 0 ? new RegExp(`(${alternatives.join('|')})(?!\\.?[\\w/-])`, 'g') : undefined

  const splitText = (value: string): MdNode[] | undefined => {
    if (!pattern) return undefined
    const out: MdNode[] = []
    let last = 0
    pattern.lastIndex = 0
    for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
      if (match.index > 0 && /[\w/.-]/.test(value[match.index - 1])) {
        // Try again from the next character, as the lookbehind would.
        pattern.lastIndex = match.index + 1
        continue
      }
      if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) })
      out.push(mark({ type: 'link', children: [{ type: 'text', value: match[1] }] }, targets.get(match[1])!))
      last = match.index + match[0].length
    }
    if (out.length === 0) return undefined
    if (last < value.length) out.push({ type: 'text', value: value.slice(last) })
    return out
  }

  const visit = (node: MdNode) => {
    if (!node.children) return
    node.children = node.children.flatMap((child) => {
      if (SKIP.has(child.type)) return [child]
      if (child.type === 'link' || child.type === 'image') {
        const path = outputPathOfHref(child.url, outputPaths)
        return [path ? mark(child, path) : child]
      }
      if (child.type === 'text' && child.value) return splitText(child.value) ?? [child]
      if (child.type === 'inlineCode' && child.value) {
        const path = targets.get(child.value.trim())
        return [path ? mark({ type: 'link', children: [child] }, path) : child]
      }
      visit(child)
      return [child]
    })
  }

  return (tree: MdNode) => visit(tree)
}
