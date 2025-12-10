import type { ValidModelName } from '@config'
import { validModels } from '@config'
import {
    Box,
    Checkbox,
    Collapse,
    Divider,
    FormControl,
    FormControlLabel,
    MenuItem,
    Select,
    Slider,
    TextField,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { LinkButtonHoc } from '../ChatV2/general/Buttons'
import OpenableTextfield from '../common/OpenableTextfield'
import { ClearOutlined, LibraryBooksOutlined, ExpandMore } from '@mui/icons-material'
import { usePromptEditorForm } from './context'

const BasicInfoSection = () => {
    const { form, setForm } = usePromptEditorForm()
    const { t } = useTranslation()

    return (
        <Accordion defaultExpanded sx={accordionStyle}>
            <AccordionSummary expandIcon={<ExpandMore />} aria-controls="panel1-content" id="panel1-header">
                <Typography variant="h5" fontWeight="bold">
                    Alustuksen perustiedot
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box mb={3}>
                    <Typography mb={1} fontWeight="bold">
                        Alustuksen nimi
                    </Typography>
                    <TextField
                        slotProps={{
                            htmlInput: {
                                'data-testid': 'prompt-name-input',
                                minLength: 3,
                            },
                        }}
                        placeholder={t('common:promptName')}
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        fullWidth
                    />
                </Box>
                <Box>
                    <Typography mb={1} fontWeight="bold">
                        Ohjeistus opiskelijoille alustuksen käytöstä
                    </Typography>
                    <TextField
                        slotProps={{
                            htmlInput: {
                                'data-testid': 'student-instructions-input',
                            },
                        }}
                        value={form.userInstructions}
                        onChange={(e) => setForm((prev) => ({ ...prev, userInstructions: e.target.value }))}
                        placeholder={'Esim:\n\n# Ohjeistus opiskelijoille.\nKäyttäkää currechattiä.'}
                        fullWidth
                        multiline
                        minRows={8}
                        maxRows={48}
                    />
                </Box>
            </AccordionDetails>
        </Accordion>
    )
}

const ModelSettingsSection = () => {
    const { form, setForm, type, modelHasTemperature } = usePromptEditorForm()
    const { t } = useTranslation()

    return (
        <Accordion defaultExpanded sx={accordionStyle}>
            <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls="panel2-content"
                id="panel2-header"
            >
                <Typography variant="h5" fontWeight="bold">
                    Alustuksen kielimallin asetukset
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box mb={3}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={form.temperatureDefined && !modelHasTemperature}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        temperatureDefined: e.target.checked,
                                    }))
                                }
                                disabled={modelHasTemperature}
                            />
                        }
                        label={t('chat:temperature')}
                    />
                    <Collapse in={form.temperatureDefined && !modelHasTemperature}>
                        <Box sx={{ mb: 3, p: 2 }}>
                            <Slider
                                value={form.temperature}
                                onChange={(_, newValue) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        temperature: newValue as number,
                                    }))
                                }
                                aria-labelledby="temperature-slider"
                                valueLabelDisplay="auto"
                                step={0.1}
                                min={0}
                                max={1}
                                disabled={modelHasTemperature}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">
                                    {t('chat:predictableTemperature')}
                                </Typography>
                                <Typography variant="body2">
                                    {t('chat:creativeTemperature')}
                                </Typography>
                            </Box>
                        </Box>
                    </Collapse>
                    {type !== 'PERSONAL' && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={form.hidden}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, hidden: e.target.checked }))
                                    }
                                />
                            }
                            label="Piilota kielimallin ohjeistus opiskelijoilta"
                        />
                    )}
                </Box>

                <Box mb={3}>
                    <Typography mb={1} fontWeight="bold">
                        Alustuksen valittu kielimalli
                    </Typography>
                    <FormControl fullWidth>
                        <Select
                            value={form.selectedModel || 'none'}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    selectedModel: (e.target.value || 'none') as ValidModelName | 'none',
                                }))
                            }
                        >
                            <MenuItem value="none">
                                <em>{t('prompt:modelFreeToChoose')}</em>
                            </MenuItem>
                            {validModels.map((m) => (
                                <MenuItem key={m.name} value={m.name}>
                                    {m.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box>
                    <Typography mb={1} fontWeight="bold">
                        {t('prompt:systemMessage')}
                    </Typography>
                    <TextField
                        slotProps={{
                            htmlInput: {
                                'data-testid': 'system-message-input',
                            },
                        }}
                        placeholder="Esim. Olet avulias avustaja."
                        value={form.systemMessage}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, systemMessage: e.target.value }))
                        }
                        fullWidth
                        multiline
                        minRows={8}
                        maxRows={48}
                    />
                </Box>
            </AccordionDetails>
        </Accordion>
    )
}

