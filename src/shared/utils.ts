// coded by ai-mluukkai
export function shouldRenderAsText(mimetype: string): boolean {
  // regex tekstityypeille
  const textRegex = /^text\//

  // erityistapaukset
  const specialCases = ['application/json']

  return textRegex.test(mimetype) || specialCases.includes(mimetype)
}
