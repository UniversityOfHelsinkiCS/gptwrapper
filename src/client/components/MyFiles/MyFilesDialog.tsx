import ExpandMore from '@mui/icons-material/ExpandMore'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { focusIndicatorStyle } from '../../util/accessibility'
import safeLocalStorage from '../../util/safeLocalStorage'
import {
  ensureReservedFolders,
  importFiles,
  intoFolder,
  sourcesFromDataTransfer,
  sourcesFromFiles,
  type ImportResult,
  type ImportSource,
} from '../../util/myFiles/importFiles'
import { downloadMyFile, saveBlob } from '../../util/myFiles/download'
import { exportAgentNotes, NOTES_ZIP_FILE_NAME, NotesZipError, readAgentNotesZip, replaceAgentNotes, type NotesZipFile } from '../../util/myFiles/notesZip'
import { AGENT_NOTES_FOLDER, OUTPUTS_FOLDER, RESERVED_FOLDERS, baseName, isReservedPath } from '../../util/myFiles/paths'
import type { MyFilesEntry, MyFilesStore } from '../../util/myFiles/store'
import ConfirmDialog from '../ChatV2/general/ConfirmDialog'
import { useMyFilesStore } from './MyFilesStoreContext'

const PERSIST_REQUESTED_KEY = 'myFilesPersistRequested'

