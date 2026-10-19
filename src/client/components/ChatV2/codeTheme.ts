import type { CSSProperties } from 'react'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const contrastFixes: Record<string, string> = {
  'hsl(220, 10%, 40%)': 'hsl(220, 10%, 62%)',
  'hsl(355, 65%, 65%)': 'hsl(355, 65%, 68%)',
  'hsl(5, 48%, 51%)': 'hsl(5, 60%, 65%)',
}

export const accessibleOneDark: Record<string, CSSProperties> = Object.fromEntries(
  Object.entries(oneDark).map(([selector, style]) => {
    const color = style.color && contrastFixes[style.color]
    return [selector, color ? { ...style, color } : style]
  }),
)
