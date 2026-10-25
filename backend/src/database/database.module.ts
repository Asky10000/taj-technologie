import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Module global gérant la connexion PostgreSQL via TypeORM.
 * Importé une seule fois dans AppModule.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const synchronize = configService.get<boolean>('database.synchronize');
        return {
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'migrations_history',
        synchronize,
        // En production (synchronize=false), applique automatiquement les
        // migrations en attente au démarrage. En dev (synchronize=true), on
        // laisse la synchro gérer le schéma pour ne pas entrer en conflit.
        migrationsRun: !synchronize,
        logging: configService.get<boolean>('database.logging'),
        autoLoadEntities: true,
        // SSL piloté explicitement par DB_SSL (true pour une base managée
        // distante ; false pour le conteneur Postgres interne, même en prod).
        ssl:
          process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
            : false,
        retryAttempts: 5,
        retryDelay: 3000,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
