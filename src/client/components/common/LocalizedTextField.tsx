import { Box, Stack, TextField, Typography } from "@mui/material"
import { LANGUAGE_TRANSLATION_KEYS, LANGUAGES } from "@shared/lang"
import { getLanguageValue } from "@shared/utils"
import { useTranslation } from "react-i18next"

export const LocalizedTextField = ({ value, setValue, label, testId }) => {
  const { t } = useTranslation()

  return (
    <Box>
      <Stack direction='row' gap='1rem' alignItems="center">
        <Typography>{label}</Typography>
        {LANGUAGES.map(lang => (
          <TextField 
            label={t(LANGUAGE_TRANSLATION_KEYS[lang])}
            key={lang}
            value={value[lang]}
            placeholder={getLanguageValue(value, lang)}
            onChange={ev => setValue({ ...value, [lang]: ev.target.value })}
            slotProps={{
              htmlInput: {
                "data-testid": `${testId}-${lang}`
              }
            }}
          />
        ))}
      </Stack>
    </Box>
  )
}