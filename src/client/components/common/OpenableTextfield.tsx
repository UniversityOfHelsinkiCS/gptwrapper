import { Accordion, AccordionDetails, AccordionSummary, Button, TextField, TextFieldProps } from '@mui/material'

const OpenableTextfield = (props: TextFieldProps) => {
  return (
    <Accordion>
      <AccordionSummary>{props.label}</AccordionSummary>
      <AccordionDetails>
        <TextField {...props} />
      </AccordionDetails>
    </Accordion>
  )
}

export default OpenableTextfield
