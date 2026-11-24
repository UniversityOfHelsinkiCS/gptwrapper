import ArrowDropDown from '@mui/icons-material/ArrowDropDown'
import Check from '@mui/icons-material/Check'
import Close from '@mui/icons-material/Close'
import { Button, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, Typography } from '@mui/material'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { baseName, parentPath } from '../../util/myFiles/paths'

/**
 * The viewer's heading: the open file's name, with its full path in a tooltip. With two or more files in the chat it is
 * a menu button (▾) listing them, the open one checked: picking one switches to it, and each can be removed from the
 * chat, with its ✕ (mouse) or Delete / Backspace on the focused item (keyboard; the ✕ is not focusable, so the arrow
 * keys move between files as in any menu). The menu stays open while files are removed, so the last one can be removed
 * too. `onFocusFallback` is called when the menu closes without its button (one file left), to put the focus somewhere.
 */
const FileTitleMenu = ({
  titleId,
  path,
  files,
  onSwitch,
  onRemove,
  onFocusFallback,
}: {
  titleId: string
  path: string
  files: string[]
  onSwitch: (path: string) => void
  onRemove: (path: string) => void
  onFocusFallback: () => void
}) => {
  const { t } = useTranslation()
  const menuId = useId()
  const hintId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const name = baseName(path)
  const hasMenu = files.length >= 2
  const menuOpen = open && files.length > 0
  const named = (file: string) => ({ name: baseName(file), interpolation: { escapeValue: false } })

  // Once the menu has closed, the focus goes back to its button (or elsewhere when the button is gone), unless a file
  // was picked: the viewer takes the focus then.
  const restoreFocus = useRef(false)
  const close = () => {
    restoreFocus.current = true
    setOpen(false)
  }
  const onExited = () => {
    if (!restoreFocus.current) return
    restoreFocus.current = false
    if (buttonRef.current?.isConnected) buttonRef.current.focus()
    else onFocusFallback()
  }

  const switchTo = (file: string) => {
    restoreFocus.current = file === path
    setOpen(false)
    if (file !== path) onSwitch(file)
  }

  // Removing an item moves the focus to the one now at its place (or the last one).
  const remove = (file: string) => {
    const index = files.indexOf(file)
    const remaining = files.filter((other) => other !== file)
    onRemove(file)
    if (remaining.length === 0) return
    const next = remaining[Math.min(index, remaining.length - 1)]
    requestAnimationFrame(() => document.getElementById(`${menuId}-${remaining.indexOf(next)}`)?.focus())
  }

  const onItemKeyDown = (event: KeyboardEvent, file: string) => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return
    event.preventDefault()
    event.stopPropagation()
    remove(file)
  }

  const heading = (
    <Tooltip title={path} describeChild>
      <Typography id={titleId} component="h2" variant="subtitle1" fontWeight={600} noWrap sx={{ minWidth: 0 }}>
        {hasMenu ? (
          <Button
            ref={buttonRef}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            endIcon={<ArrowDropDown />}
            onClick={() => setOpen(true)}
            data-testid="file-viewer-files-button"
            sx={{ font: 'inherit', textTransform: 'none', color: 'inherit', maxWidth: '100%', minWidth: 0, px: 1, ml: -1 }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          </Button>
        ) : (
          name
        )}
      </Typography>
    </Tooltip>
  )

  return (
    <>
      {heading}
      {(hasMenu || menuOpen) && (
        <span id={hintId} hidden>
          {t('fileViewer:filesMenuHint')}
        </span>
      )}
      <Menu
        open={menuOpen}
        anchorEl={() => buttonRef.current ?? document.getElementById(titleId)!}
        onClose={close}
        disableRestoreFocus
        slotProps={{ list: { id: menuId, 'aria-describedby': hintId, 'aria-label': t('fileViewer:filesMenu') }, transition: { onExited } }}
        data-testid="file-viewer-files-menu"
      >
        {files.map((file, index) => {
          const current = file === path
          return (
            <MenuItem
              key={file}
              id={`${menuId}-${index}`}
              role="menuitemradio"
              aria-checked={current}
              selected={current}
              aria-keyshortcuts="Delete"
              onClick={() => switchTo(file)}
              onKeyDown={(event) => onItemKeyDown(event, file)}
              data-testid="file-viewer-files-item"
              data-path={file}
              sx={{ maxWidth: 400 }}
            >
              <ListItemIcon>{current && <Check fontSize="small" />}</ListItemIcon>
              <ListItemText
                primary={baseName(file)}
                secondary={parentPath(file) || t('myFiles:title')}
                slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                sx={{ minWidth: 0 }}
              />
              {/* Mouse only: the keyboard removes with Delete, which keeps the arrow keys moving between files. */}
              <Tooltip title={t('fileViewer:removeFile', named(file))}>
                <IconButton
                  size="small"
                  edge="end"
                  tabIndex={-1}
                  aria-hidden
                  onClick={(event) => {
                    event.stopPropagation()
                    remove(file)
                  }}
                  data-testid="file-viewer-files-remove"
                  sx={{ ml: 1 }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Tooltip>
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export default FileTitleMenu
