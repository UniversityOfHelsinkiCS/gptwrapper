import crypto from 'crypto'

const hashData = (data: string): string => {
  const hash = crypto.createHash('MD5')

  hash.update(data)

  const hashedData = hash.digest('hex')

  return hashedData
}

export default hashData
