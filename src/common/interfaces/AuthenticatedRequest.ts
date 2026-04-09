export interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
    role: string;
  };
}
