export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    
    // Set the prototype explicitly to make instanceof work when compiled to ES5
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
