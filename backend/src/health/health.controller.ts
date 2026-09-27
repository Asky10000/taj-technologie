import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../modules/auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Vérifie le bon fonctionnement de l\'API' })
  async check() {
    return {
      status: 'ok',
      service: 'TAJ Technologie ERP/CRM',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('db')
  @ApiOperation({ summary: 'Vérifie la connexion PostgreSQL' })
  async checkDb() {
    try {
      const result = await this.dataSource.query('SELECT 1 as ok');
      return {
        database: 'postgres',
        status: result?.[0]?.ok === 1 ? 'connected' : 'unknown',
        isInitialized: this.dataSource.isInitialized,
      };
    } catch (err) {
      return {
        database: 'postgres',
        status: 'error',
        message: (err as Error).message,
      };
    }
  }
}
