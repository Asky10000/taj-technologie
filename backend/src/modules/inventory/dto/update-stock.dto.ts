import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateStockDto } from './create-stock.dto';

export class UpdateStockDto extends PartialType(
  OmitType(CreateStockDto, ['productId'] as const),
) {}
