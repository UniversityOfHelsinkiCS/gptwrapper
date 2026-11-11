import FolderOutlined from '@mui/icons-material/FolderOutlined'
import { Tooltip } from '@mui/material'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import type { User } from '../../types'
import { TextButton } from '../ChatV2/general/Buttons'

const MyFilesDialog = lazy(() => import('./MyFilesDialog'))

/**
 * Opens the My files dialog. Experimental: admins only, and never in embedded mode (iframe storage is partitioned,
 * so the files would not be the same as in the full app).
 */
const MyFilesButton = ({ user, collapsed = false }: { user?: User | null; collapsed?: boolean }) => {
  const { t } = useTranslation()
  const isEmbedded = useIsEmbedded()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  if (!user?.isAdmin || isEmbedded) return null

  const handleOpen = () => {
    setMounted(true)
    setOpen(true)
  }

  return (
    <>
      {collapsed ? (
        <Tooltip arrow placement="right" title={t('myFiles:title')} describeChild>
          <TextButton onClick={handleOpen} aria-label={t('myFiles:title')} aria-haspopup="dialog" data-testid="my-files-button">
            <FolderOutlined fontSize="small" />
          </TextButton>
        </Tooltip>
      ) : (
        <TextButton startIcon={<FolderOutlined />} onClick={handleOpen} aria-haspopup="dialog" size="large" data-testid="my-files-button">
          {t('myFiles:title')}
        </TextButton>
      )}
      {mounted && (
        <Suspense fallback={null}>
          <MyFilesDialog open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

export default MyFilesButton
