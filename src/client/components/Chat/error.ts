import { t } from 'i18next'
import { enqueueSnackbar } from 'notistack'

/**
 * Handle error messages related to completion stream creation
 */
export const handleCompletionStreamError = (err: any, file?: string) => {
  if (err?.name === 'AbortError' || !err) return
  console.log('Error in completion stream: ', err)
  const error = err?.response?.data || err.message

  //there is an error code 'Creating a stream took too long' which happens with slow internet connections
  //might want to show a loading spinner when it happens
  if (error === 'Model maximum context reached' && file) {
    enqueueSnackbar(t('error:tooLargeFile'), { variant: 'error' })
  } else if (error === 'Error parsing file' && file) {
    enqueueSnackbar(t('error:fileParsingError'), { variant: 'error' })
  } else {
    //console.log('Unexpected error in completion stream: ', error)
    //enqueueSnackbar(t('error:unexpected'), { variant: 'error' })
  }
}
