import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { QueryCustomersDto } from '../dto/query-customers.dto';
import { paginate } from '../../../common/utils/pagination.util';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto, requesterId: string): Promise<Customer> {
    if (dto.code) {
      const exists = await this.customerRepo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException(`Code ${dto.code} déjà utilisé`);
    }

    const customer = this.customerRepo.create({
      ...dto,
      tags: dto.tags ?? [],
      assignedToId: dto.assignedToId ?? requesterId,
    });
    const saved = await this.customerRepo.save(customer);
    this.logger.log(`Client créé : ${saved.code} (${saved.name})`);
    return saved;
  }

  async findAll(query: QueryCustomersDto): Promise<PaginatedResult<Customer>> {
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.assignedTo', 'assignedTo');

    if (query.type) qb.andWhere('c.type = :type', { type: query.type });
    if (query.status) qb.andWhere('c.status = :status', { status: query.status });
    if (query.assignedToId)
      qb.andWhere('c.assignedToId = :aid', { aid: query.assignedToId });

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('c.code ILIKE :q', { q: `%${query.search}%` })
            .orWhere('c.name ILIKE :q', { q: `%${query.search}%` })
            .orWhere('c.legalName ILIKE :q', { q: `%${query.search}%` })
            .orWhere('c.email ILIKE :q', { q: `%${query.search}%` })
            .orWhere('c.phone ILIKE :q', { q: `%${query.search}%` })
            .orWhere('c.taxId ILIKE :q', { q: `%${query.search}%` })
            .orWhere('c.city ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['assignedTo', 'contacts', 'interactions'],
    });
    if (!customer) throw new NotFoundException(`Client ${id} introuvable`);
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);

    if (dto.code && dto.code !== customer.code) {
      const clash = await this.customerRepo.findOne({ where: { code: dto.code } });
      if (clash) throw new ConflictException(`Code ${dto.code} déjà utilisé`);
    }

    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepo.softRemove(customer);
    this.logger.log(`Client ${customer.code} supprimé (soft)`);
  }

  async restore(id: string): Promise<Customer> {
    const c = await this.customerRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!c) throw new NotFoundException(`Client ${id} introuvable`);
    await this.customerRepo.restore(id);
    return this.findOne(id);
  }
}
