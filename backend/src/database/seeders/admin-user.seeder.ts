import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/auth/enums/role.enum';
import { ISeeder } from './seeder.interface';

/**
 * Crée l'utilisateur SUPER_ADMIN initial s'il n'existe pas.
 * Variables d'environnement :
 *   SEED_ADMIN_EMAIL    (défaut : admin@taj-tech.com)
 *   SEED_ADMIN_PASSWORD (défaut : Admin@2024)
 */
export class AdminUserSeeder implements ISeeder {
  readonly name = 'AdminUserSeeder';

  async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(User);
    const email = (process.env.SEED_ADMIN_EMAIL || 'admin@taj.com')
      .toLowerCase()
      .trim();
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@2024';

    const existing = await repo.findOne({ where: { email } });
    if (existing) {
      // Upgrade to SUPER_ADMIN if role is insufficient
      if (existing.role !== Role.SUPER_ADMIN && existing.role !== Role.ADMIN) {
        await repo.update(existing.id, { role: Role.SUPER_ADMIN });
        console.log(`      → Rôle de ${email} mis à jour : ${existing.role} → SUPER_ADMIN`);
      } else {
        console.log(`      (info) admin ${email} existe déjà (${existing.role}) — ignoré`);
      }
      return;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const admin = repo.create({
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    await repo.save(admin);

    console.log(`      → SUPER_ADMIN créé : ${email} (mot de passe : ${password})`);
  }
}
