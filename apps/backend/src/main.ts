import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const configuredFrontendUrl = config.get<string>('FRONTEND_PUBLIC_URL');
  const corsOrigins = new Set(
    [
      configuredFrontendUrl,
      'https://septoon.github.io',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ].filter((origin): origin is string => Boolean(origin))
  );

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin blocked: ${origin}`));
    },
    credentials: true
  });
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const swagger = new DocumentBuilder()
    .setTitle('LumaVPN API')
    .setDescription('VPN subscription backend API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.get<number>('BACKEND_PORT', 3001));
}

bootstrap();
