export interface ApiResponse<T = unknown> {
  message: string;
  statusCode: number;
  data?: T;
}
