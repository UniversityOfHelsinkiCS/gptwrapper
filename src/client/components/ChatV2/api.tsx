import { readMessageContent, type ChatMessage, type PostStreamSchemaV3Type } from '../../../shared/chat'
import { postAbortableStream } from '../../util/apiClient'
import type { ChatToolOutput } from '../../../shared/tools'
import { useGetQuery } from '../../hooks/apiHooks'
import { TFunction } from 'i18next'
import { sendEmail } from '../../util/email'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { renderToStaticMarkup } from 'react-dom/server'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import { jsPDF } from 'jspdf'

export const useToolResults = (toolCallId: string) => {
  return useGetQuery<ChatToolOutput | { expired: true }>({
    queryKey: ['toolResults', toolCallId],
    url: `/ai/toolResults/${toolCallId}`,
    enabled: !!toolCallId,
    retry: false,
  })
}

export const postCompletionStreamV3 = async (formData: FormData, input: PostStreamSchemaV3Type, abortController?: AbortController) => {
  formData.set('data', JSON.stringify(input))

  return postAbortableStream('ai/v3/stream', formData, abortController)
}

// Helper function to parse markdown and create TextRun objects
const parseMarkdownToTextRuns = (text: string): TextRun[] => {
  const runs: TextRun[] = []
  let currentPos = 0
  
  // Match patterns: ***text***, **text**, *text*, `text`, and links [text](url)
  const patterns = [
    { regex: /\*\*\*(.+?)\*\*\*/g, format: { bold: true, italics: true } },
    { regex: /\*\*(.+?)\*\*/g, format: { bold: true } },
    { regex: /\*(.+?)\*/g, format: { italics: true } },
    { regex: /`(.+?)`/g, format: { font: 'Courier New' } },
  ]
  
  const matches: Array<{ start: number; end: number; text: string; format: any }> = []
  
  // Find all matches
  patterns.forEach(({ regex, format }) => {
    const re = new RegExp(regex)
    let match
    while ((match = re.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        format
      })
    }
  })
  
  // Sort matches by position
  matches.sort((a, b) => a.start - b.start)
  
  // Remove overlapping matches (keep longer/earlier ones)
  const filteredMatches: typeof matches = []
  let lastEnd = 0
  matches.forEach(match => {
    if (match.start >= lastEnd) {
      filteredMatches.push(match)
      lastEnd = match.end
    }
  })
  
  // Build TextRuns
  filteredMatches.forEach(match => {
    // Add plain text before this match
    if (match.start > currentPos) {
      const plainText = text.substring(currentPos, match.start)
      if (plainText) {
        runs.push(new TextRun({ text: plainText }))
      }
    }
    // Add formatted text
    runs.push(new TextRun({ text: match.text, ...match.format }))
    currentPos = match.end
  })
  
  // Add remaining plain text
  if (currentPos < text.length) {
    const remainingText = text.substring(currentPos)
    if (remainingText) {
      runs.push(new TextRun({ text: remainingText }))
    }
  }
  
  // If no matches, return plain text
  if (runs.length === 0 && text) {
    runs.push(new TextRun({ text }))
  }
  
  return runs.length > 0 ? runs : [new TextRun({ text: ' ' })]
}

// Helper function to detect heading level and extract text
const parseHeading = (line: string): { isHeading: boolean; level: number; text: string } => {
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
  if (headingMatch) {
    return {
      isHeading: true,
      level: headingMatch[1].length,
      text: headingMatch[2]
    }
  }
  return { isHeading: false, level: 0, text: line }
}

// Helper function to save file with proper "Save As" dialog
const saveFileWithDialog = async (blob: Blob, filename: string, accept: Record<string, string[]>) => {
  // Check if File System Access API is supported
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'File',
          accept: accept,
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (err: any) {
      // User cancelled or error occurred, fall back to regular download
      if (err.name !== 'AbortError') {
        console.error('Error saving file:', err)
      }
    }
  }
  
  // Fallback for browsers that don't support File System Access API
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const sendConversationEmail = async (email: string, messages: ChatMessage[], t: TFunction) => {
  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
  const subject = `${t('chat:conversation')} ${formattedDate}`
  const text = formatEmail(messages, t)

  const response = await sendEmail(email, text, subject)
  return response
}

export const downloadDiscussionAsFile = (messages: ChatMessage[], t: TFunction, format: 'md' | 'docx' | 'pdf' | 'txt' = 'md') => {
  if (format === 'docx') {
    downloadDiscussionAsDocx(messages, t)
  } else if (format === 'pdf') {
    downloadDiscussionAsPdf(messages, t)
  } else if (format === 'txt') {
    downloadDiscussionAsText(messages, t)
  } else {
    downloadDiscussionAsMarkdown(messages, t)
  }
}

