import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import Markdown from '../Banner/Markdown'

export const Disclaimer = ({ disclaimer }: { disclaimer: string }) => {
  const [disclaimerStatus, setDisclaimerStatus] = useLocalStorageState<{
    open: boolean
  }>('disclaimer-status', { open: true })

  return (
    <>
      <Button variant="outlined" onClick={() => setDisclaimerStatus({ open: true })} size="small">
        Disclaimer
      </Button>
      <Dialog open={disclaimerStatus.open} onClose={() => setDisclaimerStatus({ open: false })}>
        <DialogTitle>Disclaimer</DialogTitle>
        <DialogContent>
          <Markdown>{disclaimer}</Markdown>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisclaimerStatus({ open: false })} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
