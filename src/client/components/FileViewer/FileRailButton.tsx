import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import { Tooltip } from '@mui/material'
import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { baseName } from '../../util/myFiles/paths'
import { TextButton } from '../ChatV2/general/Buttons'

/** The minimized file viewer in the right-hand rail: a button that expands it back to `path`. */
const FileRailButton = ({ path, onExpand, buttonRef }: { path: string; onExpand: () => void; buttonRef?: Ref<HTMLButtonElement> }) => {
  const { t } = useTranslation()
  const label = t('fileViewer:expandNamed', { name: baseName(path), interpolation: { escapeValue: false } })
  return (
    <Tooltip arrow placement="left" title={label} describeChild>
      <TextButton ref={buttonRef} aria-label={label} data-testid="file-viewer-expand" onClick={onExpand}>
        <DescriptionOutlined />
      </TextButton>
    </Tooltip>
  )
}

export default FileRailButton
