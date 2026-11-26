import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import { Box, Button, Typography } from '@mui/material'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AssistantPart } from '../../../../shared/agentChat'
import { isOutputWrite } from '../../../util/myFiles/agentTools'
import { downloadMyFile } from '../../../util/myFiles/download'
import { baseName } from '../../../util/myFiles/paths'
import { isMyFilesError } from '../../../util/myFiles/store'
import { useOpenableFile } from '../../FileViewer/useOpenableFile'
import { useMyFilesStore } from '../../MyFiles/MyFilesStoreContext'

/** The `Outputs/` files that the answer wrote (or edited), in order, also from inside subagents. */
export const outputFilesOf = (parts: AssistantPart[]): string[] => {
  const paths: string[] = []
  const visit = (list: AssistantPart[]) => {
    for (const part of list) {
      if (part.type === 'tool' && part.status === 'ok' && isOutputWrite(part.result)) paths.push(part.result.path)
      else if (part.type === 'subagent') visit(part.parts)
    }
  }
  visit(parts)
  return [...new Set(paths)]
}

/** One output file: its path, Open (when the viewer can show it) and Download. */
const OutputFileRow = ({ path, missing, onDownload }: { path: string; missing: boolean; onDownload: () => void }) => {
  const { t } = useTranslation()
  const open = useOpenableFile(path)
  const name = baseName(path)
  return (
    <Box component="li" data-testid="output-file" data-path={path} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, py: 0.25 }}>
      <InsertDriveFileOutlined fontSize="small" aria-hidden />
      <Typography component="span" variant="body2" sx={{ wordBreak: 'break-word' }}>
        {path}
      </Typography>
      {open && (
        <Button
          size="small"
          color="inherit"
          variant="outlined"
          startIcon={<VisibilityOutlined aria-hidden />}
          onClick={() => open({ path }, 'agent_link')}
          aria-label={t('myFiles:openNamed', { name, interpolation: { escapeValue: false } })}
          data-testid="output-file-open"
        >
          {t('myFiles:open')}
        </Button>
      )}
      <Button
        size="small"
        color="inherit"
        variant="outlined"
        startIcon={<FileDownloadOutlined aria-hidden />}
        onClick={onDownload}
        aria-label={t('myFiles:downloadNamed', { name, interpolation: { escapeValue: false } })}
        data-testid="output-file-download"
      >
        {t('myFiles:download')}
      </Button>
      <Typography component="span" role="status" variant="body2" color="error">
        {missing ? t('myFiles:fileMissing', { name, interpolation: { escapeValue: false } }) : ''}
      </Typography>
    </Box>
  )
}

/** The files an answer wrote into `Outputs/`, listed under it with an Open button (for files the viewer shows) and a download button each. */
export const OutputFiles = ({ parts }: { parts: AssistantPart[] }) => {
  const { t } = useTranslation()
  const store = useMyFilesStore()
  const labelId = useId()
  const paths = useMemo(() => outputFilesOf(parts), [parts])
  const [missing, setMissing] = useState<string[]>([])

  if (!store || paths.length === 0) return null

  const download = async (path: string) => {
    try {
      await downloadMyFile(store, path)
      setMissing((current) => current.filter((p) => p !== path))
    } catch (error) {
      if (!isMyFilesError(error)) console.error('Downloading an output file failed:', error)
      setMissing((current) => (current.includes(path) ? current : [...current, path]))
    }
  }

  return (
    <Box data-testid="output-files" sx={{ my: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '0.75rem' }}>
      <Typography id={labelId} variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {t('chat:outputFiles')}
      </Typography>
      <Box component="ul" aria-labelledby={labelId} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {paths.map((path) => (
          <OutputFileRow key={path} path={path} missing={missing.includes(path)} onDownload={() => void download(path)} />
        ))}
      </Box>
    </Box>
  )
}
