import type { TFunction } from 'i18next'
import { AGENT_NOTES_FOLDER, DEFAULT_FOLDER, OUTPUTS_FOLDER } from '../../util/myFiles/paths'

/**
 * The name shown for a top-level My files folder. The app's own folders (`Outputs`, `Agent notes`, `Files`) are shown
 * in the UI language, but they keep their English names in the store, in attached folders and for the agent.
 * The student's own folders are shown as they are.
 */
export const folderLabel = (t: TFunction, folder: string): string => {
  if (folder === OUTPUTS_FOLDER) return t('myFiles:folderOutputs')
  if (folder === AGENT_NOTES_FOLDER) return t('myFiles:folderAgentNotes')
  if (folder === DEFAULT_FOLDER) return t('myFiles:folderFiles')
  return folder
}
