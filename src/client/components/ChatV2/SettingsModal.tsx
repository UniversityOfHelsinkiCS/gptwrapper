import { Close } from "@mui/icons-material"
import { Box, IconButton, Modal, Typography } from "@mui/material"





export const SettingsModal = ({open, setOpen}) => {
  return(
    <Modal open={open} onClose={() => setOpen(false)}>
    <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '85vw',
          minHeight: '70vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}
      >
        <IconButton
          onClick={() => setOpen(false)}
          sx={{ position: 'absolute', top: 8, right: 8, color: 'grey.500' }}
        >
          <Close></Close>
        </IconButton>
        <Typography id="modal-title" variant="h6" component="h2">
          Settings
        </Typography>
        
      
      </Box>
    </Modal>
  )
}