import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent } from "@mui/material";
import CopyToClipboardButton from "../../ChatV2/CopyToClipboardButton";
import { useEffect, useState } from "react";
import { PUBLIC_URL } from "@config";
import useCourse from "../../../hooks/useCourse";
import { useParams } from "react-router-dom";
import { usePromptState } from "../../ChatV2/PromptState";
import { Prompt } from "src/client/types";
import { useTranslation } from "react-i18next";

export default function CourseEmbedding() {
  const { t } = useTranslation()
  const { courseId } = useParams() as { courseId: string };
  const { data: chatInstance } = useCourse(courseId);
  const { coursePrompts, activePrompt } = usePromptState();
  const [link, setLink] = useState<string>("");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(activePrompt);

  useEffect(() => {
    if (!chatInstance) return;
    const baseUrl = `${window.location.origin}${PUBLIC_URL}/${chatInstance.courseId}`;
    const studentLink = selectedPrompt ? `${baseUrl}?promptId=${selectedPrompt.id}` : baseUrl;
    setLink(studentLink);
  }, [chatInstance, selectedPrompt]);

  const handleChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    if (value === "") {
      setSelectedPrompt(undefined);
    } else {
      const prompt = coursePrompts.find((p) => String(p.id) === String(value));
      setSelectedPrompt(prompt);
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography fontWeight="bold">{`${t('course:courseChatLink')} ${selectedPrompt ? `+ (${selectedPrompt.name})` : ''}`}</Typography>
      <Box sx={linkField}>
        <Typography id="moodle-link" color="textSecondary" sx={{ p: 1, pr: 3, wordBreak: 'break-all' }}>
          {link}
        </Typography>
        <CopyToClipboardButton id="moodle-link" copied={link} />
      </Box>

      <Box>
        <Typography mb={1} fontWeight="bold">{t('sidebar:promptChange')}</Typography>
        <FormControl fullWidth size="small">
          <Select
            labelId="prompt-select-label"
            id="prompt-select"
            value={selectedPrompt?.id || ""}
            onChange={handleChange}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <em style={{ color: 'gray', fontStyle: 'normal' }}>{t('sidebar:promptSelect')}</em>;
              }
              return coursePrompts.find(p => p.id === selected)?.name;
            }}
            sx={{ p: 0.8 }}
          >
            <MenuItem value="">
              <em>{t('sidebar:promptNone')}</em>
            </MenuItem>
            {coursePrompts.map((prompt) => (
              <MenuItem key={prompt.id} value={prompt.id} sx={{ p: 2 }}>
                {prompt.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}

const linkField = {
  border: '1px solid',
  borderColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: 1,
  backgroundColor: 'grey.50',
  p: 1,
  mb: 2,
  height: 100,
  display: 'flex',
  justifyContent: 'space-between'
};