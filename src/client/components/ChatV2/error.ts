import { t } from 'i18next'
import { enqueueSnackbar } from 'notistack'

/**
 * Handle error messages related to completion stream creation
 */
export const handleCompletionStreamError = (err: any, file: string) => {
  if (err?.name === 'AbortError' || !err) return

  const error = err?.response?.data || err.message

  if (error === 'Model maximum context reached' && file) {
    enqueueSnackbar(t('error:tooLargeFile'), { variant: 'error' })
  } else if (error && typeof error === 'string' && file) {
    // Check for specific PDF parsing errors
    if (error.includes('password-protected') || error.includes('encrypted')) {
      enqueueSnackbar(t('error:pdfEncrypted'), { variant: 'error' })
    } else if (error.includes('empty') || error.includes('corrupted')) {
      enqueueSnackbar(t('error:pdfEmpty'), { variant: 'error' })
    } else if (error.includes('invalid') || error.includes('corrupt')) {
      enqueueSnackbar(t('error:pdfInvalid'), { variant: 'error' })
    } else if (error.includes('parsing') || error.includes('Error parsing file')) {
      enqueueSnackbar(t('error:pdfParsingError'), { variant: 'error' })
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
