import { DataSource } from 'typeorm';

/**
 * Contrat à implémenter par tous les seeders.
 */
export interface ISeeder {
  readonly name: string;
  run(dataSource: DataSource): Promise<void>;
}
