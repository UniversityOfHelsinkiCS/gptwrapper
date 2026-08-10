/**
 * Copying is a teacher tool for now: you may copy a prompt you own, or one belonging to a course you are
 * responsible for. Students only ever match the first case, so the most they can do is duplicate their own prompts.
 */
export const canCopyPrompt = ({ isAdmin, isOwner, isResponsible }: { isAdmin: boolean; isOwner: boolean; isResponsible: boolean }): boolean =>
  isAdmin || isOwner || isResponsible
