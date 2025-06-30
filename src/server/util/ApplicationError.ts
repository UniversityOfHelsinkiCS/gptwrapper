type ErrorOptions = {
  silenced?: boolean
  extra?: Record<string, any>
}

export class ApplicationError extends Error {
  name: string
  status: number
  extra: Record<string, any>
  silenced: boolean

  constructor(message: string, status?: number, options: ErrorOptions = {}) {
    super()

    Error.captureStackTrace(this, this.constructor)

    this.name = this.constructor.name

    this.message = message || 'Something went wrong. Please try again.'

    this.status = status || 500

    this.extra = options.extra || {}

    this.silenced = options.silenced || false
  }

  toJSON() {
    return {
      error: this.message,
    }
  }

  static NotFound(msg = 'Not found', options: ErrorOptions = {}) {
    return new ApplicationError(msg, 404, options)
  }

  static Forbidden(msg = 'Forbidden', options: ErrorOptions = {}) {
    return new ApplicationError(msg, 403, options)
  }

  static Unauthorized(msg = 'Unauthorized', options: ErrorOptions = {}) {
    return new ApplicationError(msg, 401, options)
  }

  static Conflict(msg = 'Conflict', options: ErrorOptions = {}) {
    return new ApplicationError(msg, 409, options)
  }

  static BadRequest(msg = 'Bad request', options: ErrorOptions = {}) {
    return new ApplicationError(msg, 400, options)
  }

  static InternalServerError(msg = 'Internal server error', options: ErrorOptions = {}) {
    return new ApplicationError(msg, 500, options)
  }
}
