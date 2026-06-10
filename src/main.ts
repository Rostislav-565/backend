import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

process.on('uncaughtException', (err) => {
  console.error('⚠️ Перехвачена критическая ошибка (сервер не упал):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Перехвачен забытый Promise (сервер не упал):', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  await app.listen(3000);
  console.log('Server is running on http://localhost:3000');
}
bootstrap();