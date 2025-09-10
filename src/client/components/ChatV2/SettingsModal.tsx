import { Add, Close } from '@mui/icons-material'
import { Box, IconButton, Modal, Slider, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_MODEL_TEMPERATURE } from '../../../config'
import AssistantInstructionsInput from './AssistantInstructionsInput'
import PromptSelector from './PromptSelector'
import { SaveMyPromptModal } from './SaveMyPromptModal'
import { BlueButton, OutlineButtonBlack } from './general/Buttons'
import { SendPreferenceConfiguratorButton } from './SendPreferenceConfigurator'
import { usePromptState } from './PromptState'

interface SettingsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  modelTemperature: number
  setModelTemperature: (value: number) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, setOpen, modelTemperature, setModelTemperature }) => {
  const { t } = useTranslation()

  const {
    customSystemMessage,
    activePrompt,
    handleChangePrompt,
    setCustomSystemMessage,
    saveOwnPrompt,
    deleteOwnPrompt,
    isPromptEditable,
    isPromptHidden,
    myPrompts,
  } = usePromptState()
  const [systemMessage, setSystemMessage] = useState<string>(customSystemMessage)

  const [myPromptModalOpen, setMyPromptModalOpen] = useState<boolean>(false)

  useEffect(() => {
    if (activePrompt) {
      setSystemMessage(activePrompt.systemMessage)
    }
  }, [activePrompt])

  useEffect(() => {
    if (!activePrompt) {
      setSystemMessage(customSystemMessage)
    }
  }, [customSystemMessage, activePrompt])

  const resetSettings = () => {
    handleChangePrompt(undefined)
    setModelTemperature(DEFAULT_MODEL_TEMPERATURE)
  }

  const handleClose = async () => {
    // When no prompt is selected, set the custom system message to the value of the system message textfield
    if (!activePrompt) {
      setCustomSystemMessage(systemMessage)
    } else if (activePrompt.type === 'PERSONAL') {
      saveOwnPrompt({ name: activePrompt.name, promptToSave: activePrompt, systemMessage })
    }
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={handleClose} data-testid="settings-modal">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          // minWidth: 600,
          width: '85vw',
          maxWidth: 1000,
          minHeight: '25vh',
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: '0.3rem',
          overflow: 'auto',
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', top: 10, right: 20, color: 'grey.500', background: '#FFF', opacity: 0.9, zIndex: 1 }}
          data-testid="close-settings"
        >
          <Close />
        </IconButton>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '1.2rem',
            overflowY: 'auto',
            p: { xs: '1.5rem', md: '3rem' },
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {t('settings:prompt')}
          </Typography>
          <Typography variant="body1">{t('settings:promptInstructions')}</Typography>
          <PromptSelector handleDeletePrompt={deleteOwnPrompt} />
          <AssistantInstructionsInput
            label={t('settings:promptContent')}
            disabled={!isPromptEditable}
            hidden={isPromptHidden}
            systemMessage={systemMessage}
            setSystemMessage={setSystemMessage}
          />
          {!isPromptHidden && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <OutlineButtonBlack startIcon={<Add />} onClick={() => setMyPromptModalOpen(true)} data-testid="save-my-prompt-button">
                {t('settings:saveMyPrompt')}
              </OutlineButtonBlack>
            </Box>
          )}

          <Typography variant="h6" fontWeight={600} mt="2rem">
            {t('settings:temperature')}
          </Typography>
          <Typography variant="body1">{t('settings:temperatureInstructions')}</Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ padding: '1.5rem 0', width: '100%', maxWidth: 600 }}>
              <Slider
                sx={{ width: '100%' }}
                min={0.0}
                max={1.0}
                step={0.1}
                value={activePrompt?.temperature ?? modelTemperature}
                marks
                valueLabelDisplay="auto"
                name="Temperature"
                onChange={(_event, value) => setModelTemperature(typeof value === 'number' ? value : modelTemperature)}
                disabled={!!activePrompt?.temperature}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>{t('settings:temperatureAccurate')}</Typography>
                <Typography>{t('settings:temperatureRandom')}</Typography>
              </Box>
            </Box>
          </Box>

          <Typography variant="h6" fontWeight={600} mt="2rem">
            {t('settings:other')}
          </Typography>
          <div>
            <SendPreferenceConfiguratorButton />
          </div>
        </Box>

        <Box
          sx={{
            padding: { xs: '1rem', md: '2rem' },
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <OutlineButtonBlack
            onClick={() => {
              if (window.confirm(t('settings:resetConfirm'))) {
                resetSettings()
              }
            }}
          >
            {t('settings:resetDefault')}
          </OutlineButtonBlack>{' '}
          <BlueButton onClick={handleClose} data-testid="settings-ok-button">
            OK
          </BlueButton>
        </Box>
        <SaveMyPromptModal
          isOpen={myPromptModalOpen}
          setIsOpen={setMyPromptModalOpen}
          systemMessage={systemMessage}
          myPrompts={myPrompts}
          existingName={activePrompt?.name}
          onSave={async (name, promptToSave) => {
            await saveOwnPrompt({ name, promptToSave, systemMessage })
          }}
        />
      </Box>
    </Modal>
  )
}
