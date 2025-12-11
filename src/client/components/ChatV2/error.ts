import { t } from 'i18next'
import { enqueueSnackbar } from 'notistack'

/**
 * Handle error messages related to completion stream creation
 */
export const handleCompletionStreamError = (err: any, file: string) => {
  if (err?.name === 'AbortError' || !err) return

  // Extract error message and metadata from various possible structures
  const error = err?.error || err?.response?.data?.error || err?.response?.data || err.message
  const filename = err?.filename || err?.response?.data?.filename
  const numPages = err?.numPages || err?.response?.data?.numPages

  if (error === 'Model maximum context reached' && file) {
    enqueueSnackbar(t('error:tooLargeFile'), { variant: 'error' })
  } else if (error && typeof error === 'string' && file) {
    // Check for specific PDF parsing errors
    let errorMessage = error
    
    // Add file details if available
    if (filename && numPages) {
      errorMessage = `${error} (${filename}, ${numPages} pages)`
    } else if (filename) {
      errorMessage = `${error} (${filename})`
    }
    
    // Check for file size and page limit errors
    if (error.includes('File size exceeds') || error.includes('exceeds the')) {
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } else if (error.includes('too many pages') || error.includes('are limited to')) {
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } else if (error.includes('password-protected') || error.includes('encrypted')) {
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } else if (error.includes('no extractable text')) {
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } else if (error.includes('empty') || error.includes('corrupted')) {
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } else if (error.includes('invalid') || error.includes('corrupt')) {
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } else if (error.includes('parsing') || error.includes('Error parsing file')) {
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } else {
      enqueueSnackbar(t('error:fileParsingError'), { variant: 'error' })
    }
  } else if (error === 'TimeoutError') {
    enqueueSnackbar(t('error:waitingForResponse'), { variant: 'error' })
  } else {
    console.error('Unexpected error in completion stream: ', error)
    enqueueSnackbar(t('error:unexpected'), { variant: 'error' })
  }
}
