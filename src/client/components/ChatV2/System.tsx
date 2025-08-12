import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { useState } from 'react'
import { BlueButton } from './general/Buttons'

export const SystemPrompt = ({ content, setContent }: { content: string; setContent: (content: string) => void }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)} size="small">
        System prompt
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>System prompt</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            id="system-prompt"
            label="System prompt"
            placeholder="Type your system prompt here..."
            helperText="This is the system prompt that will be used to generate responses."
            type="text"
            fullWidth
            variant="standard"
            multiline
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <BlueButton onClick={() => setOpen(false)}>Close</BlueButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
