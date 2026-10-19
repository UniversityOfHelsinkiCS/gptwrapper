// Helper function to save file with proper "Save As" dialog. Returns false if the user cancelled the dialog
export const saveFileWithDialog = async (blob: Blob, filename: string, accept: Record<string, string[]>): Promise<boolean> => {
  // Check if File System Access API is supported
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'File',
          accept: accept,
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return true
    } catch (err: any) {
      if (err.name === 'AbortError') return false
      // Error occurred, fall back to regular download
      console.error('Error saving file:', err)
    }
  }

  // Fallback for browsers that don't support File System Access API
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}