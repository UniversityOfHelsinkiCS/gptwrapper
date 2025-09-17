import { Accordion, AccordionDetails, AccordionSummary, Box, TextField, TextFieldProps } from '@mui/material'
import { DEFAULT_RAG_SYSTEM_MESSAGE, ENFORCE_RAG_SYSTEM_MESSAGE, UNKNOWN_RAG_SYSTEM_MESSAGE } from '@config'
import { GrayButton } from '../ChatV2/general/Buttons'
import AddIcon from '@mui/icons-material/Add';
import { t } from 'i18next';

type OpenableTextfieldProps = TextFieldProps & {
  onAppend: (text: string) => void
}

const OpenableTextfield = ({ onAppend, ...props }: OpenableTextfieldProps) => {

  return (
    <Box sx={{ mb: 2 }}>
      <TextField sx={{ mb: 0 }} {...props} fullWidth />
      <Box sx={{ display: 'flex', gap: 1, mt: 1, width: '100%' }}>
        <GrayButton size="small" endIcon={<AddIcon />} onClick={() => onAppend(t(DEFAULT_RAG_SYSTEM_MESSAGE))}>
          {t("prompt:defaultRagLabel")}
        </GrayButton>
        <GrayButton size="small" endIcon={<AddIcon />} onClick={() => onAppend(t(ENFORCE_RAG_SYSTEM_MESSAGE))}>
          {t("prompt:enforceRagLabel")}
        </GrayButton>
        <GrayButton size="small" endIcon={<AddIcon />} onClick={() => onAppend(t(UNKNOWN_RAG_SYSTEM_MESSAGE))}>
          {t("prompt:unknownRagLabel")}
        </GrayButton>
      </Box>
    </Box>
  )
}


export default OpenableTextfield