const downloadDiscussionAsMarkdown = async (messages: ChatMessage[], t: TFunction) => {
  const textContent = formatMessagesAsText(messages, t)
  const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' })
  
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const filename = `currechat-discussion-${year}-${month}-${day}-${hours}${minutes}${seconds}.md`
  
  await saveFileWithDialog(blob, filename, { 'text/markdown': ['.md'] })
}

const downloadDiscussionAsText = async (messages: ChatMessage[], t: TFunction) => {
  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
  
  const textLines: string[] = []
  textLines.push(`${t('chat:conversation')} ${formattedDate}`)
  textLines.push('')
  textLines.push('========================================')
  textLines.push('')

  messages.forEach((msg) => {
    const content = readMessageContent(msg)
    
    // Strip all markdown formatting for plain text
    const cleanContent = content
      .replace(/^#{1,6}\s+(.+)$/gm, '$1')   // Strip headings
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold+italic***
      .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold**
      .replace(/\*(.+?)\*/g, '$1')          // *italic*
      .replace(/`(.+?)`/g, '$1')            // `code`
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // [text](url)
    
    if (msg.role === 'user') {
      textLines.push('[USER]')
      textLines.push(cleanContent)
      
      if (msg.attachments) {
        textLines.push(`[Attachment: ${msg.attachments}]`)
      }
    } else {
      let modelInfo = t('email:assistant')
      if (msg.generationInfo) {
        modelInfo = msg.generationInfo.model
        if (msg.generationInfo.promptInfo.type === 'saved') {
          modelInfo = `${msg.generationInfo.promptInfo.name} (${msg.generationInfo.model})`
        }
      }
      
      textLines.push(`[ASSISTANT - ${modelInfo}]`)
      textLines.push(cleanContent)
      
      if (msg.error) {
        textLines.push(`[Error: ${msg.error}]`)
      }
      
      if (msg.toolCalls) {
        const toolCallEntries = Object.entries(msg.toolCalls)
        if (toolCallEntries.length > 0) {
          toolCallEntries.forEach(([, toolCall]) => {
            if (toolCall.result && toolCall.input) {
              const filenames = toolCall.result.files.map((f) => f.fileName).join(', ')
              textLines.push(`[Sources: ${filenames} - Query: "${toolCall.input.query}"]`)
            }
          })
        }
      }
    }
    
    textLines.push('')
    textLines.push('----------------------------------------')
    textLines.push('')
  })
  
  const textContent = textLines.join('\n')
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const filename = `currechat-discussion-${year}-${month}-${day}-${hours}${minutes}${seconds}.txt`
  
  await saveFileWithDialog(blob, filename, { 'text/plain': ['.txt'] })
}

const downloadDiscussionAsDocx = async (messages: ChatMessage[], t: TFunction) => {
  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
  
  const children: Paragraph[] = [
    new Paragraph({
      text: `${t('chat:conversation')} ${formattedDate}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    }),
  ]

  messages.forEach((msg) => {
    const content = readMessageContent(msg)
    let header = ''
    let modelInfo = ''
    
    if (msg.role === 'user') {
      header = '[USER]'
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: header,
              bold: true,
              color: '000000',
            }),
          ],
          spacing: { before: 300, after: 100 },
        })
      )
      
      // Split content by newlines and create separate paragraphs
      const contentLines = content.split('\n')
      contentLines.forEach((line, index) => {
        const heading = parseHeading(line)
        if (heading.isHeading) {
          // Create heading paragraph
          const headingLevels = [
            HeadingLevel.HEADING_1,
            HeadingLevel.HEADING_2,
            HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4,
            HeadingLevel.HEADING_5,
            HeadingLevel.HEADING_6
          ]
          children.push(
            new Paragraph({
              text: heading.text,
              heading: headingLevels[heading.level - 1],
              spacing: { before: 200, after: 100 },
            })
          )
        } else {
          const textRuns = parseMarkdownToTextRuns(line || ' ')
          children.push(
            new Paragraph({
              children: textRuns,
              spacing: { 
                after: index === contentLines.length - 1 ? 100 : 0 
              },
            })
          )
        }
      })
      
      if (msg.attachments) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Attachment: ${msg.attachments}]`,
                italics: true,
                color: '666666',
              }),
            ],
            spacing: { after: 200 },
          })
        )
      }
    } else {
      // Assistant message
      modelInfo = t('email:assistant')
      if (msg.generationInfo) {
        modelInfo = msg.generationInfo.model
        if (msg.generationInfo.promptInfo.type === 'saved') {
          modelInfo = `${msg.generationInfo.promptInfo.name} (${msg.generationInfo.model})`
        }
      }
      header = `[ASSISTANT - ${modelInfo}]`
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: header,
              bold: true,
              color: '107eab',
            }),
          ],
          spacing: { before: 300, after: 100 },
        })
      )
      
      // Split content by newlines and create separate paragraphs
      const contentLines = content.split('\n')
      contentLines.forEach((line, index) => {
        const heading = parseHeading(line)
        if (heading.isHeading) {
          // Create heading paragraph
          const headingLevels = [
            HeadingLevel.HEADING_1,
            HeadingLevel.HEADING_2,
            HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4,
            HeadingLevel.HEADING_5,
            HeadingLevel.HEADING_6
          ]
          children.push(
            new Paragraph({
              text: heading.text,
              heading: headingLevels[heading.level - 1],
              spacing: { before: 200, after: 100 },
            })
          )
        } else {
          const textRuns = parseMarkdownToTextRuns(line || ' ')
          children.push(
            new Paragraph({
              children: textRuns,
              spacing: { 
                after: index === contentLines.length - 1 ? 100 : 0 
              },
            })
          )
        }
      })
      
      if (msg.error) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Error: ${msg.error}]`,
                color: 'FF0000',
              }),
            ],
            spacing: { after: 100 },
          })
        )
      }
      
      if (msg.toolCalls) {
        const toolCallEntries = Object.entries(msg.toolCalls)
        if (toolCallEntries.length > 0) {
          toolCallEntries.forEach(([, toolCall]) => {
            if (toolCall.result && toolCall.input) {
              const filenames = toolCall.result.files.map((f) => f.fileName).join(', ')
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `[Sources: ${filenames} - Query: "${toolCall.input.query}"]`,
                      italics: true,
                      color: '666666',
                    }),
                  ],
                  spacing: { after: 100 },
                })
              )
            }
          })
        }
      }
    }
  })

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const filename = `currechat-discussion-${year}-${month}-${day}-${hours}${minutes}${seconds}.docx`
  
  await saveFileWithDialog(blob, filename, { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] })
}

const downloadDiscussionAsPdf = async (messages: ChatMessage[], t: TFunction) => {
  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const maxWidth = pageWidth - 2 * margin
  let yPosition = 20

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`${t('chat:conversation')} ${formattedDate}`, margin, yPosition)
  yPosition += 15

  messages.forEach((msg) => {
    const content = readMessageContent(msg)
    
    // Check if we need a new page
    if (yPosition > 260) {
      doc.addPage()
      yPosition = 20
    }

    // Message header
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    
    if (msg.role === 'user') {
      doc.setTextColor(0, 0, 0)
      doc.text('[USER]', margin, yPosition)
      yPosition += 8
      
      // Message content
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      // Strip markdown formatting for cleaner PDF output
      const cleanContent = content
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold+italic***
        .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold**
        .replace(/\*(.+?)\*/g, '$1')          // *italic*
        .replace(/`(.+?)`/g, '$1')            // `code`
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // [text](url)
      
      const contentLines = cleanContent.split('\n')
      contentLines.forEach((line: string) => {
        const heading = parseHeading(line)
        if (heading.isHeading) {
          // Render heading with appropriate size
          const headingSizes = [16, 14, 13, 12, 11, 10]
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(headingSizes[heading.level - 1])
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(heading.text, margin, yPosition)
          yPosition += headingSizes[heading.level - 1] / 2 + 4
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
        } else {
          const lines = doc.splitTextToSize(line, maxWidth)
          lines.forEach((textLine: string) => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = 20
            }
            doc.text(textLine, margin, yPosition)
            yPosition += 6
          })
        }
      })
      
      // Attachments
      if (msg.attachments) {
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(102, 102, 102)
        doc.setFontSize(9)
        doc.text(`[Attachment: ${msg.attachments}]`, margin, yPosition)
        yPosition += 6
        doc.setTextColor(0, 0, 0)
      }
    } else {
      // Assistant message
      let modelInfo = t('email:assistant')
      if (msg.generationInfo) {
        modelInfo = msg.generationInfo.model
        if (msg.generationInfo.promptInfo.type === 'saved') {
          modelInfo = `${msg.generationInfo.promptInfo.name} (${msg.generationInfo.model})`
        }
      }
      
      doc.setTextColor(16, 126, 171)
      doc.text(`[ASSISTANT - ${modelInfo}]`, margin, yPosition)
      doc.setTextColor(0, 0, 0)
      yPosition += 8
      
      // Message content
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      // Strip markdown formatting for cleaner PDF output
      const cleanContent = content
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold+italic***
        .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold**
        .replace(/\*(.+?)\*/g, '$1')          // *italic*
        .replace(/`(.+?)`/g, '$1')            // `code`
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // [text](url)
      
      const contentLines = cleanContent.split('\n')
      contentLines.forEach((line: string) => {
        const heading = parseHeading(line)
        if (heading.isHeading) {
          // Render heading with appropriate size
          const headingSizes = [16, 14, 13, 12, 11, 10]
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(headingSizes[heading.level - 1])
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(heading.text, margin, yPosition)
          yPosition += headingSizes[heading.level - 1] / 2 + 4
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
        } else {
          const lines = doc.splitTextToSize(line, maxWidth)
          lines.forEach((textLine: string) => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = 20
            }
            doc.text(textLine, margin, yPosition)
            yPosition += 6
          })
        }
      })
      
      // Error
      if (msg.error) {
        doc.setTextColor(255, 0, 0)
        doc.setFontSize(9)
        doc.text(`[Error: ${msg.error}]`, margin, yPosition)
        doc.setTextColor(0, 0, 0)
        yPosition += 6
      }
      
      // Tool calls
      if (msg.toolCalls) {
        const toolCallEntries = Object.entries(msg.toolCalls)
        if (toolCallEntries.length > 0) {
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(102, 102, 102)
          doc.setFontSize(9)
          
          toolCallEntries.forEach(([, toolCall]) => {
            if (toolCall.result && toolCall.input) {
              const filenames = toolCall.result.files.map((f) => f.fileName).join(', ')
              const sourceLine = `[Sources: ${filenames} - Query: "${toolCall.input.query}"]`
              const sourceLines = doc.splitTextToSize(sourceLine, maxWidth)
              sourceLines.forEach((line: string) => {
                if (yPosition > 270) {
                  doc.addPage()
                  yPosition = 20
                }
                doc.text(line, margin, yPosition)
                yPosition += 5
              })
            }
          })
          
          doc.setTextColor(0, 0, 0)
        }
      }
    }
    
    yPosition += 10 // Space between messages
  })

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const filename = `currechat-discussion-${year}-${month}-${day}-${hours}${minutes}${seconds}.pdf`
  
  const pdfBlob = doc.output('blob')
  await saveFileWithDialog(pdfBlob, filename, { 'application/pdf': ['.pdf'] })
}

const formatMessagesAsText = (messages: ChatMessage[], t: TFunction): string => {
  const textContent = messages
    .map((msg) => {
      const content = readMessageContent(msg)
      let header = ''
      
      if (msg.role === 'user') {
        header = '[USER]'
        const parts = [header, content]
        
        if (msg.attachments) {
          parts.push(`[Attachment: ${msg.attachments}]`)
        }
        
        return parts.join('\n')
      } else {
        // Assistant message
        let modelInfo = t('email:assistant')
        if (msg.generationInfo) {
          modelInfo = msg.generationInfo.model
          if (msg.generationInfo.promptInfo.type === 'saved') {
            modelInfo = `${msg.generationInfo.promptInfo.name} (${msg.generationInfo.model})`
          }
        }
        header = `[ASSISTANT - ${modelInfo}]`
        
        const parts = [header, content]
        
        if (msg.error) {
          parts.push(`[Error: ${msg.error}]`)
        }
        
        if (msg.toolCalls) {
          const toolCallEntries = Object.entries(msg.toolCalls)
          if (toolCallEntries.length > 0) {
            const sources = toolCallEntries
              .map(([, toolCall]) => {
                if (toolCall.result && toolCall.input) {
                  const filenames = toolCall.result.files.map(f => f.fileName).join(', ')
                  return `[Sources: ${filenames} - Query: "${toolCall.input.query}"]`
                }
                return null
              })
              .filter(Boolean)
              .join('\n')
            
            if (sources) {
              parts.push(sources)
            }
          }
        }
        
        return parts.join('\n')
      }
    })
    .join('\n\n---\n\n')
  
  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
  const title = `# ${t('chat:conversation')} ${formattedDate}\n\n`
  
  return title + textContent
}

