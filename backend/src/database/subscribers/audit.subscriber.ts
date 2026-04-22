import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * Subscriber global d'audit — log chaque opération mutation en base.
 * Utile en dev et pour tracer les évènements sensibles en prod.
 */
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditSubscriber.name);

  afterInsert(event: InsertEvent<unknown>): void {
    this.logger.debug(
      `INSERT ${event.metadata.tableName} → id=${(event.entity as { id?: string })?.id}`,
    );
  }

  afterUpdate(event: UpdateEvent<unknown>): void {
    this.logger.debug(
      `UPDATE ${event.metadata.tableName} → id=${(event.entity as { id?: string })?.id}`,
    );
  }

  afterRemove(event: RemoveEvent<unknown>): void {
    this.logger.debug(
      `DELETE ${event.metadata.tableName} → id=${(event.entity as { id?: string })?.id}`,
    );
  }
}
