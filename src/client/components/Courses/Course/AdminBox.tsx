import { Box, Chip, type BoxProps } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { ORANGE } from '../../ChatV2/general/Buttons'

/** Frame for admin-only course controls: same orange as OrangeButton to set it apart from the controls teachers see */
export const AdminBox = ({ header, children, ...props }: BoxProps & { header: React.ReactNode }) => {
  const { t } = useTranslation()

  return (
    <Box
      {...props}
      sx={{ border: '1px solid', borderColor: ORANGE.main, borderRadius: '8px', mb: 3, px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {header}
        <Chip label={t('common:admin')} size="small" sx={{ ml: 'auto', fontWeight: 600, bgcolor: ORANGE.main, color: 'common.black' }} />
      </Box>
      {children}
    </Box>
  )
}
