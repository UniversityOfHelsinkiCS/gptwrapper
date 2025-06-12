import os from 'os'

import winston from 'winston'
import LokiTransport from 'winston-loki'
import { WinstonGelfTransporter } from 'winston-gelf-transporter'

import { inProduction } from '../../config'

const { combine, timestamp, printf, splat } = winston.format

const LOKI_HOST = 'http://loki-svc.toska-lokki.svc.cluster.local:3100'

const transports = []

transports.push(new winston.transports.File({ filename: 'debug.log' }))

if (!inProduction) {
  const devFormat = printf(({ level, message, timestamp, ...rest }) => {
    let restString = ''
    try {
      restString = JSON.stringify(rest)
    } catch (e) {
      restString = 'Error stringifying rest'
    }

    return `${timestamp} ${level}: ${message} ${restString}`
  })

  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: combine(splat(), timestamp(), devFormat),
    }),
  )
} else {
  const levels: { [key: string]: number } = {
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
      labels: {
        app: 'gptwrapper',
        environment: process.env.NODE_ENV || 'production',
      },
    }),
  )

  transports.push(
    new WinstonGelfTransporter({
      handleExceptions: true,
      host: 'svm-116.cs.helsinki.fi',
      port: 9503,
      protocol: 'udp',
      hostName: os.hostname(),
      additional: {
        app: 'gptwrapper',
        environment: 'production',
      },
    }),
  )
}

const logger = winston.createLogger({ transports })

export default logger
