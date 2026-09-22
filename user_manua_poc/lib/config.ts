import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  // gptwrapper dev server, started separately with `npm run dev`
  baseURL: 'http://localhost:3000',
  viewport: { width: 1360, height: 860 },
  scenariosDir: path.resolve(__dirname, '../scenarios'),
  videoDir: path.resolve(__dirname, '../videos'),
  // pause after every click/fill so the interaction is easy to follow in the recording
  stepDelay: 700,
  // how long a caption stays visible before the next step runs
  captionDelay: 1600,
  // ms per character when "typing" into a field
  typeDelay: 45,
  // slows down every Playwright action a bit, on top of the manual pauses above
  slowMo: 80,
}
