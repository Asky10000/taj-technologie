import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  // En production, les secrets sont OBLIGATOIRES : on refuse de démarrer avec
  // une valeur de repli publique (sinon les jetons seraient falsifiables).
  if (isProd && (!secret || !refreshSecret)) {
    throw new Error(
      'JWT_SECRET et JWT_REFRESH_SECRET sont obligatoires en production.',
    );
  }

  return {
    // Valeurs de repli UNIQUEMENT en développement (jamais utilisées en prod).
    secret: secret || 'dev_only_insecure_jwt_secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret: refreshSecret || 'dev_only_insecure_jwt_refresh_secret',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  };
});
