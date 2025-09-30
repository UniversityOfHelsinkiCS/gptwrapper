import { token } from 'morgan'
import winston from 'winston'
import LokiTransport from 'winston-loki'

type Transport = winston.transport

const transports: Transport[] = []

const LOKI_HOST = `https://api-toska.apps.ocp-prod-0.k8s.it.helsinki.fi/lokki`

const LOKI_TOKEN = process.env.LOKI_TOKEN ?? ''

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
}

const prodFormat = winston.format.printf(({ level, ...rest }) =>
  JSON.stringify({
    level: levels[level],
    ...rest,
  }),
)

transports.push(new winston.transports.Console({ format: prodFormat }))

transports.push(
  new LokiTransport({
    host: LOKI_HOST,
    headers: {
      token: LOKI_TOKEN,
    },
    labels: {
      app: 'dalai',
    },
  }),
)

const logger = winston.createLogger({ transports })

export default logger
