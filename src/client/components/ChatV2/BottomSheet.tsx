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
    const modal = bottomSheetContentId ? modalsRegister[bottomSheetContentId] : null

    if (!bottomSheetContentId || !modal) return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '2rem' }}>
            <Typography variant='h6'>Invalid modal register</Typography>
        </Box>
    )

    return (
        <Box sx={{ p: '2rem' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: '2rem' }}>
                <Typography variant="h6">{modal.name}</Typography>
                <OutlineButtonBlack onClick={() => setBottomSheetContentId(null)}>
                    <ExpandMoreIcon />
                </OutlineButtonBlack>
            </Box>

            <Box>
                {React.createElement(modal.component)}
            </Box>
        </Box>
    )
}