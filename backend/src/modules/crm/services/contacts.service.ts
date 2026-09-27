import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateContactDto): Promise<Contact> {
    if (!dto.customerId && !dto.prospectId) {
      throw new BadRequestException(
        'Un contact doit être rattaché à un client ou à un prospect',
      );
    }
    if (dto.customerId && dto.prospectId) {
      throw new BadRequestException(
        'Un contact ne peut être rattaché qu\'à un seul parent',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      if (dto.isPrimary) await this.unsetOthersPrimary(manager, dto);
      const contact = manager.create(Contact, dto);
      return manager.save(contact);
    });
  }

  async findAll(customerId?: string, prospectId?: string): Promise<Contact[]> {
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (prospectId) where.prospectId = prospectId;
    return this.contactRepo.find({
      where,
      order: { isPrimary: 'DESC', lastName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Contact> {
    const c = await this.contactRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Contact ${id} introuvable`);
    return c;
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    return this.dataSource.transaction(async (manager) => {
      if (dto.isPrimary) {
        await this.unsetOthersPrimary(manager, {
          customerId: contact.customerId,
          prospectId: contact.prospectId,
          id,
        });
      }
      Object.assign(contact, dto);
      return manager.save(contact);
    });
  }

  async remove(id: string): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactRepo.softRemove(contact);
  }

  private async unsetOthersPrimary(
    manager: typeof this.contactRepo.manager,
    ctx: { customerId?: string; prospectId?: string; id?: string },
  ): Promise<void> {
    const where: Record<string, unknown> = { isPrimary: true };
    if (ctx.customerId) where.customerId = ctx.customerId;
    else if (ctx.prospectId) where.prospectId = ctx.prospectId;
    else return;

    const existing = await manager.find(Contact, { where });
    for (const c of existing) {
      if (c.id !== ctx.id) {
        c.isPrimary = false;
        await manager.save(c);
      }
    }
  }
}
