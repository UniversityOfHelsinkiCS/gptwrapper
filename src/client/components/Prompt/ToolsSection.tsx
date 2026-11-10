import BuildIcon from '@mui/icons-material/Build'
import { Box, Checkbox, Chip, Divider, FormControlLabel, FormGroup, Typography } from '@mui/material'
import type { PromptTool } from '@shared/promptTools'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import useAddableTools from '../../hooks/useAddableTools'
import { usePromptEditorForm } from './context'

type ToolOption = { name: string; label: string; description?: string; experimental: boolean }

/**
 * Checkboxes for the tools of the prompt, from `GET /api/tools`. A tool already on the prompt that the user cannot
 * add (an experimental tool an admin added) is shown too, by its name, so it can be kept or removed.
 * Renders nothing when there are no tools to show.
 */
export const ToolsSection = () => {
  const { form, setForm, initialTools = [] } = usePromptEditorForm()
  const { t } = useTranslation()
  const { tools: addableTools } = useAddableTools()
  const headingId = useId()
  const helpId = useId()
  const selected = form.tools ?? []

  const options: ToolOption[] = [
    ...addableTools.map((tool) => ({
      name: tool.name,
      label: t(tool.labelKey),
      description: t(tool.descriptionKey),
      experimental: tool.stage === 'experimental',
    })),
    ...initialTools
      .filter((tool) => !addableTools.some((addable) => addable.name === tool.name))
      .map((tool) => ({ name: tool.name, label: tool.name, experimental: false })),
  ]

  if (options.length === 0) return null

  const setChecked = (name: string, checked: boolean) =>
    setForm((prev) => {
      const others = (prev.tools ?? []).filter((tool) => tool.name !== name)
      // Turning a saved tool back on keeps its saved config.
      const tool: PromptTool = initialTools.find((initial) => initial.name === name) ?? { name }
      return { ...prev, tools: checked ? [...others, tool] : others }
    })

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <BuildIcon color="secondary" />
        <Typography id={headingId} variant="subtitle1" component="h4" fontWeight="bold" color="text.primary">
          {t('prompt:toolsHeading')}
        </Typography>
      </Box>
      <Typography id={helpId} variant="body2" color="text.secondary" mb={1}>
        {t('prompt:toolsHelp')}
      </Typography>
      <FormGroup role="group" aria-labelledby={headingId} aria-describedby={helpId}>
        {options.map((option) => {
          const descriptionId = `${helpId}-${option.name}`
          return (
            <Box key={option.name} mb={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selected.some((tool) => tool.name === option.name)}
                    onChange={(e) => setChecked(option.name, e.target.checked)}
                    slotProps={{ input: { 'aria-describedby': option.description ? descriptionId : undefined } }}
                    data-testid={`prompt-tool-${option.name}`}
                  />
                }
                label={
                  <Box component="span" display="flex" alignItems="center" gap={1}>
                    <span>{option.label}</span>
                    {option.experimental && <Chip size="small" variant="outlined" color="warning" label={t('prompt:toolExperimental')} />}
                  </Box>
                }
              />
              {option.description && (
                <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  {option.description}
                </Typography>
              )}
            </Box>
          )
        })}
      </FormGroup>
      <Divider sx={{ my: 3 }} />
    </Box>
  )
}
