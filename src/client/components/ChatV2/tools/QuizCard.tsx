import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline'
import HelpOutline from '@mui/icons-material/HelpOutline'
import HighlightOff from '@mui/icons-material/HighlightOff'
import Quiz from '@mui/icons-material/Quiz'
import { Box, Checkbox, type Theme, FormControlLabel, FormGroup, Radio, RadioGroup, Typography } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { ToolPart } from '../../../../shared/agentChat'
import { parseQuiz, type Quiz as QuizInput, QUIZ_IDK, quizOutcome, type QuizOutcome, type QuizResult } from '../../../../shared/quiz'
import { accessibleTextColor } from '../../../theme'
import { optionFocusIndicatorStyle } from '../../../util/accessibility'
import { BlueButton } from '../general/Buttons'
import { preprocessMath } from '../util'
import { useQuizAnswer } from './quizAnswerContext'
import { ToolPartRow } from './ToolPartRow'

/** Markdown and math of the quiz. `inline` keeps it phrasing content, for option labels. */
const QuizMarkdown = ({ text, inline = false }: { text: string; inline?: boolean }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
    rehypePlugins={[[rehypeKatex, { output: 'htmlAndMathml', throwOnError: false }]]}
    components={inline ? { p: ({ node: _node, ...props }) => <span {...props} /> } : undefined}
  >
    {preprocessMath(text)}
  </ReactMarkdown>
)

const isQuizResult = (value: unknown): value is QuizResult =>
  typeof value === 'object' && value !== null && Array.isArray((value as QuizResult).correct) && typeof (value as QuizResult).explanation === 'string'

const OUTCOME = {
  correct: { key: 'chat:quizCorrect', icon: <CheckCircleOutline fontSize="small" />, color: (theme: Theme) => accessibleTextColor(theme, 'success') },
  incorrect: { key: 'chat:quizIncorrect', icon: <HighlightOff fontSize="small" />, color: (theme: Theme) => accessibleTextColor(theme, 'error') },
  idk: { key: 'chat:quizIdkResult', icon: <HelpOutline fontSize="small" />, color: 'text.primary' },
} as const satisfies Record<QuizOutcome, unknown>

/** Selecting "I don't know" clears the other options and the other way round, also in multi-select. */
const toggleOption = (selected: string[], id: string, multiSelect: boolean): string[] => {
  if (id === QUIZ_IDK || !multiSelect) return [id]
  const withoutIdk = selected.filter((s) => s !== QUIZ_IDK)
  return withoutIdk.includes(id) ? withoutIdk.filter((s) => s !== id) : [...withoutIdk, id]
}

/**
 * One multiple-choice question from `present_quiz`, with an "I don't know" option and Submit. The student explains
 * their answer in the chat box, and Submit (or sending from the chat box) sends the picked options with that text
 * as a user message. The card then shows right or wrong and the explanation from the tool's result (no model call).
 * The answered state comes from that message, so it survives a reload.
 */
