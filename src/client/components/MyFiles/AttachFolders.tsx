import CheckBox from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank'
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import { Chip, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_ATTACHED_FOLDERS } from '../../../shared/fileTools'
import { isReservedPath } from '../../util/myFiles/paths'
import type { MyFilesStore } from '../../util/myFiles/store'

/** The student's own top-level folders in My files, which can be attached to a chat (not `Outputs` or `Agent notes`). */
export const listAttachableFolders = async (store: MyFilesStore): Promise<string[]> =>
  (await store.list(''))
    .filter((entry) => entry.kind === 'directory' && !isReservedPath(entry.path))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))

/**
 * Attaches My files folders to the chat, for the agent's file tools: a button with a menu of the folders, and a chip
 * per attached folder to detach it. The chips stay for folders no longer in My files, so the student sees them.
 */
export const AttachFolders = ({
  store,
  attachedFolders,
  onChange,
}: {
  store: MyFilesStore
  attachedFolders: string[]
  onChange: (folders: string[]) => void
}) => {
  const { t } = useTranslation()
  const menuId = useId()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [folders, setFolders] = useState<string[] | null>(null)
  const [failed, setFailed] = useState(false)

  const openMenu = (element: HTMLElement) => {
    setAnchor(element)
    setFailed(false)
    listAttachableFolders(store).then(setFolders, (error) => {
      console.error('Failed to list My files folders:', error)
      setFolders([])
      setFailed(true)
    })
  }

  const toggle = (folder: string) => {
    if (attachedFolders.includes(folder)) onChange(attachedFolders.filter((f) => f !== folder))
    else if (attachedFolders.length < MAX_ATTACHED_FOLDERS) onChange([...attachedFolders, folder])
  }

  return (
    <>
      <Tooltip title={t('myFiles:attachFolders')} arrow placement="top" describeChild>
        <IconButton
          aria-label={t('myFiles:attachFolders')}
          aria-haspopup="menu"
          aria-expanded={!!anchor}
          aria-controls={anchor ? menuId : undefined}
          onClick={(event) => openMenu(event.currentTarget)}
          data-testid="attach-folders-button"
        >
          <CreateNewFolderOutlined />
        </IconButton>
      </Tooltip>
      <Menu id={menuId} anchorEl={anchor} open={!!anchor && folders !== null} onClose={() => setAnchor(null)}>
        {folders?.length === 0 && (
          <MenuItem disabled>
            <ListItemText>{t(failed ? 'myFiles:error' : 'myFiles:noFoldersToAttach')}</ListItemText>
          </MenuItem>
        )}
        {folders?.map((folder) => {
          const attached = attachedFolders.includes(folder)
          return (
            <MenuItem
              key={folder}
              role="menuitemcheckbox"
              aria-checked={attached}
              onClick={() => toggle(folder)}
              disabled={!attached && attachedFolders.length >= MAX_ATTACHED_FOLDERS}
              data-testid="attach-folder-option"
              data-folder={folder}
            >
              <ListItemIcon aria-hidden>{attached ? <CheckBox fontSize="small" /> : <CheckBoxOutlineBlank fontSize="small" />}</ListItemIcon>
              <ListItemText>{folder}</ListItemText>
            </MenuItem>
          )
        })}
      </Menu>
      {attachedFolders.map((folder) => (
        <Chip
          key={folder}
          sx={{ borderRadius: 100, maxWidth: '14rem' }}
          icon={<FolderOutlined aria-hidden />}
          label={folder}
          onDelete={() => onChange(attachedFolders.filter((f) => f !== folder))}
          aria-label={[t('myFiles:attachedFolder', { name: folder }), t('myFiles:detachFolder')].join(', ')}
          data-testid="attached-folder"
          data-folder={folder}
        />
      ))}
    </>
  )
}

/** The attached folders stored with a chat, cleaned of anything that is not a folder name. */
export const parseStoredFolders = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((folder): folder is string => typeof folder === 'string' && folder.length > 0 && !folder.includes('/')))].slice(
        0,
        MAX_ATTACHED_FOLDERS,
      )
    : []
