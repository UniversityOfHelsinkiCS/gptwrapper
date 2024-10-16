import { t } from 'i18next'
import { enqueueSnackbar } from 'notistack'

export const handleCompletionStreamError = (err: any, file: string) => {
  if (err?.name === 'AbortError' || !err) return

  const error = err?.response?.data || err.message

  if (error === 'Model maximum context reached' && file) {
    enqueueSnackbar(t('error:tooLargeFile'), { variant: 'error' })
  } else if (error === 'Error parsing file' && file) {
    enqueueSnackbar(t('error:fileParsingError'), { variant: 'error' })
  } else if (!error && typeof err === 'string') {
    enqueueSnackbar(err, { variant: 'error' })
  } else {
    enqueueSnackbar(t('error:unexpected'), { variant: 'error' })
  }
}
