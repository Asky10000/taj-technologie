import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * Update : tout est optionnel, sauf le mot de passe qui a son endpoint dédié
 * (PATCH /auth/change-password ou PATCH /users/:id/password).
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
