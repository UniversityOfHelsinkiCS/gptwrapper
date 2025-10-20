import { Box, Typography } from '@mui/material'
import React from 'react'
import { OutlineButtonBlack } from './general/Buttons'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BottomSheetContent } from 'src/client/types';



export default function BottomSheet({
    modalsRegister,
    bottomSheetContent,
    setBottomSheetContent,
}: {
    modalsRegister: Record<string, React.ComponentType>,
    bottomSheetContent: BottomSheetContent | null
    setBottomSheetContent: React.Dispatch<React.SetStateAction<BottomSheetContent | null>>
}) {
    const Content = bottomSheetContent ? modalsRegister[bottomSheetContent.id] : null

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: '2rem' }}>
                <Typography variant="h6">{bottomSheetContent?.name}</Typography>
                <OutlineButtonBlack onClick={() => setBottomSheetContent(null)}>
                    <ExpandMoreIcon />
                </OutlineButtonBlack>
            </Box>

            <Box sx={{ px: '2rem' }}>
                {Content ? <Content /> : 'undefined modal'}
            </Box>
        </Box>
    )
}