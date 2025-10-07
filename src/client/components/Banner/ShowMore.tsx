import { useState } from 'react'
import { IconButton, Collapse } from '@mui/material'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import HelpOutline from '@mui/icons-material/HelpOutline'

import Markdown from './Markdown'

const ShowMore = ({
  text,
  expanded = false,
}: {
  text: string

  expanded?: boolean
}) => {
  const [expand, setExpand] = useState(expanded)

  const handleChange = () => {
    setExpand((prev) => !prev)

    if (expand) localStorage.setItem('disclaimerClosed', 'true')
    else localStorage.removeItem('disclaimerClosed')
  }

  return (
    <>
      <IconButton onClick={() => handleChange()}>
        <HelpOutline />
        {!expand ? <ExpandMore /> : <ExpandLess />}
      </IconButton>
      <Collapse in={expand} timeout="auto" unmountOnExit>
        <Markdown>{text}</Markdown>
      </Collapse>
    </>
  )
}

export default ShowMore
