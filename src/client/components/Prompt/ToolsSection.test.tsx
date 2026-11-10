import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { useState } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ToolInfo } from '@shared/promptTools'
import type { PromptEditorFormState } from '../../types'

const quizTool: ToolInfo = {
  name: 'present_quiz',
  stage: 'experimental',
  labelKey: 'prompt:toolPresentQuizLabel',
  descriptionKey: 'prompt:toolPresentQuizDescription',
}

// The hook result must be a stable reference
let addableTools: { tools: ToolInfo[] }
vi.mock('../../hooks/useAddableTools', () => ({ default: () => addableTools }))

import en from '../../locales/en.json'
import { PromptEditorFormContext } from './context'
import { ToolsSection } from './ToolsSection'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common', interpolation: { escapeValue: false } })
})

beforeEach(() => {
  addableTools = { tools: [quizTool] }
})

afterEach(cleanup)

const baseForm: PromptEditorFormState = {
  name: 'Quizzer',
  userInstructions: '',
  systemMessage: '',
  ragSystemMessages: [],
  customMessage: '',
  hidden: false,
  ragHidden: false,
  userId: 'user-1',
}

let latestForm: PromptEditorFormState

const Editor = ({ tools, initialTools = tools }: { tools?: PromptEditorFormState['tools']; initialTools?: PromptEditorFormState['tools'] }) => {
  const [form, setForm] = useState<PromptEditorFormState>({ ...baseForm, tools })
  latestForm = form
  return (
    <PromptEditorFormContext.Provider value={{ form, setForm, initialTools, type: 'PERSONAL', courseId: 'general' }}>
      <ToolsSection />
    </PromptEditorFormContext.Provider>
  )
}

const renderEditor = (props: Parameters<typeof Editor>[0] = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <Editor {...props} />
    </I18nextProvider>,
  )

describe('ToolsSection', () => {
  test('shows each addable tool as a labelled checkbox described by its description', () => {
    renderEditor({ tools: [] })

    const checkbox = screen.getByRole('checkbox', { name: /Quizzes/ }) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    const descriptionId = checkbox.getAttribute('aria-describedby')
    expect(document.getElementById(descriptionId!)?.textContent).toBe(en.prompt.toolPresentQuizDescription)
    expect(screen.getByText('Experimental')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Tools' })).toBeTruthy()
  })

  test('loads the saved tools as checked and toggles them in the form', () => {
    renderEditor({ tools: [{ name: 'present_quiz' }] })
    const checkbox = screen.getByRole('checkbox', { name: /Quizzes/ }) as HTMLInputElement
    expect(checkbox.checked).toBe(true)

    fireEvent.click(checkbox)
    expect(latestForm.tools).toEqual([])

    fireEvent.click(checkbox)
    expect(latestForm.tools).toEqual([{ name: 'present_quiz' }])
  })

  test('keeps showing a saved tool the user cannot add, so it can be removed', () => {
    addableTools = { tools: [] }
    renderEditor({ tools: [{ name: 'present_quiz' }] })

    const checkbox = screen.getByRole('checkbox', { name: 'present_quiz' }) as HTMLInputElement
    expect(checkbox.checked).toBe(true)
    fireEvent.click(checkbox)
    expect(latestForm.tools).toEqual([])
  })

  test('renders nothing when there are no tools to show', () => {
    addableTools = { tools: [] }
    const { container } = renderEditor({ tools: [] })
    expect(container.textContent).toBe('')
  })
})
