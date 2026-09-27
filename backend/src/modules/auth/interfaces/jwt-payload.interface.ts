import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;      // user id
  email: string;
  role: Role;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
