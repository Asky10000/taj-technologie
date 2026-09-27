import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interaction } from '../entities/interaction.entity';
import { CreateInteractionDto } from '../dto/create-interaction.dto';
import { UpdateInteractionDto } from '../dto/update-interaction.dto';

@Injectable()
export class InteractionsService {
  private readonly logger = new Logger(InteractionsService.name);

  constructor(
    @InjectRepository(Interaction)
    private readonly interactionRepo: Repository<Interaction>,
  ) {}

  async create(
    dto: CreateInteractionDto,
    createdById: string,
  ): Promise<Interaction> {
    if (!dto.customerId && !dto.prospectId) {
      throw new BadRequestException(
        'L\'interaction doit concerner un client ou un prospect',
      );
    }
    if (dto.customerId && dto.prospectId) {
      throw new BadRequestException(
        'L\'interaction ne peut pas concerner à la fois un client et un prospect',
      );
    }

    const interaction = this.interactionRepo.create({
      ...dto,
      occurredAt: new Date(dto.occurredAt),
      createdById,
    });
    return this.interactionRepo.save(interaction);
  }

  async findAll(
    customerId?: string,
    prospectId?: string,
  ): Promise<Interaction[]> {
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (prospectId) where.prospectId = prospectId;
    return this.interactionRepo.find({
      where,
      order: { occurredAt: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async findOne(id: string): Promise<Interaction> {
    const i = await this.interactionRepo.findOne({
      where: { id },
      relations: ['createdBy', 'customer', 'prospect'],
    });
    if (!i) throw new NotFoundException(`Interaction ${id} introuvable`);
    return i;
  }

  async update(id: string, dto: UpdateInteractionDto): Promise<Interaction> {
    const interaction = await this.findOne(id);
    Object.assign(interaction, {
      ...dto,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : interaction.occurredAt,
    });
    return this.interactionRepo.save(interaction);
  }

  async remove(id: string): Promise<void> {
    const i = await this.findOne(id);
    await this.interactionRepo.softRemove(i);
  }
}
