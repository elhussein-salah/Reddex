import { Request } from 'express';
import { Role } from 'src/enums';

/**
 * Canonical request type for routes protected by AuthGuard.
 * The guard guarantees `user` is populated from the JWT payload.
 */
export interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
    username: string;
    role: Role;
  };
}
