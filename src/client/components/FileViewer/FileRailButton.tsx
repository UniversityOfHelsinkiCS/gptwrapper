import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import { Badge, Tooltip } from '@mui/material'
import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { baseName } from '../../util/myFiles/paths'
import { TextButton } from '../ChatV2/general/Buttons'

/**
 * The minimized file viewer in the right-hand rail: a button that expands it back to `path`. With `count` (the chat's
 * files) two or more, it has a badge with the count.
 */
const FileRailButton = ({
  path,
  count = 1,
  onExpand,
  buttonRef,
}: {
  path: string
  count?: number
  onExpand: () => void
  buttonRef?: Ref<HTMLButtonElement>
}) => {
  const { t } = useTranslation()
  const params = { name: baseName(path), count, interpolation: { escapeValue: false } }
  const label = count >= 2 ? t('fileViewer:expandNamedWithCount', params) : t('fileViewer:expandNamed', params)
  return (
    <Tooltip arrow placement="left" title={label} describeChild>
      <TextButton ref={buttonRef} aria-label={label} data-testid="file-viewer-expand" onClick={onExpand}>
        {/* Only with a count: a hidden zero would still be text in the button. */}
        {count >= 2 ? (
          <Badge badgeContent={count} color="primary">
            <DescriptionOutlined />
          </Badge>
        ) : (
          <DescriptionOutlined />
        )}
      </TextButton>
    </Tooltip>
  )
}

export default FileRailButton
