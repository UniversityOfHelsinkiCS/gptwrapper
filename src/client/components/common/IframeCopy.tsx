import { IconButton, Tooltip } from '@mui/material'
import HtmlIcon from '@mui/icons-material/Html'
import { useTranslation } from 'react-i18next'

export const IframeCopy = ({ courseId, promptId, model }: { courseId: string; promptId?: string; model?: string }) => {
  const { t } = useTranslation()

  let iframeSrc = `${window.location.origin}/${courseId}?embedded=true`

  if (promptId) {
    iframeSrc += `&promptId=${promptId}`
  }

  if (model) {
    iframeSrc += `&model=${model}`
  }

  const iframeHtml = `<iframe src="${iframeSrc}" width="100%" height="500px"></iframe>`

  return (
    <Tooltip
      title={t('common:iframeCopy', { iframeHtml })}
      slotProps={{
        tooltip: {
          sx: {
            // maxWidth: 'none',
            whiteSpace: 'pre-wrap',
            // wordWrap: 'break-word',
          },
        },
      }}
    >
      <IconButton onClick={() => navigator.clipboard.writeText(iframeHtml)}>
        <HtmlIcon />
      </IconButton>
    </Tooltip>
  )
}
