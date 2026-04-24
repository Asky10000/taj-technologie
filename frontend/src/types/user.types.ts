export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'SALES'
  | 'TECHNICIAN'
  | 'USER';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LoginStatus = 'SUCCESS' | 'FAILED';

export interface LoginHistory {
  id: string;
  userId?: string;
  status: LoginStatus;
  emailAttempted?: string;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
  createdAt: string;
}
