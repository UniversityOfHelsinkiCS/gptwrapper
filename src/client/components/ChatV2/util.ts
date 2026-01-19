import { format } from 'date-fns'

import { ActivityPeriod, ChatInstanceUsage, ChatStatus } from '../../types'
import { CoursesViewCourse } from '../../hooks/useUserCourses'

import curTypes from '../../locales/curTypes.json'

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

export const getCurTypeLabel = (type: string, language: string) => curTypes[type] && curTypes[type].name[language]

export const formatDate = (activityPeriod?: ActivityPeriod) => {
  if (!activityPeriod) return ''

  const { startDate, endDate } = activityPeriod

  const start = new Date(startDate)
  const end = new Date(endDate)

  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  // Show year in both dates if years differ
  if (startYear !== endYear) {
    return `${format(start, 'dd.MM.yyyy')}–${format(end, 'dd.MM.yyyy')}`
  }

  return `${format(start, 'dd.MM.')}–${format(end, 'dd.MM.yyyy')}`
}

export const formatDateTime = (date: string) => `${format(new Date(date), 'dd.MM.yyyy hh:mm:ss')}`

export const filterUsages = (maxTokenLimit: number, usages: ChatInstanceUsage[]) => {
  const limit = maxTokenLimit * 0.9

  const closeToMaxTokenLimit = usages.filter((usage) => usage.usageCount >= limit)

  return closeToMaxTokenLimit
}

export const getGroupedCourses = (courses: CoursesViewCourse[] = []) => {
  const curreEnabled = courses.filter((course) => course.isActive)
  const curreDisabled = courses.filter((course) => !course.isActive && !course.isExpired)
  const ended = courses.filter((course) => course.isExpired)

  return {
    curreEnabled,
    curreDisabled,
    ended,
  }
}

export const getChatActivityStatus = (chatInstance: any, user: any): ChatStatus => {
  if (!chatInstance?.activityPeriod) return 'ACTIVE'

  const isResponsible = user?.isAdmin || chatInstance.responsibilities?.some((r) => r.user.id === user?.id)
  if (isResponsible) return 'ACTIVE'

  const { startDate, endDate } = chatInstance.activityPeriod
  const now = new Date()

  if (now < new Date(startDate)) return 'NOT_STARTED'
  if (now > new Date(endDate)) return 'EXPIRED'

  return 'ACTIVE'
}
