import { t } from 'i18next'
import { enqueueSnackbar } from 'notistack'

/**
 * Handle error messages related to completion stream creation
 */
export const handleCompletionStreamError = (err: any, file: string) => {
  if (err?.name === 'AbortError' || !err) return

  const error = err?.error || err?.response?.data?.error || err?.response?.data || err.message
  const filename = err?.filename || err?.response?.data?.filename
  const numPages = err?.numPages || err?.response?.data?.numPages

  if (error === 'Model maximum context reached' && file) {
    enqueueSnackbar(t('error:tooLargeFile'), { variant: 'error' })
  } else if (error && typeof error === 'string' && file) {
    let translatedMessage = ''

    if (error.includes('password-protected') || error.includes('encrypted')) {
      translatedMessage = t('error:pdfEncrypted')
    } else if (error.includes('no extractable text')) {
      translatedMessage = t('error:pdfNoText')
    } else if (error.includes('empty') || error.includes('corrupted')) {
      translatedMessage = t('error:pdfEmpty')
    } else if (error.includes('invalid') || error.includes('corrupt')) {
      translatedMessage = t('error:pdfInvalid')
    } else if (error.includes('parsing') || error.includes('Error parsing file')) {
      translatedMessage = t('error:pdfParsingError')
    } else {
      translatedMessage = t('error:fileParsingError')
    }

    if (filename && numPages) {
      translatedMessage = `${translatedMessage} (${filename}, ${numPages} pages)`
    } else if (filename) {
      translatedMessage = `${translatedMessage} (${filename})`
    }

    enqueueSnackbar(translatedMessage, { variant: 'error' })
  } else if (error === 'TimeoutError') {
    enqueueSnackbar(t('error:waitingForResponse'), { variant: 'error' })
  } else {
    console.error('Unexpected error in completion stream: ', error)
    enqueueSnackbar(t('error:unexpected'), { variant: 'error' })
  }
}
