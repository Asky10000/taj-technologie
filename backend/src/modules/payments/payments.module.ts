import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  providers: [PaymentsService],
  controllers: [PaymentsController, UploadsController],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
