import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import Markdown from '../Banner/Markdown'

export const Disclaimer = ({ disclaimer }: { disclaimer: string }) => {
  const [disclaimerClosed, setDisclaimerClosed] = useLocalStorageState<boolean>(
    'disclaimerClosed',
    false
  )

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => setDisclaimerClosed(false)}
        size="small"
      >
        Disclaimer
      </Button>
      <Dialog
        open={!disclaimerClosed}
        onClose={() => setDisclaimerClosed(true)}
      >
        <DialogTitle>Disclaimer</DialogTitle>
        <DialogContent>
          <Markdown>{disclaimer}</Markdown>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisclaimerClosed(true)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
