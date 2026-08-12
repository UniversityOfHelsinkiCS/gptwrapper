export const canCopyPrompt = ({
  isAdmin,
  isOwner,
  isResponsible,
  isUniversityTemplate = false,
}: {
  isAdmin: boolean
  isOwner: boolean
  isResponsible: boolean
  isUniversityTemplate?: boolean
}): boolean => isAdmin || isOwner || isResponsible || isUniversityTemplate
