import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { LoginHistory } from '../auth/entities/login-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken, LoginHistory])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
