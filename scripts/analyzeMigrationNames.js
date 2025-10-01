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

// Correct date + prefix and filename snake cased
const regFull = /^(?:\d{4})(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])_\d{2}_[^\\/]+$/

const MIGRATIONS_PATH = './src/server/db/migrations'
const dirPath = path.join(process.cwd(), MIGRATIONS_PATH)
const files = fs.readdirSync(dirPath)

let errors = []

for (const file of files) {
  if (!regPrefix.test(file)) {
    errors.push(`${FgRed}${Bright}✗${Reset} ${file} ${FgYellow}→ must start with YYYYMMDD_NN_${Reset}`)
    continue
  }
  if (!regDate.test(file)) {
    errors.push(`${FgRed}${Bright}✗${Reset} ${file} ${FgYellow}→ invalid date format${Reset}`)
    continue
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
