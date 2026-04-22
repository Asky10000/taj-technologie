import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, DataSource } from 'typeorm';
import { Prospect } from '../entities/prospect.entity';
import { Customer } from '../entities/customer.entity';
import { Contact } from '../entities/contact.entity';
import { CreateProspectDto } from '../dto/create-prospect.dto';
import { UpdateProspectDto } from '../dto/update-prospect.dto';
import { QueryProspectsDto } from '../dto/query-prospects.dto';
import { ConvertProspectDto } from '../dto/convert-prospect.dto';
import {
  ProspectStatus,
  CustomerStatus,
  CustomerType,
} from '../enums/customer.enums';
import { paginate } from '../../../common/utils/pagination.util';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

@Injectable()
export class ProspectsService {
  private readonly logger = new Logger(ProspectsService.name);

  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateProspectDto, requesterId: string): Promise<Prospect> {
    if (dto.code) {
      const exists = await this.prospectRepo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException(`Code ${dto.code} déjà utilisé`);
    }
    const prospect = this.prospectRepo.create({
      ...dto,
      tags: dto.tags ?? [],
      expectedCloseDate: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : undefined,
      assignedToId: dto.assignedToId ?? requesterId,
    });
    const saved = await this.prospectRepo.save(prospect);
    this.logger.log(`Prospect créé : ${saved.code} (${saved.name})`);
    return saved;
  }

  async findAll(query: QueryProspectsDto): Promise<PaginatedResult<Prospect>> {
    const qb = this.prospectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.assignedTo', 'assignedTo');

    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.source) qb.andWhere('p.source = :source', { source: query.source });
    if (query.assignedToId)
      qb.andWhere('p.assignedToId = :aid', { aid: query.assignedToId });

    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('p.code ILIKE :q', { q: `%${query.search}%` })
            .orWhere('p.name ILIKE :q', { q: `%${query.search}%` })
            .orWhere('p.email ILIKE :q', { q: `%${query.search}%` })
            .orWhere('p.phone ILIKE :q', { q: `%${query.search}%` })
            .orWhere('p.industry ILIKE :q', { q: `%${query.search}%` });
        }),
      );
    }
    return paginate(qb, query);
  }

  async findOne(id: string): Promise<Prospect> {
    const p = await this.prospectRepo.findOne({
      where: { id },
      relations: ['assignedTo', 'contacts', 'interactions', 'convertedCustomer'],
    });
    if (!p) throw new NotFoundException(`Prospect ${id} introuvable`);
    return p;
  }

  async update(id: string, dto: UpdateProspectDto): Promise<Prospect> {
    const p = await this.findOne(id);
    if (p.convertedAt) {
      throw new BadRequestException(
        'Ce prospect a déjà été converti et ne peut être modifié',
      );
    }
    if (dto.code && dto.code !== p.code) {
      const clash = await this.prospectRepo.findOne({ where: { code: dto.code } });
      if (clash) throw new ConflictException(`Code ${dto.code} déjà utilisé`);
    }
    Object.assign(p, {
      ...dto,
      expectedCloseDate: dto.expectedCloseDate
        ? new Date(dto.expectedCloseDate)
        : p.expectedCloseDate,
    });
    return this.prospectRepo.save(p);
  }

  async remove(id: string): Promise<void> {
    const p = await this.findOne(id);
    await this.prospectRepo.softRemove(p);
    this.logger.log(`Prospect ${p.code} supprimé (soft)`);
  }

  // ─────────────────────────────────────────────────────────────
  // CONVERSION — transaction atomique
  // ─────────────────────────────────────────────────────────────
  async convert(id: string, dto: ConvertProspectDto): Promise<Customer> {
    const prospect = await this.findOne(id);
    if (prospect.convertedAt) {
      throw new BadRequestException('Ce prospect a déjà été converti');
    }

    return this.dataSource.transaction(async (manager) => {
      const customer = manager.create(Customer, {
        type: dto.customerType ?? CustomerType.COMPANY,
        name: prospect.name,
        email: prospect.email,
        phone: prospect.phone,
        website: prospect.website,
        city: prospect.city,
        country: prospect.country,
        status: CustomerStatus.ACTIVE,
        tags: prospect.tags,
        assignedToId: prospect.assignedToId,
        notes: prospect.notes,
      });
      const savedCustomer = await manager.save(customer);

      // Migration des contacts
      const contacts = await manager.find(Contact, {
        where: { prospectId: prospect.id },
      });
      for (const c of contacts) {
        c.prospectId = null;
        c.customerId = savedCustomer.id;
      }
      if (contacts.length) await manager.save(Contact, contacts);

      prospect.status = ProspectStatus.WON;
      prospect.convertedCustomerId = savedCustomer.id;
      prospect.convertedAt = new Date();
      await manager.save(prospect);

      this.logger.log(
        `Prospect ${prospect.code} converti en client ${savedCustomer.code}`,
      );
      return savedCustomer;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PIPELINE (stats)
  // ─────────────────────────────────────────────────────────────
  async pipeline(): Promise<
    Record<ProspectStatus, { count: number; totalBudget: number }>
  > {
    const rows = await this.prospectRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(p.estimatedBudget), 0)', 'totalBudget')
      .groupBy('p.status')
      .getRawMany<{ status: ProspectStatus; count: string; totalBudget: string }>();

    const result = {} as Record<
      ProspectStatus,
      { count: number; totalBudget: number }
    >;
    for (const s of Object.values(ProspectStatus))
      result[s] = { count: 0, totalBudget: 0 };
    rows.forEach((r) => {
      result[r.status] = {
        count: parseInt(r.count, 10),
        totalBudget: parseFloat(r.totalBudget),
      };
    });
    return result;
  }
}
