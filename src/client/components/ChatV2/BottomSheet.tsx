import { Box, Typography } from '@mui/material'
import React from 'react'
import { OutlineButtonBlack } from './general/Buttons'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ModalMap } from 'src/client/types';



export default function BottomSheet({
  modalsRegister,
  bottomSheetContentId,
  setBottomSheetContentId,
}: {
  modalsRegister: ModalMap,
  bottomSheetContentId: string | null
  setBottomSheetContentId: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const entry = bottomSheetContentId ? modalsRegister[bottomSheetContentId] : null

  if (!bottomSheetContentId || !entry) return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '2rem' }}>
      <Typography variant='h6'>Invalid modal register</Typography>
    </Box>
  )
  const { name: name, component: Component, props = {} } = entry
  return (
    <Box sx={{ p: '2rem' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: '2rem' }}>
        <Typography variant="h6">{name}</Typography>
        <OutlineButtonBlack onClick={() => setBottomSheetContentId(null)}>
          <ExpandMoreIcon />
        </OutlineButtonBlack>
      </Box>

      <Box>
        <Component {...props} />
      </Box>
    </Box>
  )
}
