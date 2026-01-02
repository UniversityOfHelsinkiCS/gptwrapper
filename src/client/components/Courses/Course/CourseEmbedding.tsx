import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent, Divider } from "@mui/material";
import CopyToClipboardButton from "../../ChatV2/CopyToClipboardButton";
import { ReactNode, useEffect, useState } from "react";
import { PUBLIC_URL } from "@config";
import useCourse from "../../../hooks/useCourse";
import { useParams } from "react-router-dom";
import { usePromptState } from "../../ChatV2/PromptState";
import { Prompt } from "src/client/types";
import { useTranslation } from "react-i18next";
import moodleTutorialImage1 from "../../../assets/moodle-1.jpeg";
import moodleTutorialImage2 from "../../../assets/moodle-2.jpeg";
import moodleTutorialImage3 from "../../../assets/moodle-3.jpeg";


export default function CourseEmbedding() {
  const { t } = useTranslation()
  const { courseId } = useParams() as { courseId: string };
  const { data: chatInstance } = useCourse(courseId);
  const { coursePrompts, activePrompt } = usePromptState();
  const [link, setLink] = useState<string>("");
  const [embeddingCode, setEmbeddingCode] = useState<string>("")
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(activePrompt);

  useEffect(() => {
    if (!chatInstance) return;
    const baseUrl = `${window.location.origin}${PUBLIC_URL}/${chatInstance.courseId}`;
    const studentLink = selectedPrompt ? createLinkWithPrompt(baseUrl, selectedPrompt.id) : baseUrl;
    const moodleEmbedding = selectedPrompt ? createEmbeddingWithPrompt(baseUrl, selectedPrompt.id) : createEmbedding(baseUrl);
    setLink(studentLink);
    setEmbeddingCode(moodleEmbedding);
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
    <Box sx={{ p: 1, position: 'relative' }}>
      <Typography variant="h5" my={2} fontWeight="semibold">{t("course:embeddingInstructionsTitle")}</Typography>
      <Typography mb={8}>{t("course:embeddingInstructionsIntro")}</Typography>
      <Box sx={{ display: 'flex', gap: 8 }}>
        <Box flex={2} mb={2}>
          <GuideItem label={'A'}>
            <Typography fontWeight="bold" mb={3}>{t("course:onlyLinkTitle")}</Typography>
            <GuideItem label="1." variant="secondary">
              <Typography variant="body2">{t('course:stepSelectPromptOnRight')}</Typography>
            </GuideItem>
            <GuideItem label="2." variant="secondary">
              <Typography variant="body2">{t("course:stepCopyLink")}</Typography>
            </GuideItem>
          </GuideItem>
          <GuideItem label={'B'}>
            <Typography fontWeight="bold" mb={3}>{t("course:appEmbeddingTitle")}</Typography>
            <GuideItem label="1." variant="secondary">
              <Typography variant="body2">{t('course:stepSelectPromptOnRight')}</Typography>
            </GuideItem>
            <GuideItem label="2." variant="secondary">
              <Typography variant="body2">{t("course:stepCopyEmbeddingCode")}</Typography>
            </GuideItem>
            <GuideItem label="3." variant="secondary">
              <Box>
                <Typography variant="body2">{t("course:stepOpenMoodleSettings")}</Typography>
                <TutorialImage src={moodleTutorialImage1} alt={t("course:altOpenSettings")} />
              </Box>
            </GuideItem>
            <GuideItem label="3." variant="secondary">
              <Box>
                <Typography variant="body2">{t("course:stepOpenSourceCode")}</Typography>
                <TutorialImage src={moodleTutorialImage2} alt={t("course:altSourceView")} />
              </Box>
            </GuideItem>
            <GuideItem label="4." variant="secondary">
              <Box>
                <Typography variant="body2">{t("course:stepPasteAndSave")}</Typography>
                <TutorialImage src={moodleTutorialImage3} alt={t("course:altPasteSave")} />
              </Box>
            </GuideItem>
          </GuideItem>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box flex={1}
          sx={{
            position: 'sticky',
            top: 100,           // Defines where the sticking starts
            alignSelf: 'flex-start', // prevents the box from stretching to the full height of the left side
            height: 'fit-content'    // Ensures the sticky container isn't taller than its content
          }}>
          <Box>
            <Typography fontWeight="bold" mb={2}>{t('course:courseEmbeddingPrompt')}</Typography>
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

          <Typography fontWeight="bold" mt={3} mb={2}>{`${t('course:courseChatLink')} ${selectedPrompt ? `+ (${selectedPrompt.name})` : ''}`}</Typography>
          <CopyField copied={link}>
            <Typography color="textSecondary" sx={{ p: 1, pr: 3, wordBreak: 'break-all' }}>
              {link}
            </Typography>
          </CopyField>

          <Typography fontWeight="bold" mb={2}>{t('course:moodleEmbeddingCode')}</Typography>
          <CopyField copied={embeddingCode}>
            <Box
              id="moodle-embedding"
              component="pre"
              sx={{
                p: 2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: 'text.secondary',
              }}
            >
              <code>{embeddingCode}</code>
            </Box>
          </CopyField>
        </Box>
      </Box>
    </Box>

  );
}


const GuideItem = ({ label, variant = 'primary', children }: { label: string | number, variant?: 'primary' | 'secondary', children: ReactNode }) => {
  const isPrimary = variant === 'primary';

  return (
    <Box display="flex" gap={isPrimary ? 3 : 2} mb={3}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          ...(isPrimary ? {
            backgroundColor: 'black',
            color: 'white',
            width: '2rem',
            height: '2rem',
            borderRadius: '100%',
            flexShrink: 0,
            alignItems: 'center'
          } : {
            width: 'auto',
            height: 'auto',
          })
        }}
      >
        <Typography variant={isPrimary ? 'body1' : 'body2'} sx={{ fontWeight: isPrimary ? 'normal' : 'bold' }}>
          {label}
        </Typography>
      </Box>
      <Box display="flex" flexDirection="column">
        {children}
      </Box>
    </Box>
  )
}

