import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    'fallback_refresh_secret_change_in_production',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
}));
