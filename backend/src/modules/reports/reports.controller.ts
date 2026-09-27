import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DateRangeDto } from './dto/report-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard global — KPIs temps réel',
    description:
      'Agrège les indicateurs clés de tous les modules : CA, tickets, projets, stock, achats.',
  })
  getDashboard() {
    return this.reportsService.getDashboard();
  }

  @Get('sales')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Rapport ventes — CA, top clients, top produits, taux de conversion',
  })
  getSalesReport(@Query() query: DateRangeDto) {
    return this.reportsService.getSalesReport(query);
  }

  @Get('financial')
  @Roles(Role.ACCOUNTANT)
  @ApiOperation({
    summary: 'Rapport financier — factures, taux de recouvrement, balance âgée',
  })
  getFinancialReport(@Query() query: DateRangeDto) {
    return this.reportsService.getFinancialReport(query);
  }

  @Get('inventory')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Rapport inventaire — valeur stock, alertes, mouvements',
  })
  getInventoryReport(@Query() query: DateRangeDto) {
    return this.reportsService.getInventoryReport(query);
  }

  @Get('projects')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Rapport projets — budget vs réel, productivité équipe',
  })
  getProjectsReport(@Query() query: DateRangeDto) {
    return this.reportsService.getProjectsReport(query);
  }

  @Get('tickets')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Rapport tickets SAV — SLA, temps de résolution, satisfaction',
  })
  getTicketsReport(@Query() query: DateRangeDto) {
    return this.reportsService.getTicketsReport(query);
  }

  @Get('purchases')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Rapport achats — dépenses fournisseurs, top produits achetés',
  })
  getPurchasesReport(@Query() query: DateRangeDto) {
    return this.reportsService.getPurchasesReport(query);
  }
}
