export class ApiResponse {
  static success(message, data = null, statusCode = 200) {
    return { success: true, message, data, statusCode };
  }

  static error(message, statusCode = 500) {
    return { success: false, message, statusCode };
  }
}