const formatBytes = (bytes: number, locale: string) => {
  const units = ['B', 'kB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value)} ${units[unit]}`
}

/** Asks the browser once (per browser) not to evict the store under storage pressure. The answer is not shown: browsers decide silently. */
const requestPersistenceOnce = async () => {
  if (safeLocalStorage.getItem(PERSIST_REQUESTED_KEY) || !navigator.storage?.persist) return
  safeLocalStorage.setItem(PERSIST_REQUESTED_KEY, 'true')
  try {
    if (!(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // Not fatal: the store works without persistence, it is just evictable.
  }
}

interface FolderGroup {
  name: string
  reserved: boolean
  files: MyFilesEntry[]
  size: number
}

const groupEntries = (entries: MyFilesEntry[]) => {
  const folders = new Map<string, FolderGroup>()
  const rootFiles: MyFilesEntry[] = []
  for (const entry of entries) {
    const [top, ...rest] = entry.path.split('/')
    if (!rest.length) {
      if (entry.kind === 'file') rootFiles.push(entry)
      else if (!folders.has(top)) folders.set(top, { name: top, reserved: isReservedPath(top), files: [], size: 0 })
      continue
    }
    const group = folders.get(top) ?? { name: top, reserved: isReservedPath(top), files: [], size: 0 }
    folders.set(top, group)
    if (entry.kind === 'file') {
      group.files.push(entry)
      group.size += entry.size
    }
  }
  // Reserved folders come last, in their fixed order.
  const sorted = [...folders.values()].sort((a, b) => {
    if (a.reserved !== b.reserved) return a.reserved ? 1 : -1
    if (a.reserved) return RESERVED_FOLDERS.indexOf(a.name as never) - RESERVED_FOLDERS.indexOf(b.name as never)
    return a.name.localeCompare(b.name)
  })
  return { folders: sorted, rootFiles }
}

type FileStatus = 'added' | 'updated'

const rowSx = {
  flex: 1,
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  gap: 1,
  textAlign: 'left',
  p: 0.75,
  borderRadius: '0.5rem',
  font: 'inherit',
  color: 'inherit',
} as const

const FileTable = ({
  files,
  stripPrefix,
  statuses,
  label,
  actions,
  details,
}: {
  files: MyFilesEntry[]
  stripPrefix: string
  statuses: Map<string, FileStatus>
  label: string
  /** Buttons for each file (download, view), in a column of their own. */
  actions?: (file: MyFilesEntry) => ReactNode
  /** Shown in a row under the file when not null, e.g. the text of a note. */
  details?: (file: MyFilesEntry) => ReactNode
}) => {
  const { t, i18n } = useTranslation()
  const columns = actions ? 4 : 3
  return (
    <Table size="small" aria-label={label}>
      <TableHead>
        <TableRow>
          <TableCell>{t('myFiles:name')}</TableCell>
          <TableCell align="right">{t('myFiles:size')}</TableCell>
          <TableCell>{t('myFiles:modified')}</TableCell>
          {actions && (
            <TableCell>
              <Box component="span" sx={visuallyHidden}>
                {t('myFiles:actions')}
              </Box>
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {files.flatMap((file) => {
          const status = statuses.get(file.path)
          const detail = details?.(file)
          return [
            <TableRow key={file.path} data-testid="my-files-file" data-path={file.path} data-status={status}>
              <TableCell sx={{ wordBreak: 'break-word' }}>
                {stripPrefix ? file.path.slice(stripPrefix.length + 1) : file.path}
                {status && (
                  <Chip
                    size="small"
                    sx={{ ml: 1 }}
                    color={status === 'updated' ? 'info' : 'success'}
                    label={t(status === 'updated' ? 'myFiles:statusUpdated' : 'myFiles:statusAdded')}
                  />
                )}
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {formatBytes(file.size, i18n.language)}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(file.lastModified).toLocaleString(i18n.language)}</TableCell>
              {actions && <TableCell sx={{ whiteSpace: 'nowrap' }}>{actions(file)}</TableCell>}
            </TableRow>,
            ...(detail
              ? [
                  <TableRow key={`${file.path}-details`}>
                    <TableCell colSpan={columns}>{detail}</TableCell>
                  </TableRow>,
                ]
              : []),
          ]
        })}
      </TableBody>
    </Table>
  )
}

/** The text of a note in `Agent notes/`, read when it is opened. */
const NoteText = ({ store, path }: { store: MyFilesStore; path: string }) => {
  const { t } = useTranslation()
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    store.readText(path).then(
      (value) => !cancelled && setText(value),
      () => !cancelled && setFailed(true),
    )
    return () => {
      cancelled = true
    }
  }, [store, path])

  if (failed) return <Typography color="error">{t('myFiles:error')}</Typography>
  if (text === null) return <LinearProgress aria-label={t('common:loading')} />
  return (
    <Box
      component="pre"
      tabIndex={0}
      aria-label={t('myFiles:noteContent', { name: baseName(path), interpolation: { escapeValue: false } })}
      data-testid="my-files-note-text"
      sx={{
        m: 0,
        p: 1,
        maxHeight: '20rem',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        bgcolor: 'action.hover',
        borderRadius: '0.5rem',
        ...focusIndicatorStyle(),
      }}
    >
      {text}
    </Box>
  )
}

const FolderItem = ({
  folder,
  statuses,
  onSync,
  disabled,
  store,
  onExportNotes,
  onImportNotes,
  onDownloadError,
}: {
  folder: FolderGroup
  statuses: Map<string, FileStatus>
  onSync: (folder: string) => void
  disabled: boolean
  store: MyFilesStore
  onExportNotes: () => void
  onImportNotes: () => void
  onDownloadError: () => void
}) => {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<string[]>([])
  const isOutputs = folder.name === OUTPUTS_FOLDER
  const isNotes = folder.name === AGENT_NOTES_FOLDER
  const params = { interpolation: { escapeValue: false } }

  const download = async (path: string) => {
    try {
      await downloadMyFile(store, path)
    } catch {
      onDownloadError()
    }
  }

  const actions = isOutputs
    ? (file: MyFilesEntry) => (
        <Button
          size="small"
          onClick={() => void download(file.path)}
          aria-label={t('myFiles:downloadNamed', { ...params, name: file.name })}
          data-testid="my-files-download"
        >
          {t('myFiles:download')}
        </Button>
      )
    : isNotes
      ? (file: MyFilesEntry) => {
          const shown = viewing.includes(file.path)
          return (
            <Button
              size="small"
              aria-expanded={shown}
              onClick={() => setViewing((current) => (shown ? current.filter((p) => p !== file.path) : [...current, file.path]))}
              aria-label={t(shown ? 'myFiles:hideNoteNamed' : 'myFiles:viewNoteNamed', { ...params, name: file.name })}
              data-testid="my-files-view-note"
            >
              {t(shown ? 'myFiles:hideNote' : 'myFiles:viewNote')}
            </Button>
          )
        }
      : undefined
  const details = isNotes ? (file: MyFilesEntry) => (viewing.includes(file.path) ? <NoteText store={store} path={file.path} /> : null) : undefined
  const contentId = useId()
  const hasFiles = folder.files.length > 0
  const label = (
    <>
      <FolderOutlined fontSize="small" aria-hidden />
      <Box component="span" sx={{ fontWeight: 'bold', wordBreak: 'break-word' }}>
        {folder.name}
      </Box>
      <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {t('myFiles:folderSummary', { files: folder.files.length, size: formatBytes(folder.size, i18n.language) })}
      </Box>
    </>
  )

  return (
    <Box component="li" data-testid="my-files-folder" data-folder={folder.name} sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {hasFiles ? (
          <ButtonBase
            aria-expanded={open}
            aria-controls={open ? contentId : undefined}
            onClick={() => setOpen((value) => !value)}
            sx={{ ...rowSx, '&:hover': { backgroundColor: 'action.hover' }, ...focusIndicatorStyle() }}
          >
            {label}
            <ExpandMore fontSize="small" aria-hidden sx={{ ml: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </ButtonBase>
        ) : (
          // An empty folder has nothing to expand, so it is plain text rather than a button.
          <Box sx={rowSx}>{label}</Box>
        )}
        {folder.reserved ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
            {t('myFiles:reserved')}
          </Typography>
        ) : (
          <Button size="small" onClick={() => onSync(folder.name)} disabled={disabled} aria-label={t('myFiles:syncFolderNamed', { name: folder.name })}>
            {t('myFiles:syncFolder')}
          </Button>
        )}
      </Box>
      {isNotes && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pl: 4, pb: 0.5 }}>
          <Button size="small" variant="outlined" onClick={onExportNotes} disabled={disabled || !hasFiles} data-testid="my-files-export-notes">
            {t('myFiles:exportNotes')}
          </Button>
          <Button size="small" variant="outlined" onClick={onImportNotes} disabled={disabled} data-testid="my-files-import-notes">
            {t('myFiles:importNotes')}
          </Button>
        </Box>
      )}
      {open && hasFiles && (
        <Box id={contentId} sx={{ pl: 4, pb: 1 }}>
          <FileTable files={folder.files} stripPrefix={folder.name} statuses={statuses} label={folder.name} actions={actions} details={details} />
        </Box>
      )}
    </Box>
  )
}

