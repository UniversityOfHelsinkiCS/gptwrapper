export {}

declare global {
  namespace Express {
    namespace MulterS3 {
      interface File {
        advancedParsing?: boolean
      }
    }
  }
}