const escapeHtml = (str: string): string =>
  str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')

const formatEmailContent = (content: string): string => {
  // emails don't exactly support katex etc – hence this unicode mayhem T_T
  const emailFriendlyMath = content
    .replace(/\$\$([^$]+)\$\$/g, '[$1]')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\int/g, '∫')
    .replace(/\\infty/g, '∞')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\abs\{([^}]+)\}/g, '|$1|')
    .replace(/\\norm\{([^}]+)\}/g, '||$1||')
    .replace(/\\R/g, 'ℝ')
    .replace(/\\C/g, 'ℂ')
    .replace(/\\N/g, 'ℕ')
    .replace(/\\Z/g, 'ℤ')
    .replace(/\\vec\{([^}]+)\}/g, '$1⃗')
    .replace(/\\deriv\{([^}]+)\}\{([^}]+)\}/g, 'd$1/d$2')
    .replace(/\\pdv\{([^}]+)\}\{([^}]+)\}/g, '∂$1/∂$2')
    .replace(/\\set\{([^}]+)\}/g, '{$1}')
    .replace(/\\lr\{([^}]+)\}/g, '($1)')
    .replace(/\\T/g, 'ᵀ')
    .replace(/\\defeq/g, '≔')
    .replace(/\\epsilon_0/g, 'ε₀')
    .replace(/\\mu_0/g, 'μ₀')
    .replace(/\\curl/g, '∇×')
    .replace(/\\grad/g, '∇')
    .replace(/\\laplacian/g, '∇²')
    .replace(/\\dd\{([^}]+)\}/g, 'd$1')
    .replace(/\\pd\{([^}]+)\}/g, '∂$1')
    .replace(/\\vb\{([^}]+)\}/g, '$1⃗')
    .replace(/\\vu\{([^}]+)\}/g, '$1̂')
    .replace(/\\aprx/g, '≈')
    .replace(/\\bra\{([^}]+)\}/g, '⟨$1|')
    .replace(/\\ket\{([^}]+)\}/g, '|$1⟩')
    .replace(/\\braket\{([^}]+)\}\{([^}]+)\}/g, '⟨$1|$2⟩')
    .replace(/\\oprod\{([^}]+)\}\{([^}]+)\}/g, '|$1⟩⟨$2|')
    .replace(/\\slashed\{([^}]+)\}/g, '$1/')

  try {
    const markdownElement = (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props
            const match = /language-(\w+)/.exec(className || '')

            if (match) {
              return (
                <div style={{ margin: '1rem 0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      padding: '8px 12px',
                      backgroundColor: '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                    }}
                  >
                    {match[1]}
                  </div>
                  <pre
                    style={{
                      backgroundColor: '#2d3748',
                      color: '#e2e8f0',
                      padding: '16px',
                      margin: '0',
                      fontSize: '16px',
                      fontFamily: 'Monaco, Consolas, monospace',
                    }}
                  >
                    <code>{String(children)}</code>
                  </pre>
                </div>
              )
            }
            return (
              <code
                style={{
                  backgroundColor: '#f1f3f4',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '16px',
                }}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {emailFriendlyMath}
      </ReactMarkdown>
    )

    return renderToStaticMarkup(markdownElement)
  } catch {
    return escapeHtml(content)
  }
}

const formatEmail = (messages: ChatMessage[], t): string => {
  const emailContent = messages
    .map((msg) => {
      const formattedContent = msg.role === 'assistant' ? formatEmailContent(readMessageContent(msg)) : escapeHtml(readMessageContent(msg))

      let title = ''
      if (msg.role === 'assistant') {
        title = t('email:assistant')
        if (msg.generationInfo) {
          title = msg.generationInfo.model
          if (msg.generationInfo.promptInfo.type === 'saved') {
            title = `${msg.generationInfo.promptInfo.name} (${msg.generationInfo.model})`
          }
        }
      }

      return `
      <div style="padding: 1rem; ${msg.role === 'user'
          ? 'background: #efefef; margin-left: 100px; border-radius: 0.6rem; box-shadow: 0px 2px 2px rgba(0,0,0,0.2); white-space: pre-wrap; word-break: break-word; '
          : 'margin-right: 2rem;'
        }">
        ${title ? `<h3 style="font-style: italic; margin: 0; color: #107eab">${title}:</h3>` : ''}
        ${formattedContent}
      </div>
    `
    })
    .join('')

  return `
    <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    color: rgba(0, 0, 0, 0.8);
                    line-height: 1.6;
                    margin: 0 auto;
                }
            </style>
        </head>
        <body>
            ${emailContent}
        </body>
    </html>
`
}
