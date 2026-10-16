import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Intervention } from './entities/intervention.entity';
import { InterventionsService } from './interventions.service';
import { InterventionsController } from './interventions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Intervention])],
  controllers: [InterventionsController],
  providers: [InterventionsService],
  exports: [InterventionsService, TypeOrmModule],
})
export class InterventionsModule {}
