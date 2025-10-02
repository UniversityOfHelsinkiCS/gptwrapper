export const preprocessMath = (content: string): string => {
  // console.time('preprocessMath')
  const result = _preprocessMath(content)
  // console.timeEnd('preprocessMath')
  return result
}

const _preprocessMath = (content: string): string => {
  // For preprocessing math in assistant messages from LaTex(-ish :D) format to KaTex-recognizable format
  // Consider upgrading to MathJax for more consistent formatting support if problems arise

  // If no math-like content exists, return
  if (!content.includes('\\') && !content.includes('$$')) {
    return content
  }

  // Temporarily replace code blocks with placeholders for protection
  const codeBlocks: string[] = []

  let processedContent = content.replace(/```[\s\S]*?```|`[^`]*`/g, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
    codeBlocks.push(match)
    return placeholder
  })

  processedContent = processedContent
    // Convert Latex display math \[...\] -> Katex display math `$$...$$`
    .replace(/\\\[([\s\S]*?)\\\]/g, (match, innerContent: string) => {
      return `\n$$\n${innerContent.replaceAll('\n', ' ').trim()}\n$$\n`
    })

    // Convert Latex inline math \(...\) -> Katex display math `$$...$$`
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, innerContent: string) => {
      return `$$ ${innerContent.replaceAll('\n', ' ').trim()} $$`
    })

    // Convert text mode parentheses
    .replace(/\\text\{([^}]*\([^}]*\)[^}]*)\}/g, (match, innerContent) => {
      return `\\text{${innerContent.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}}`
    })
      

  codeBlocks.forEach((block, index) => {
    processedContent = processedContent.replace(`__CODE_BLOCK_${index}__`, block)
  })

  return processedContent
}
