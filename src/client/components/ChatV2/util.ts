import type { ChatMessage, MessageGenerationInfo } from '../../../shared/chat'
import { postAbortableStream } from '../../util/apiClient'

interface GetCompletionStreamProps {
  generationInfo: MessageGenerationInfo
  courseId?: string
  messages: ChatMessage[]
  formData: FormData
  ragIndexId?: number
  userConsent?: boolean
  modelTemperature: number
  prevResponseId?: string
  abortController?: AbortController
  saveConsent: boolean
}
export const getCompletionStreamV3 = async ({
  generationInfo,
  courseId,
  messages,
  formData,
  ragIndexId,
  userConsent,
  modelTemperature,
  prevResponseId,
  abortController,
  saveConsent,
}: GetCompletionStreamProps) => {
  const data = {
    courseId,
    options: {
      chatMessages: messages,
      systemMessage: generationInfo.promptInfo.systemMessage,
      model: generationInfo.model,
      ragIndexId,
      userConsent,
      modelTemperature,
      saveConsent,
      prevResponseId,
    },
  }

  formData.set('data', JSON.stringify(data))

  return postAbortableStream('/ai/v3/stream', formData, abortController)
}

export const preprocessMath = (content: string): string => {
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
    // Convert Latex align environments -> Katex aligned display math
    .replace(/\\begin\{(?:align\*?|aligned)\}([\s\S]*?)\\end\{(?:align\*?|aligned)\}/g, (_, innerContent) => {
      const alignedLines = innerContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(' \\\\\n')
      return `$$\n\\begin{aligned}\n${alignedLines}\n\\end{aligned}\n$$`
    })

    // Convert Latex display math \[...\] -> Katex display math `$$...$$`
    .replace(/\\\[([\s\S]*?)\\\]/g, (match, innerContent) => {
      return `$$${innerContent.trim()}$$`
    })

    // Convert Latex inline math \(...\) -> Katex display math `$$...$$`
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, innerContent) => {
      return `$$${innerContent.trim()}$$`
    })

    // Convert text mode parentheses
    .replace(/\\text\{([^}]*\([^}]*\)[^}]*)\}/g, (match, innerContent) => {
      return `\\text{${innerContent.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}}`
    })

    // Support for matrix environments
    .replace(/\\begin\{(p|b|v|V)?matrix\*?\}([\s\S]*?)\\end\{(p|b|v|V)?matrix\*?\}/g, (match, matrixTypeGroup, innerContent) => {
      const matrixType = matrixTypeGroup || ''

      const matrixContent = innerContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(' \\\\\n')

      const kaTeXEnv = `\\begin{${matrixType}matrix}`
      const kaTeXEndEnv = `\\end{${matrixType}matrix}`

      return `$$\n${kaTeXEnv}\n${matrixContent}\n${kaTeXEndEnv}\n$$`
    })

  codeBlocks.forEach((block, index) => {
    processedContent = processedContent.replace(`__CODE_BLOCK_${index}__`, block)
  })

  return processedContent
}