const CopyField = ({ children, copied }: { children: ReactNode, copied: string }) => {
  return (<Box sx={{
    border: '1px solid',
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 1,
    backgroundColor: 'grey.50',
    p: 1,
    mb: 2,
    minHeight: 100,
    maxHeight: 200,
    overflowY: 'auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
  }}>
    {children}
    <CopyToClipboardButton id="moodle-embedding" copied={copied} />
  </Box>)
}

const TutorialImage = ({ src, alt }: { src: string, alt: string }) => {
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: '100%',
        height: 'auto',
        display: 'block',
        border: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.2)',
        mt: 2,
      }}
    />
  );
};

const createLinkWithPrompt = (baseUrl: string, promptId: string) => (`${baseUrl}?promptId=${promptId}`)
const createEmbeddingWithPrompt = (baseUrl: string, promptId: string) => embeddingMake(baseUrl, promptId)
const createEmbedding = (baseUrl: string) => embeddingMake(baseUrl)
const embeddingMake = (baseUrl: string, promptId?: string) => (
  `<div lang="fi" style="position: relative;" translate="yes"><iframe
    id="cc-iframe"
    style="border: 1px solid rgba(0, 0, 0, 0.2); border-radius: 0.3rem;"
    src="${baseUrl}?embedded=true&amp;promptId=${promptId}"
    width="100%" height="800px">
  </iframe>
  <div id="login-popup-info"
    style="position: absolute; top: 0; left: 0; display: none; padding: 4rem; white-space: pre-line;">
    <p>Sinun pitää uudistaa kirjautumissessiosi käyttääksesi CurreChattiä.
      Kirjautuminen avautuu uuteen ikkunaan. Jos niin ei tapahtunut, <a
        href="https://curre.helsinki.fi/chat/login-helper" target="_blank"
        rel="noopener opener">paina tästä</a>.</p>
    <p id="popup-blocked-info" style="display: none; margin-top: 1rem;">
      Ponnahdusikkunaa ei voitu avata, joten käytä yllä olevaa linkkiä.</p>
  </div>
  <script>
    /**
     * @type {HTMLIFrameElement}
     */

    const iframe = document.getElementById("cc-iframe")
    let successLoading = false

    const toggleLoginInfo = (show) => {
      document.getElementById("login-popup-info").style.display = show ?
        "block" : "none"
    }

    iframe.onload = async () => {
      if (successLoading) {
        console.log("Iframe already loaded successfully, skipping")
        return
      }
      // Listen for a pong message from the iframe

      toggleLoginInfo(true)

      window.addEventListener("message", function handler(event) {
        if (event.origin !== "https://curre.helsinki.fi") {
          return
        }

        console.log("Received message", event.data)

        if (event.data.type === 'pong') {
          successLoading = true
          console.log(
            "Pong message received, iframe loaded successfully")
          window.removeEventListener("message", handler)
          toggleLoginInfo(false)
        }
      })

      iframe.contentWindow?.postMessage({
        type: "ping"
      }, "https://curre.helsinki.fi")
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (successLoading) {
        console.log("Iframe responded, no need to login")
        toggleLoginInfo(false)
        return
      }
      console.log("No response from iframe, opening login popup")

      // Open CC in a new window and do a handshake with it

      const windowProxy = window.open(
        "https://curre.helsinki.fi/chat/login-helper", "_blank",
        "width=600,height=400,rel=opener")
      if (!windowProxy) {
        document.getElementById("popup-blocked-info").style.display =
          "block"
      }

      // Listen for message from the popup window

      const nonce = crypto.randomUUID()

      window.addEventListener("message", function handler(event) {
        if (event.origin !== "https://curre.helsinki.fi") {
          return
        }

        console.log("Received message", event.data)

        if (event.data.type === "login-success" && event.data.nonce ===
          nonce) {
          // Reload the iframe to reflect the new login state
          console.log(
            "Login success message received with correct nonce", nonce
          )
          successLoading = true
          iframe.src = iframe.src
          document.getElementById("login-popup-info").style.display =
            "none"
          windowProxy?.close()
          window.removeEventListener("message", handler)
        }
      })

      window.addEventListener("beforeunload", () => {
        windowProxy?.close()
      })

      window.addEventListener("focus", function handler() {
        // Reload the iframe to reflect the new login state
        iframe.src = iframe.src
        toggleLoginInfo(false)
        windowProxy?.close()
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("Sending login-query message with nonce", nonce)
      windowProxy?.postMessage({
        type: "login-query",
        nonce
      }, "https://curre.helsinki.fi")
    }
  </script>
</div>`
) 
