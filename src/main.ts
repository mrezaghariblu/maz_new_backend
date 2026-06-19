// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Global Validation Pipe ───────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // فیلدهای اضافی حذف می‌شوند
      forbidNonWhitelisted: true, // خطا اگر فیلد ناشناخته وجود داشت
      transform: true, // تبدیل خودکار نوع (string → number)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200', // Angular default
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Global prefix ────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    `\n🚀 سامانه آموزشی در حال اجراست: http://localhost:${port}/api/v1`,
  );
}
bootstrap();