const RagSettingsSection = () => {
    const { form, setForm, type, ragIndices, courseId } = usePromptEditorForm()
    const { t } = useTranslation()

    return (
        <Accordion defaultExpanded sx={accordionStyle}>
            <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls="panel3-content"
                id="panel3-header"
            >
                <Typography variant="h5" fontWeight="bold">
                    Alustuksen lähdemateriaali aineisto
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box mb={3}>
                    <Typography fontWeight="bold" my={1}>
                        Valittu lähdemateriaali
                    </Typography>
                    {type === 'CHAT_INSTANCE' && (
                        <Box display="flex" justifyContent="space-around" alignItems="center">
                            <FormControl fullWidth>
                                <Select
                                    data-testid="rag-select"
                                    value={form.ragIndexId ?? ''}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            ragIndexId: e.target.value
                                                ? Number(e.target.value)
                                                : undefined,
                                        }))
                                    }
                                    displayEmpty
                                    renderValue={(value) => {
                                        if (String(value) === '') {
                                            return <em>{t('prompt:noSourceMaterials')}</em>
                                        }
                                        const selected = ragIndices?.find(
                                            (i) => i.id === Number(value),
                                        )
                                        return selected ? selected.metadata.name : ''
                                    }}
                                >
                                    <MenuItem value="" data-testid="no-source-materials">
                                        <em>{t('prompt:noSourceMaterials')}</em>
                                        <ClearOutlined sx={{ ml: 1 }} />
                                    </MenuItem>
                                    {ragIndices?.map((index) => (
                                        <MenuItem
                                            key={index.id}
                                            value={index.id}
                                            data-testid={`source-material-${index.metadata.name}`}
                                        >
                                            {index.metadata.name}
                                        </MenuItem>
                                    ))}
                                    <Divider />
                                    <LinkButtonHoc button={MenuItem} to={`/${courseId}/course/rag`}>
                                        {t('prompt:courseSourceMaterials')}
                                        <LibraryBooksOutlined sx={{ ml: 1 }} />
                                    </LinkButtonHoc>
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </Box>

                <Collapse in={!!form.ragIndexId}>
                    <Box>
                        <Typography fontWeight="bold" my={1}>
                            Kielimallin lähdemateriaaliohjeistus
                        </Typography>

                        <OpenableTextfield
                            value={form.ragSystemMessage}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    ragSystemMessage: e.target.value,
                                }))
                            }
                            onAppend={(text) =>
                                setForm((prev) => ({
                                    ...prev,
                                    ragSystemMessage:
                                        prev.ragSystemMessage +
                                        (prev.ragSystemMessage.trim().length ? ' ' : '') +
                                        text,
                                }))
                            }
                            slotProps={{
                                htmlInput: { 'data-testid': 'rag-system-message-input' },
                            }}
                            fullWidth
                            multiline
                            minRows={4}
                            maxRows={16}
                        />
                    </Box>
                </Collapse>
            </AccordionDetails>
        </Accordion>
    )
}

const accordionStyle = {
    mb: 2,
    p: 1,
    boxShadow: 0,
    '&:before': { display: 'none' },
}

export const PromptEditorForm = () => (
    <Box>
        <BasicInfoSection />
        <Divider />
        <ModelSettingsSection />
        <Divider />
        <RagSettingsSection />
    </Box>
)