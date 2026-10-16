import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Intervention } from './entities/intervention.entity';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { QueryInterventionsDto } from './dto/query-interventions.dto';
import { paginate } from '../../common/utils/pagination.util';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class InterventionsService {
  private readonly logger = new Logger(InterventionsService.name);

  constructor(
    @InjectRepository(Intervention)
    private readonly repo: Repository<Intervention>,
  ) {}

  async create(dto: CreateInterventionDto, technicianId: string): Promise<Intervention> {
    const entity = this.repo.create({
      ...dto,
      visitDate: new Date(dto.visitDate),
      technicianId,
    });
    const saved = await this.repo.save(entity);
    this.logger.log(`Intervention créée : ${saved.number}`);
    return this.findOne(saved.id);
  }

  async findAll(query: QueryInterventionsDto): Promise<PaginatedResult<Intervention>> {
    const qb = this.repo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.customer', 'customer')
      .leftJoinAndSelect('i.technician', 'technician');

    if (query.status) qb.andWhere('i.status = :status', { status: query.status });
    if (query.customerId) qb.andWhere('i.customerId = :cid', { cid: query.customerId });

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('i.number ILIKE :q', { q: `%${query.search}%` })
            .orWhere('i.subject ILIKE :q', { q: `%${query.search}%` })
            .orWhere('customer.name ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }

    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Intervention> {
    const found = await this.repo.findOne({
      where: { id },
      relations: ['customer', 'technician'],
    });
    if (!found) throw new NotFoundException(`Intervention ${id} introuvable`);
    return found;
  }

  async update(id: string, dto: UpdateInterventionDto): Promise<Intervention> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    if (dto.visitDate) entity.visitDate = new Date(dto.visitDate);
    await this.repo.save(entity);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repo.softRemove(entity);
    this.logger.log(`Intervention supprimée : ${entity.number}`);
  }
}
