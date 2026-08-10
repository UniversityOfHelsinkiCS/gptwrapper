const MAX_NAME_LENGTH = 255

const NUMERIC_SUFFIX = / \(\d+\)$/

export const resolveCopyName = (existingNames: string[], baseName: string): string => {
  const taken = new Set(existingNames)
  const name = baseName.slice(0, MAX_NAME_LENGTH)

  if (!taken.has(name)) return name

  const stem = name.replace(NUMERIC_SUFFIX, '')

  for (let n = 2; ; n += 1) {
    const suffix = ` (${n})`
    const candidate = `${stem.slice(0, MAX_NAME_LENGTH - suffix.length)}${suffix}`

    if (!taken.has(candidate)) return candidate
  }
}

export const shouldKeepRagIndex = (ragIndexOwnerId: string | null | undefined, copierId: string): boolean =>
  !!ragIndexOwnerId && ragIndexOwnerId === copierId
