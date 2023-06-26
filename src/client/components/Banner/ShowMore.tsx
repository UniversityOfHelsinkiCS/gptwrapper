import React, { useState } from 'react'
import { IconButton, Collapse } from '@mui/material'
import { ExpandLess, ExpandMore, HelpOutline } from '@mui/icons-material'

import Markdown from './Markdown'

const ShowMore = ({
  text,
  expanded = false,
}: {
  text: string
  // eslint-disable-next-line react/require-default-props
  expanded?: boolean
}) => {
  const [expand, setExpand] = useState(expanded)

  return (
    <>
      <IconButton onClick={() => setExpand(!expand)}>
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
