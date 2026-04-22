import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { ISeeder } from './seeder.interface';
import { AdminUserSeeder } from './admin-user.seeder';
import { ProductsSeeder } from './products.seeder';

/**
 * Point d'entrée des seeders. Exécuté via :
 *   npx ts-node -r tsconfig-paths/register src/database/seeders/main.seeder.ts
 *
 * Les seeders concrets (rôles, utilisateur admin, etc.) seront ajoutés
 * au fur et à mesure de l'implémentation des modules.
 */
class SeederRunner {
  private readonly seeders: ISeeder[] = [
    new AdminUserSeeder(),
    new ProductsSeeder(),
  ];

  async run(ds: DataSource): Promise<void> {
    console.log('\n🌱  Démarrage des seeders...\n');

    if (!ds.isInitialized) {
      await ds.initialize();
    }

    for (const seeder of this.seeders) {
      console.log(`   → Exécution du seeder : ${seeder.name}`);
      try {
        await seeder.run(ds);
        console.log(`   ✅ ${seeder.name} terminé`);
      } catch (err) {
        console.error(`   ❌ Échec de ${seeder.name}:`, err);
        throw err;
      }
    }

    console.log('\n✅  Tous les seeders ont été exécutés avec succès.\n');
  }
}

async function bootstrap() {
  const runner = new SeederRunner();
  try {
    await runner.run(dataSource);
    await dataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Erreur fatale pendant le seeding :', err);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

export { SeederRunner };
