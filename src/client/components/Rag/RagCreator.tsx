import { useState } from 'react'
import { useCreateRagIndexMutation, useCreateUserRagIndexMutation } from './api'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import { BlueButton } from '../ChatV2/general/Buttons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Course } from '../../types'
import { useTranslation } from 'react-i18next'
import { RAG_LANGUAGES } from '@shared/lang'
import { createRagSearchParams, getRagNavigationState } from './ragNavigation'

export type RagCreatorDialogSubmitPayload = {
  name: string
  language: (typeof RAG_LANGUAGES)[number]
}

export type RagCreatorDialogProps = {
  open: boolean
  onClose: () => void
  onSubmit: (payload: RagCreatorDialogSubmitPayload) => Promise<void> | void
}

export const RagCreatorDialog = ({ open, onClose, onSubmit }: RagCreatorDialogProps) => {
  const { t } = useTranslation()
  const [indexName, setIndexName] = useState('')
  const [language, setLanguage] = useState<(typeof RAG_LANGUAGES)[number]>('English')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({ name: indexName, language })
    setIndexName('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: handleSubmit,
        },
      }}
    >
      <DialogTitle>{t('rag:createNewIndex')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Alert severity="info">
          {t('rag:creatorInfo')}{' '}
          <Link href="https://github.com/UniversityOfHelsinkiCS/gptwrapper/blob/main/documentation/rag.md" target="_blank" rel="noopener noreferrer">
            {t('rag:readMoreAboutRag')}
          </Link>
        </Alert>
        <Alert severity="success" icon={<LightbulbOutlinedIcon fontSize="small" />}>
          {t('rag:creatorLanguageTip')}
        </Alert>
        <TextField
          label={t('rag:nameLabel')}
          variant="outlined"
          value={indexName}
          onChange={(e) => setIndexName(e.target.value)}
          fullWidth
          required
          slotProps={{
            htmlInput: { minLength: 5, maxLength: 100, 'data-testid': 'ragIndexNameInput' },
          }}
          sx={{ mt: '1rem' }}
        />
        <FormControl fullWidth>
          <InputLabel id="language-label">{t('rag:language')}</InputLabel>
          <Select
            labelId="language-label"
            id="language-select"
            value={language}
            label={t('rag:language')}
            data-testid="ragIndexLanguageInput"
            onChange={(e) => setLanguage(e.target.value as (typeof RAG_LANGUAGES)[number])}
          >
            <MenuItem value={RAG_LANGUAGES[0]} data-testid="ragIndexLanguageOptionFinnish">
              {t('rag:finnish')}
            </MenuItem>
            <MenuItem value={RAG_LANGUAGES[1]}>{t('rag:swedish')}</MenuItem>
            <MenuItem value={RAG_LANGUAGES[2]}>{t('rag:english')}</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <BlueButton color="primary" type="submit" data-testid="ragIndexCreateSubmit">
          {t('rag:createIndex')}
        </BlueButton>
      </DialogActions>
    </Dialog>
  )
}

export const RagCreator = ({ chatInstance, onCreated }: { chatInstance?: Course; onCreated?: (indexId: number) => void }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { returnToEditor, returnPromptId, promptType } = getRagNavigationState(searchParams)
  const createIndexMutation = useCreateRagIndexMutation()
  const createUserIndexMutation = useCreateUserRagIndexMutation()
  const [open, setOpen] = useState(false)

  const handleDialogSubmit = async ({ name, language }: RagCreatorDialogSubmitPayload) => {
    const newIndex = chatInstance
      ? await createIndexMutation.mutateAsync({ chatInstanceId: chatInstance.id, name, language })
      : await createUserIndexMutation.mutateAsync({ name, language })
    if (onCreated) {
      onCreated(newIndex.id)
    } else {
      navigate(
        `?${createRagSearchParams({
          indexId: newIndex.id,
          returnToEditor,
          returnPromptId,
          promptType,
        })}`,
      )
    }
  }

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setOpen(true)}
        data-testid="createNewRagButton"
        startIcon={<Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>+</Typography>}
        sx={{ mb: 1 }}
      >
        {t('rag:createNewIndex')}
      </Button>
      <RagCreatorDialog open={open} onClose={() => setOpen(false)} onSubmit={handleDialogSubmit} />
    </>
  )
}
