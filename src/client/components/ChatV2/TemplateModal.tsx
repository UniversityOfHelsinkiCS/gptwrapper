import { Box, Modal, Typography } from '@mui/material'
import React from 'react'
import { TextButton } from './general/Buttons'
import { ModalMap } from 'src/client/types';
import CloseIcon from '@mui/icons-material/Close';



export default function ModalTemplate({
  open,
  setOpen,
  modalsRegister,
  bottomSheetContentId,
  setBottomSheetContentId,
}: {
  open: boolean,
  setOpen: (open: boolean) => void,
  modalsRegister: ModalMap,
  bottomSheetContentId: string | null
  setBottomSheetContentId: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const entry = bottomSheetContentId ? modalsRegister[bottomSheetContentId] : null

  // if (!bottomSheetContentId || !entry) return (
  //   <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '2rem' }}>
  //     <Typography variant='h6'>Invalid modal register</Typography>
  //   </Box>
  // )

  if (!bottomSheetContentId || !entry) return null

  const { name: name, component: Component, props = {} } = entry

  const handleClose = async () => {
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        // minWidth: 600,
        width: '85vw',
        maxWidth: 1200,
        minHeight: '80vh',
        maxHeight: '80vh',
        bgcolor: 'background.paper',
        boxShadow: 24,
        borderRadius: '0.3rem',
        overflow: 'auto',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '2rem', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 999 }}>
          <Typography variant="h5">{name}</Typography>
          <TextButton onClick={() => setBottomSheetContentId(null)}>
            <CloseIcon />
          </TextButton>
        </Box>

        <Box sx={{ p: '0 2rem 2rem 2rem' }}>
          <Component {...props} />
        </Box>
      </Box>
    </Modal>
  )
}
