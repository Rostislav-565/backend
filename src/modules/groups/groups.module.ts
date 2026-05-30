import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