export const QuizCard = ({ part, quiz }: { part: ToolPart; quiz: QuizInput }) => {
  const { t } = useTranslation()
  const { answer: sentAnswer, selection, onSelect, onSubmit, closed } = useQuizAnswer()
  const [submitted, setSubmitted] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const questionId = useId()
  const submitDescriptionId = useId()

  const answer = sentAnswer?.callId === part.callId ? sentAnswer : null
  const locked = answer !== null || !onSelect
  const selected = !locked && selection?.callId === part.callId ? selection.selected : []
  const shownSelected = answer?.selected ?? selected
  const result = isQuizResult(part.result) ? part.result : null
  const outcome = answer && result ? quizOutcome(result.correct, answer.selected) : null

  // Submit removes the button, so focus moves to the result, which a screen reader then reads.
  useEffect(() => {
    if (submitted && outcome) resultRef.current?.focus()
  }, [submitted, outcome])

  const options = [...quiz.options, { id: QUIZ_IDK, text: t('chat:quizIdk') }]

  const select = (id: string) => onSelect?.({ callId: part.callId, selected: toggleOption(selected, id, quiz.multiSelect) })

  const handleSubmit = () => {
    if (locked || selected.length === 0) return
    setSubmitted(true)
    onSubmit?.()
  }

  const optionLabelContent = (id: string, text: string) => {
    const markers = [
      answer && result?.correct.includes(id) ? t('chat:quizCorrectOption') : null,
      answer?.selected.includes(id) ? t('chat:quizYourAnswer') : null,
    ].filter(Boolean)
    return (
      <span>
        {id === QUIZ_IDK ? text : <QuizMarkdown text={text} inline />}
        {markers.length > 0 && (
          <Typography
            component="span"
            variant="body2"
            sx={{
              ml: 1,
              fontWeight: 600,
              color: (theme) => (result?.correct.includes(id) ? accessibleTextColor(theme, 'success') : theme.palette.text.secondary),
            }}
          >
            ({markers.join(', ')})
          </Typography>
        )}
      </span>
    )
  }

  const optionControls = options.map((option) => (
    <FormControlLabel
      key={option.id}
      value={option.id}
      disabled={locked}
      label={optionLabelContent(option.id, option.text)}
      sx={{ ...optionFocusIndicatorStyle(), my: 0.25, '& .MuiFormControlLabel-label.Mui-disabled': { color: 'text.primary' } }}
      control={
        quiz.multiSelect ? (
          <Checkbox checked={shownSelected.includes(option.id)} onChange={() => select(option.id)} />
        ) : (
          <Radio checked={shownSelected.includes(option.id)} />
        )
      }
    />
  ))

  return (
    <Box
      role="group"
      aria-labelledby={titleId}
      data-testid="quiz-card"
      data-quiz-state={answer ? 'answered' : closed ? 'closed' : locked ? 'waiting' : 'open'}
      sx={{ my: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.85 }}>
        <Quiz aria-hidden fontSize="small" />
        <Typography id={titleId} component="span" variant="body2" sx={{ fontWeight: 600 }}>
          {t('chat:quizTitle')}
        </Typography>
      </Box>
      <Box id={questionId} data-testid="quiz-question" sx={{ '& > p:first-of-type': { mt: 1 } }}>
        <QuizMarkdown text={quiz.question} />
      </Box>

      {quiz.multiSelect ? (
        <FormGroup role="group" aria-labelledby={questionId}>
          {optionControls}
        </FormGroup>
      ) : (
        <RadioGroup aria-labelledby={questionId} value={shownSelected[0] ?? ''} onChange={(event) => select(event.target.value)}>
          {optionControls}
        </RadioGroup>
      )}

      {answer?.explanation && (
        <Typography data-testid="quiz-explanation" variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>
          <Box component="span" sx={{ fontWeight: 600 }}>
            {t('chat:quizYourComment')}:
          </Box>{' '}
          {answer.explanation}
        </Typography>
      )}

      {!locked && (
        <>
          <BlueButton data-testid="quiz-submit" onClick={handleSubmit} disabled={selected.length === 0} aria-describedby={submitDescriptionId} sx={{ mt: 1.5 }}>
            {t('chat:quizSubmit')}
          </BlueButton>
          <Box id={submitDescriptionId} sx={visuallyHidden}>
            {t('chat:quizSubmitDescription')}
          </Box>
        </>
      )}

      {outcome && result && (
        <Box ref={resultRef} tabIndex={-1} data-testid="quiz-result" data-quiz-outcome={outcome} sx={{ mt: 1.5, outline: 'none' }}>
          <Typography component="p" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, color: OUTCOME[outcome].color }}>
            <Box component="span" aria-hidden sx={{ display: 'flex' }}>
              {OUTCOME[outcome].icon}
            </Box>
            {t(OUTCOME[outcome].key)}
          </Typography>
          <QuizMarkdown text={result.explanation} />
        </Box>
      )}

      {!answer && closed && (
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
          {t('chat:quizNotAnswered')}
        </Typography>
      )}
    </Box>
  )
}

/** The `present_quiz` part in its place in the answer: the card once the quiz is ready, a status line before that or when it failed. */
export const QuizPart = ({ part }: { part: ToolPart }) => {
  const { t } = useTranslation()
  const quiz = parseQuiz(part.input)

  if (part.status === 'ok' && quiz) return <QuizCard part={part} quiz={quiz} />

  const text = part.status === 'running' ? t('chat:quizPreparing') : t('chat:quizFailed')
  return <ToolPartRow part={part} label={t('chat:quizTitle')} icon={<Quiz fontSize="small" />} text={text} />
}
