import { Box, Modal, Typography } from '@mui/material'
import React from 'react'
import { OutlineButtonBlack } from './general/Buttons'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ModalMap } from 'src/client/types';



export default function GeneralModal({
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
        p: '2rem',
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
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 2 }}>
          <Typography variant="h5">{name}</Typography>
          <OutlineButtonBlack onClick={() => setBottomSheetContentId(null)}>
            <ExpandMoreIcon />
          </OutlineButtonBlack>
        </Box>

        <Box>
          <Component {...props} />
        </Box>
      </Box>
    </Modal>
  )
}
