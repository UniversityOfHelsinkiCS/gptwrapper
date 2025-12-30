import { Box, Typography } from "@mui/material";
import CopyToClipboardButton from "../../ChatV2/CopyToClipboardButton";
import { useEffect, useState } from "react";
import { PUBLIC_URL } from "@config";
import useCourse from "../../../hooks/useCourse";
import { useParams } from "react-router-dom";


export default function CourseEmbedding() {
  const { courseId } = useParams() as { courseId: string }
  const { data: chatInstance } = useCourse(courseId)
  const [moodleLink, setMoodleLink] = useState<string>("")

  useEffect(() => {
    if (!chatInstance) return
    const studentLink = `${window.location.origin}${PUBLIC_URL}/${chatInstance.courseId}`
    setMoodleLink(studentLink)
  }, [chatInstance])


  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" mb={2}>Currechat linkki</Typography>
      <Box sx={linkField}>
        <Typography id="moodle-link" p={1}>{moodleLink}</Typography>
        <CopyToClipboardButton id="moodle-link" copied={moodleLink} />
      </Box>
    </Box>
  )
}

const linkField = {
  border: '1px solid',
  borderColor: 'rgba(0, 0, 0, 0.16)',
  borderRadius: 1,
  backgroundColor: 'grey.50',
  p: 1,
  display: 'flex',
  justifyContent: 'space-between'
}
