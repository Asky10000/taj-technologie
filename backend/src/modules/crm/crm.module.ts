import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Prospect } from './entities/prospect.entity';
import { Contact } from './entities/contact.entity';
import { Interaction } from './entities/interaction.entity';
import { CustomersService } from './services/customers.service';
import { ProspectsService } from './services/prospects.service';
import { ContactsService } from './services/contacts.service';
import { InteractionsService } from './services/interactions.service';
import { CustomersController } from './controllers/customers.controller';
import { ProspectsController } from './controllers/prospects.controller';
import { ContactsController } from './controllers/contacts.controller';
import { InteractionsController } from './controllers/interactions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Prospect, Contact, Interaction]),
  ],
  providers: [
    CustomersService,
    ProspectsService,
    ContactsService,
    InteractionsService,
  ],
  controllers: [
    CustomersController,
    ProspectsController,
    ContactsController,
    InteractionsController,
  ],
  exports: [
    CustomersService,
    ProspectsService,
    ContactsService,
    InteractionsService,
    TypeOrmModule,
  ],
})
export class CrmModule {}
