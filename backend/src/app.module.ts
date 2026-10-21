import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  throttlerConfig,
} from './config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CrmModule } from './modules/crm/crm.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InterventionsModule } from './modules/interventions/interventions.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, throttlerConfig],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: (configService.get<number>('throttler.ttl') ?? 60) * 1000,
            limit: configService.get<number>('throttler.limit') ?? 100,
          },
        ],
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CrmModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    ProjectsModule,
    SuppliersModule,
    ReportsModule,
    InterventionsModule,
    PaymentsModule,
    HealthModule,
  ],
  providers: [
    // Rate-limiting appliqué globalement (protège du brute-force)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
