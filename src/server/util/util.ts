import crypto from 'crypto'

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const generateTerms = () => {
  const dateNow = new Date()
  const yearNow = dateNow.getFullYear()
  const monthNow = dateNow.getMonth()

  type Term = {
    label: {
      en: string
      fi: string
      sv: string
    }
    id: number
    startDate: string
    endDate: string
  }
  const terms: Term[] = []
  let id = 1

  // this is ugly
  for (let y = 2023; y <= yearNow + (monthNow > 7 ? 1 : 0); y += 1) {
    terms.push({
      label: {
        en: `spring ${y}`,
        fi: `kevät ${y}`,
        sv: `vår ${y}`,
      },
      id,
      startDate: `${y}-01-01`,
      endDate: `${y}-07-31`,
    })

    terms.push({
      label: {
        en: `fall ${y}`,
        fi: `syksy ${y}`,
        sv: `höst ${y}`,
      },
      id: id + 1,
      startDate: `${y}-08-01`,
      endDate: `${y}-12-31`,
    })

    id += 2
  }

  return terms.splice(0, terms.length - 1).reverse()
}

const ENCRYPTION_IV = process.env.ENCRYPTION_IV || 'default'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default'

const algorithm = 'aes-256-cbc'
const key = new Uint8Array(Buffer.from(ENCRYPTION_KEY, 'hex'))
const iv = new Uint8Array(Buffer.from(ENCRYPTION_IV, 'hex'))

export function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return { encryptedData: encrypted.toString('hex') }
}

export function decrypt(encryptedData) {
  const text = {
    iv: ENCRYPTION_IV,
    encryptedData,
  }

  const encryptedText = Buffer.from(text.encryptedData, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  const decrypted = decipher.update(new Uint8Array(encryptedText))
  return Buffer.concat([decrypted, decipher.final()]).toString()
}
