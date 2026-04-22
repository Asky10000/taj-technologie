import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marque un endpoint comme public (bypass du JwtAuthGuard global).
 * Usage : @Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
