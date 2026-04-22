import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3001;
  const nodeEnv = configService.get<string>('app.nodeEnv');
  const corsOrigins = configService.get<string[]>('app.corsOrigins');
  const appName = configService.get<string>('app.name');
  const appVersion = configService.get<string>('app.version');

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // Swagger
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(appName)
      .setDescription('TAJ Technologie ERP/CRM API Documentation')
      .setVersion(appVersion)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('CRM', 'Customer relationship management')
      .addTag('Products', 'Product catalog management')
      .addTag('Inventory', 'Inventory management')
      .addTag('Sales', 'Sales management')
      .addTag('Suppliers', 'Supplier management')
      .addTag('Tickets', 'Support ticket management')
      .addTag('Projects', 'Project management')
      .addTag('Billing', 'Billing management')
      .addTag('Reports', 'Reports and analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);

  console.log(`
  ╔════════════════════════════════════════╗
  ║     TAJ Technologie ERP/CRM v${appVersion}     ║
  ╚════════════════════════════════════════╝

  Environment : ${nodeEnv}
  Server      : http://localhost:${port}
  API Base    : http://localhost:${port}/api/v1
  Swagger     : http://localhost:${port}/api/docs
  `);
}

bootstrap();
