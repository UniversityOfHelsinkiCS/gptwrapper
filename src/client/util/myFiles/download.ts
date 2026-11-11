import { baseName } from './paths'
import type { MyFilesStore } from './store'

/** Lets the browser save `blob` as a download named `name`. */
export const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  // After the click has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Downloads a file from My files under its own name. Throws the store's `not_found` when it is gone. */
export const downloadMyFile = async (store: MyFilesStore, path: string) => {
  const bytes = await store.readBytes(path)
  saveBlob(new Blob([bytes as BlobPart]), baseName(path))
}
