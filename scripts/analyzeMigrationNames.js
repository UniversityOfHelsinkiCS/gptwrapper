import fs from 'fs'
import path from 'path'

const Reset = '\x1b[0m'
const Bright = '\x1b[1m'
const FgRed = '\x1b[31m'
const FgYellow = '\x1b[33m'
const FgGreen = '\x1b[32m'

// Matches only the leading date portion with underscore:
// - YYYY = 4 digits
// - MM   = 01–12
// - DD   = 01–31
// - ends with underscore
const regDate = /^(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])_/

// Matches only the required prefix before the name:
// - 8 digits (YYYYMMDD)
// - underscore
// - 2 digits (NN)
// - underscore
const regPrefix = /^\d{8}_\d{2}_/

// Full migration name format:
// - YYYYMMDD_NN_
// - then any filename-safe characters (no slashes)
const regFull = /^(?:\d{4})(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])_\d{2}_[^\\/]+$/

// Date validity check using JS Date
function isValidDate(year, month, day) {
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

const MIGRATIONS_PATH = './src/server/db/migrations'
const dirPath = path.join(process.cwd(), MIGRATIONS_PATH)
const files = fs.readdirSync(dirPath)

let errors = []

for (const file of files) {
  if (!regPrefix.test(file)) {
    errors.push(`${FgRed}${Bright}✗${Reset} ${file} ${FgYellow}→ must start with YYYYMMDD_NN_${Reset}`)
    continue
  }

  const match = file.match(regDate)
  if (!match) {
    errors.push(`${FgRed}${Bright}✗${Reset} ${file} ${FgYellow}→ invalid date format${Reset}`)
    continue
  } else {
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    const day = parseInt(match[3], 10)
    if (!isValidDate(year, month, day)) {
      errors.push(`${FgRed}${Bright}✗${Reset} ${file} ${FgYellow}→ impossible calendar date${Reset}`)
      continue
    }
  }

  if (!regFull.test(file)) {
    errors.push(`${FgRed}${Bright}✗${Reset} ${file} ${FgYellow}→ contains invalid characters${Reset}`)
  }
}

if (errors.length > 0) {
  console.error('Migration file name check failed:')
  console.error(errors.join('\n'))
  process.exit(1)
} else {
  console.log(`${FgGreen}${Bright}Success:${Reset} All migration names ok\n`)
}
