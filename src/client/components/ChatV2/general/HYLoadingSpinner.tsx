import { Box, CircularProgress } from '@mui/material'
import hyLogo from '../../../assets/hy_logo.svg'

export default function HYLoadingSpinner() {

    return (<Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <Box
            component="img"
            src={hyLogo}
            alt="University of Helsinki"
            sx={{
                width: { xs: '140px', sm: '240px', md: '300px' },
                opacity: 0.2,
                m: '2.5rem 0',
            }}
        />
        <Box sx={{ display: 'flex' }}>
            <CircularProgress sx={{ color: "rgba(0,0,0,0.2)" }} />
        </Box>
    </Box>)

}
