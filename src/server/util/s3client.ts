import { S3Client } from '@aws-sdk/client-s3'
import { S3_ACCESS_KEY, S3_HOST, S3_SECRET_ACCESS_KEY } from './config'

export const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: S3_HOST,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
})
