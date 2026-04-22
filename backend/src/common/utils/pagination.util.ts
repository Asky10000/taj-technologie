import { SelectQueryBuilder } from 'typeorm';
import { PaginationDto } from '../dto/pagination.dto';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

/**
 * Applique un QueryBuilder TypeORM et retourne un résultat paginé standardisé.
 */
export async function paginate<T>(
  qb: SelectQueryBuilder<T>,
  pagination: PaginationDto,
): Promise<PaginatedResult<T>> {
  const { page, limit, skip, sortBy, order } = pagination;

  const alias = qb.alias;
  if (sortBy) {
    qb.orderBy(`${alias}.${sortBy}`, order);
  }

  qb.skip(skip).take(limit);

  const [items, totalItems] = await qb.getManyAndCount();
  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}
