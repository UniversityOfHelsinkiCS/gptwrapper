import BuildIcon from '@mui/icons-material/Build'
import { Box, Checkbox, Chip, Divider, FormControlLabel, FormGroup, Typography } from '@mui/material'
import type { PromptTool, ToolAccess, ToolMaturity } from '@shared/promptTools'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import useAddableTools from '../../hooks/useAddableTools'
import { usePromptEditorForm } from './context'
import { focusIndicatorStyle } from 'src/client/util/accessibility'

type ToolOption = { name: string; label: string; description?: string; access?: ToolAccess; maturity?: ToolMaturity }

/**
 * Checkboxes for the tools of the prompt, from `GET /api/tools`. A tool already on the prompt that the user cannot
 * add (an admin-only tool an admin added) is shown too, by its name, so it can be kept or removed.
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
      access: tool.access,
      maturity: tool.maturity,
    })),
    ...initialTools.filter((tool) => !addableTools.some((addable) => addable.name === tool.name)).map((tool) => ({ name: tool.name, label: tool.name })),
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
            <Box key={option.name} mb={1} ml={1.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    disableRipple
                    checked={selected.some((tool) => tool.name === option.name)}
                    onChange={(e) => setChecked(option.name, e.target.checked)}
                    slotProps={{ input: { 'aria-describedby': option.description ? descriptionId : undefined } }}
                    data-testid={`prompt-tool-${option.name}`}
                    sx={{ ...focusIndicatorStyle() }}
                  />
                }
                label={
                  <Box component="span" display="flex" alignItems="center" gap={1}>
                    <span>{option.label}</span>
                    {option.maturity === 'experimental' && <Chip size="small" variant="outlined" color="error" label={t('prompt:toolExperimental')} />}
                    {option.access === 'admin' && <Chip size="small" variant="outlined" label={t('prompt:toolAdminOnly')} />}
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
