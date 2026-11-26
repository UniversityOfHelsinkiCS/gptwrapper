import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import { Box, Button, Link, Typography } from '@mui/material'
import { type ReactNode, useEffect, useId, useState } from 'react'
import type { Components } from 'react-markdown'
import { useTranslation } from 'react-i18next'
import type { AssistantPart } from '../../../../shared/agentChat'
import { isOutputWrite } from '../../../util/myFiles/agentTools'
import { downloadMyFile } from '../../../util/myFiles/download'
import { baseName, isWithin, normalizePath, OUTPUTS_FOLDER } from '../../../util/myFiles/paths'
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

export const outputPathOfHref = (href: string | undefined, outputPaths: string[] = []): string | undefined => {
  if (!href || href.startsWith('#') || /^(https?|mailto|tel):/i.test(href)) return undefined
  try {
    const withoutScheme = href.replace(/^[a-z][a-z0-9+.-]*:(\/\/)?/i, '')
    const segments = decodeURIComponent(withoutScheme.split(/[?#]/)[0]).split('/')
    const outputsAt = segments.indexOf(OUTPUTS_FOLDER)
    if (outputsAt !== -1) {
      const path = normalizePath(segments.slice(outputsAt).join('/'))
      return isWithin(path, OUTPUTS_FOLDER) && path !== OUTPUTS_FOLDER ? path : undefined
    }
    const name = segments.at(-1)
    const matches = name ? outputPaths.filter((path) => baseName(path) === name) : []
    return matches.length === 1 ? matches[0] : undefined
  } catch {
    return undefined
  }
}

const useOutputFileDownload = (path: string) => {
  const store = useMyFilesStore()
  const [missing, setMissing] = useState(false)

  const download = async () => {
    if (!store) return
    try {
      await downloadMyFile(store, path)
      setMissing(false)
    } catch (error) {
      if (!isMyFilesError(error)) console.error('Downloading an output file failed:', error)
      setMissing(true)
    }
  }

  return { download, missing }
}

const MissingFileStatus = ({ path, missing, inline = false }: { path: string; missing: boolean; inline?: boolean }) => {
  const { t } = useTranslation()
  return (
    <Typography component="span" role="status" variant="body2" color="error" sx={inline && missing ? { ml: 0.5 } : undefined}>
      {missing ? t('myFiles:fileMissing', { name: baseName(path), interpolation: { escapeValue: false } }) : ''}
    </Typography>
  )
}

export const OutputFileLink = ({ path, children }: { path: string; children: ReactNode }) => {
  const store = useMyFilesStore()
  const { download, missing } = useOutputFileDownload(path)
  if (!store) return <>{children}</>
  return (
    <>
      <Link component="button" onClick={() => void download()} data-testid="output-file-link" sx={{ verticalAlign: 'baseline', font: 'inherit' }}>
        {children}
      </Link>
      <MissingFileStatus path={path} missing={missing} inline />
    </>
  )
}

const IMAGE_TYPES: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export const OutputImage = ({ path, alt }: { path: string; alt?: string }) => {
  const store = useMyFilesStore()
  const type = IMAGE_TYPES[baseName(path).split('.').pop()?.toLowerCase() ?? '']
  // undefined while loading, null when the file could not be read.
  const [src, setSrc] = useState<string | null>()

  useEffect(() => {
    if (!store || !type) return
    let cancelled = false
    store
      .readBytes(path)
      .then((bytes) => readAsDataUrl(new Blob([bytes as BlobPart], { type })))
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(null))
    return () => {
      cancelled = true
    }
  }, [store, path, type])

  if (!store || !type || src === null) return <>{alt}</>
  return src ? <Box component="img" src={src} alt={alt ?? ''} data-testid="output-image" sx={{ maxWidth: '100%', height: 'auto' }} /> : null
}

type MarkedProps = { 'data-output-path'?: string }

/**
 * Markdown renderers for links and images that `remarkOutputLinks` marked as `Outputs/` files. Defined once, so the
 * element types stay the same across renders and a streamed token does not remount them (and re-read an image).
 */
export const outputFileComponents: Pick<Components, 'a' | 'img'> = {
  a: ({ node, ...rest }) => {
    const path = (rest as MarkedProps)['data-output-path']
    return path ? <OutputFileLink path={path}>{rest.children}</OutputFileLink> : <a {...rest} />
  },
  img: ({ node, ...rest }) => {
    const path = (rest as MarkedProps)['data-output-path']
    return path ? <OutputImage path={path} alt={rest.alt} /> : <img {...rest} />
  },
}

/** One output file: its path, Open (when the viewer can show it) and Download. */
const OutputFileItem = ({ path }: { path: string }) => {
  const { t } = useTranslation()
  const open = useOpenableFile(path)
  const name = baseName(path)
  const { download, missing } = useOutputFileDownload(path)
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
        onClick={() => void download()}
        aria-label={t('myFiles:downloadNamed', { name, interpolation: { escapeValue: false } })}
        data-testid="output-file-download"
      >
        {t('myFiles:download')}
      </Button>
      <MissingFileStatus path={path} missing={missing} />
    </Box>
  )
}

/** The files an answer wrote into `Outputs/`, listed under it with an Open button (for files the viewer shows) and a download button each. */
export const OutputFiles = ({ paths }: { paths: string[] }) => {
  const { t } = useTranslation()
  const store = useMyFilesStore()
  const labelId = useId()

  if (!store || paths.length === 0) return null

  return (
    <Box data-testid="output-files" sx={{ my: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '0.75rem' }}>
      <Typography id={labelId} variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {t('chat:outputFiles')}
      </Typography>
      <Box component="ul" aria-labelledby={labelId} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {paths.map((path) => (
          <OutputFileItem key={path} path={path} />
        ))}
      </Box>
    </Box>
  )
}
