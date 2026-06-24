import { useState } from 'react'
import { useCreateRagIndexMutation, useCreateUserRagIndexMutation } from './api'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Course } from '../../types'
import { useTranslation } from 'react-i18next'
import { RAG_LANGUAGES } from '@shared/lang'
import { createRagSearchParams, getRagNavigationState } from './ragNavigation'

export const RagCreator = ({ chatInstance, onCreated }: { chatInstance?: Course; onCreated?: (indexId: number) => void }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { returnToEditor, returnPromptId, promptTab } = getRagNavigationState(searchParams)
  const createIndexMutation = useCreateRagIndexMutation()
  const createUserIndexMutation = useCreateUserRagIndexMutation()
  const [indexName, setIndexName] = useState('')
  const [language, setLanguage] = useState<'Finnish' | 'English' | 'Swedish'>('English')
  const [open, setOpen] = useState(false)

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
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const newIndex = chatInstance
                ? await createIndexMutation.mutateAsync({ chatInstanceId: chatInstance.id, name: indexName, language })
                : await createUserIndexMutation.mutateAsync({ name: indexName, language })
              setIndexName('')
              if (onCreated) {
                onCreated(newIndex.id)
              } else {
                navigate(
                  `?${createRagSearchParams({
                    indexId: newIndex.id,
                    returnToEditor,
                    returnPromptId,
                    promptTab,
                  })}`,
                )
              }
              setOpen(false)
            },
          },
        }}
      >
        <DialogTitle>{t('rag:createNewIndex')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('rag:creatorGuide')}</DialogContentText>
          <TextField
            label={t('rag:nameLabel')}
            helperText={t('rag:nameHelperText')}
            variant="outlined"
            value={indexName}
            onChange={(e) => setIndexName(e.target.value)}
            fullWidth
            required
            slotProps={{
              htmlInput: { minLength: 5, maxLength: 100, 'data-testid': 'ragIndexNameInput' },
            }}
            sx={{ mt: '2rem' }}
          />
          <FormControl fullWidth sx={{ my: '2rem' }}>
            <InputLabel id="language-label">{t('rag:language')}</InputLabel>
            <Select
              labelId="language-label"
              id="language-select"
              value={language}
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
          <OutlineButtonBlack color="primary" type="submit" data-testid="ragIndexCreateSubmit">
            {t('rag:createIndex')}
          </OutlineButtonBlack>
        </DialogActions>
      </Dialog>
    </>
  )
}
