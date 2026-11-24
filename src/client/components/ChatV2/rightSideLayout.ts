/**
 * What goes on the right of the chat on wide screens. An open file (`splitView`) and the RAG sources share the right
 * slot next to the chat: whichever one is expanded takes it, and a minimized file or collapsed sources go to the rail
 * at the edge (one rail, the buttons stacked). Without a file, the sources have their own panel, expanded or collapsed
 * to the rail as before.
 */
export interface RightSideLayout {
  /** What the split slot shows, or null when there is no slot. */
  slot: 'viewer' | 'sources' | null
  /** The minimized (or covered) file's button is in the rail. */
  railFile: boolean
  /** The sources panel outside the slot: expanded (no file open), collapsed to the rail, or none. */
  sourcesPanel: 'expanded' | 'collapsed' | null
}

export const rightSideLayout = ({
  splitView,
  minimized,
  hasSources,
  sourcesExpanded,
  isMobile,
}: {
  /** A file is open on a wide screen. */
  splitView: boolean
  minimized: boolean
  hasSources: boolean
  sourcesExpanded: boolean
  /** Mobile screens show the sources in a drawer instead. */
  isMobile: boolean
}): RightSideLayout => {
  if (splitView) {
    const sourcesInSlot = hasSources && sourcesExpanded
    const slot = sourcesInSlot ? 'sources' : minimized ? null : 'viewer'
    return { slot, railFile: slot !== 'viewer', sourcesPanel: hasSources && !sourcesInSlot ? 'collapsed' : null }
  }
  return { slot: null, railFile: false, sourcesPanel: hasSources && !isMobile ? (sourcesExpanded ? 'expanded' : 'collapsed') : null }
}
