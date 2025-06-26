export const getEnv = (key: string, defaultValue: string): string => {
  const value = process.env[key]
  if (!value) {
    console.warn(`Missing environment variable: ${key}`)
    return defaultValue
  }
  return value
}
