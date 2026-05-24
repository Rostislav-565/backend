import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationsModule } from './modules/applications/applications.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [ApplicationsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
