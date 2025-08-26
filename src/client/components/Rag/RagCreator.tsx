import { useState } from 'react'
import { useCreateRagIndexMutation } from './api'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'
import { useNavigate } from 'react-router-dom'
import type { Course } from '../../types'
import { useTranslation } from 'react-i18next'

export const RagCreator = ({ chatInstance }: { chatInstance: Course }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createIndexMutation = useCreateRagIndexMutation()
  const [indexName, setIndexName] = useState('')
  const [language, setLanguage] = useState<'Finnish' | 'English'>('English')
  const [open, setOpen] = useState(false)

  return (
    <>
      <OutlineButtonBlack onClick={() => setOpen(true)}>{t('rag:createNewIndex')}</OutlineButtonBlack>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            component: 'form',
            onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const newIndex = await createIndexMutation.mutateAsync({
                chatInstanceId: chatInstance?.id,
                indexName,
                language,
              })
              setIndexName('')
              navigate(`/rag/${newIndex.id}`)
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
              htmlInput: { minLength: 5 },
            }}
            sx={{ my: '2rem' }}
          />
          <FormControl fullWidth sx={{ my: '2rem' }}>
            <InputLabel id="language-label">{t('rag:language')}</InputLabel>
            <Select labelId="language-label" id="language-select" value={language} onChange={(e) => setLanguage(e.target.value as 'Finnish' | 'English')}>
              <MenuItem value={'Finnish'}>{t('rag:finnish')}</MenuItem>
              <MenuItem value={'English'}>{t('rag:english')}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <OutlineButtonBlack color="primary" type="submit">
            {t('rag:createIndex')}
          </OutlineButtonBlack>
        </DialogActions>
      </Dialog>
    </>
  )
}
