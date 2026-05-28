import { tool } from '@langchain/core/tools'
import { z } from 'zod/v4'

const weatherSchema = z.object({
  query: z.string().min(1).describe('The city or area to get the weather for'),
})

const normalizeLocation = (query: string) => query.trim().replace(/\s+/g, ' ')

const buildWeatherReport = (location: string) => {
  const normalizedLocation = normalizeLocation(location)
  const locationKey = normalizedLocation.toLowerCase()

  if (locationKey.includes('helsinki')) {
    return 'Weather for Helsinki: 12 C, light wind, partly cloudy.'
  }

  if (locationKey.includes('london')) {
    return 'Weather for London: 15 C, overcast, light rain possible.'
  }

  if (locationKey.includes('tokyo')) {
    return 'Weather for Tokyo: 24 C, humid, mostly clear.'
  }

  return `Weather for ${normalizedLocation}: 20 C, clear skies, light breeze.`
}

export const getWeatherTool = () =>
  tool(
    async ({ query }: z.infer<typeof weatherSchema>) => buildWeatherReport(query),
    {
      name: 'weather',
      description: 'Get a simple weather report for a city or area. Use this when the user asks about weather.',
      schema: weatherSchema,
    },
  )