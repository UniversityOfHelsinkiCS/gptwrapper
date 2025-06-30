export class ApplicationError extends Error {
  name: string
  status: number
  extra: Record<string, any>

  constructor(message: string, status?: number, extra?: Record<string, any>) {
    super()

    Error.captureStackTrace(this, this.constructor)

    this.name = this.constructor.name

    this.message = message || 'Something went wrong. Please try again.'

    this.status = status || 500

    this.extra = extra || {}
  }

  toJSON() {
    return {
      error: this.message,
    }
  }

  static NotFound(msg = 'Not found') {
    return new ApplicationError(msg, 404)
  }

  static Forbidden(msg = 'Forbidden') {
    return new ApplicationError(msg, 403)
  }

  static Unauthorized(msg = 'Unauthorized') {
    return new ApplicationError(msg, 401)
  }

  static Conflict(msg = 'Conflict') {
    return new ApplicationError(msg, 409)
  }

  static BadRequest(msg = 'Bad request') {
    return new ApplicationError(msg, 400)
  }

  static InternalServerError(msg = 'Internal server error') {
    return new ApplicationError(msg, 500)
  }
}