const resultStatuses = (result: ImportResult | null) => {
  const statuses = new Map<string, FileStatus>()
  for (const path of result?.added ?? []) statuses.set(path, 'added')
  for (const path of result?.updated ?? []) statuses.set(path, 'updated')
  return statuses
}

const MyFilesContent = ({ store }: { store: MyFilesStore }) => {
  const { t, i18n } = useTranslation()
  const [entries, setEntries] = useState<MyFilesEntry[] | null>(null)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const [pendingImport, setPendingImport] = useState<{ name: string; files: NotesZipFile[] } | null>(null)
  const notesZipInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const filesInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const syncTargetRef = useRef<string | null>(null)
  const busy = progress !== null

  const refresh = useCallback(async () => {
    try {
      setEntries(await store.list('', { recursive: true }))
      setEstimate((await navigator.storage?.estimate?.()) ?? null)
    } catch {
      setError(true)
    }
  }, [store])

  useEffect(() => {
    void (async () => {
      await requestPersistenceOnce()
      try {
        await ensureReservedFolders(store)
      } catch {
        setError(true)
      }
      await refresh()
    })()
  }, [store, refresh])

  const runImport = async (sources: ImportSource[]) => {
    if (!sources.length) return
    setError(false)
    setNotice(null)
    setResult(null)
    setProgress({ done: 0, total: sources.length })
    try {
      setResult(await importFiles(store, sources, { onProgress: (done, total) => setProgress({ done, total }) }))
    } catch {
      setError(true)
    } finally {
      setProgress(null)
      await refresh()
    }
  }

  const handleInputChange = (input: HTMLInputElement | null) => {
    if (!input?.files) return
    let sources = sourcesFromFiles(input.files)
    const target = syncTargetRef.current
    if (input === folderInputRef.current && target) sources = intoFolder(sources, target)
    syncTargetRef.current = null
    // Cleared so that picking the same selection again fires change again.
    input.value = ''
    void runImport(sources)
  }

  const pickFolder = (syncTarget: string | null) => {
    syncTargetRef.current = syncTarget
    folderInputRef.current?.click()
  }

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    if (busy) return
    const sources = await sourcesFromDataTransfer(event.dataTransfer)
    await runImport(sources)
  }

  const handleExportNotes = async () => {
    setNotice(null)
    try {
      saveBlob(await exportAgentNotes(store), NOTES_ZIP_FILE_NAME)
    } catch {
      setError(true)
    }
  }

  const zipErrorText = (error: unknown) => {
    if (!(error instanceof NotesZipError)) return t('myFiles:importNotesInvalid')
    switch (error.code) {
      case 'invalid_path':
        return t('myFiles:importNotesInvalidPath', { path: error.path ?? '', interpolation: { escapeValue: false } })
      case 'too_large':
        return t('myFiles:importNotesTooLarge')
      case 'too_many_files':
        return t('myFiles:importNotesTooMany')
      case 'empty':
        return t('myFiles:importNotesEmpty')
      default:
        return t('myFiles:importNotesInvalid')
    }
  }

  /** Checks the picked zip first; the notes are replaced only after the student confirms. */
  const handleNotesZip = async (input: HTMLInputElement) => {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setNotice(null)
    setResult(null)
    try {
      const files = await readAgentNotesZip(file)
      if (files.length === 0) throw new NotesZipError('empty')
      setPendingImport({ name: file.name, files })
    } catch (zipError) {
      setNotice({ text: zipErrorText(zipError), error: true })
    }
  }

  const confirmImport = async () => {
    const pending = pendingImport
    setPendingImport(null)
    if (!pending) return
    try {
      await replaceAgentNotes(store, pending.files)
      setNotice({ text: t('myFiles:importNotesDone', { files: pending.files.length }) })
    } catch {
      setError(true)
    }
    await refresh()
  }

  const handleClear = async () => {
    setConfirmClear(false)
    setResult(null)
    try {
      await store.clear()
      await ensureReservedFolders(store)
    } catch {
      setError(true)
    }
    await refresh()
  }

  const { folders, rootFiles } = useMemo(() => groupEntries(entries ?? []), [entries])
  const statuses = useMemo(() => resultStatuses(result), [result])
  const hasUserFiles = folders.some((folder) => !folder.reserved || folder.files.length) || rootFiles.length > 0

  return (
    <>
      <DialogContentText sx={{ mb: 1 }}>{t('myFiles:intro')}</DialogContentText>
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('myFiles:cacheNotice')}
      </Alert>

      <input
        ref={filesInputRef}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        aria-label={t('myFiles:addFiles')}
        onChange={(event) => handleInputChange(event.currentTarget)}
        data-testid="my-files-input-files"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        aria-label={t('myFiles:addFolder')}
        // React has no typed prop for the folder picker attribute.
        {...({ webkitdirectory: '' } as object)}
        onChange={(event) => handleInputChange(event.currentTarget)}
        data-testid="my-files-input-folder"
      />

      <Box
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        data-testid="my-files-drop-zone"
        sx={{
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? 'action.hover' : 'transparent',
          borderRadius: '0.75rem',
          p: 2,
          mb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Button variant="contained" disableElevation onClick={() => filesInputRef.current?.click()} disabled={busy} data-testid="my-files-add-files">
          {t('myFiles:addFiles')}
        </Button>
        <Button variant="outlined" onClick={() => pickFolder(null)} disabled={busy} data-testid="my-files-add-folder">
          {t('myFiles:addFolder')}
        </Button>
        <Typography variant="body2" color="text.secondary">
          {t('myFiles:dropHint')}
        </Typography>
      </Box>

      <input
        ref={notesZipInputRef}
        type="file"
        accept=".zip,application/zip"
        hidden
        tabIndex={-1}
        aria-label={t('myFiles:importNotes')}
        onChange={(event) => void handleNotesZip(event.currentTarget)}
        data-testid="my-files-input-notes-zip"
      />

      <Box role="status" aria-live="polite" data-testid="my-files-status" sx={{ mb: 2 }}>
        {notice && (
          <Typography variant="body2" color={notice.error ? 'error' : undefined}>
            {notice.text}
          </Typography>
        )}
        {progress && (
          <>
            <Typography variant="body2">{t('myFiles:copying', { done: progress.done, total: progress.total })}</Typography>
            <LinearProgress variant="determinate" value={progress.total ? (100 * progress.done) / progress.total : 0} aria-hidden />
          </>
        )}
        {result && (
          <Typography variant="body2">
            {t('myFiles:result', { added: result.added.length, updated: result.updated.length, skipped: result.skipped.length })}
            {result.refused.length > 0 && <> {t('myFiles:refused', { refused: result.refused.length })}</>}
          </Typography>
        )}
        {error && (
          <Typography variant="body2" color="error">
            {t('myFiles:error')}
          </Typography>
        )}
      </Box>

      {entries === null ? (
        <LinearProgress aria-label={t('common:loading')} />
      ) : (
        <>
          {!hasUserFiles && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('myFiles:empty')}
            </Typography>
          )}
          <Box component="ul" aria-label={t('myFiles:folders')} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {folders.map((folder) => (
              <FolderItem
                key={folder.name}
                folder={folder}
                statuses={statuses}
                onSync={pickFolder}
                disabled={busy}
                store={store}
                onExportNotes={() => void handleExportNotes()}
                onImportNotes={() => notesZipInputRef.current?.click()}
                onDownloadError={() => setNotice({ text: t('myFiles:downloadFailed'), error: true })}
              />
            ))}
          </Box>
          {rootFiles.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <FileTable files={rootFiles} stripPrefix="" statuses={statuses} label={t('myFiles:looseFiles')} />
            </Box>
          )}
        </>
      )}

      {estimate?.usage !== undefined && estimate.quota !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} data-testid="my-files-usage">
          {t('myFiles:usage', { used: formatBytes(estimate.usage, i18n.language), quota: formatBytes(estimate.quota, i18n.language) })}
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        <Button color="error" variant="outlined" onClick={() => setConfirmClear(true)} disabled={busy || !hasUserFiles} data-testid="my-files-clear">
          {t('myFiles:clear')}
        </Button>
      </Box>

      <ConfirmDialog
        open={confirmClear}
        title={t('myFiles:clearConfirmTitle')}
        message={t('myFiles:clearConfirmMessage')}
        confirmText={t('myFiles:clear')}
        onCancel={() => setConfirmClear(false)}
        onConfirm={handleClear}
      />
      <ConfirmDialog
        open={pendingImport !== null}
        title={t('myFiles:importNotesConfirmTitle')}
        message={t('myFiles:importNotesConfirmMessage', {
          files: pendingImport?.files.length ?? 0,
          name: pendingImport?.name ?? '',
          interpolation: { escapeValue: false },
        })}
        confirmText={t('myFiles:importNotesConfirm')}
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmImport}
      />
    </>
  )
}

/** The My files dialog: the student's files cached in this browser (OPFS). Admin-only and not in embedded mode; the caller decides. */
const MyFilesDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation()
  const store = useMyFilesStore()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" data-testid="my-files-dialog">
      <DialogTitle>{t('myFiles:title')}</DialogTitle>
      <DialogContent>{store ? <MyFilesContent store={store} /> : <Alert severity="warning">{t('myFiles:unsupported')}</Alert>}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid="my-files-close">
          {t('common:close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MyFilesDialog
