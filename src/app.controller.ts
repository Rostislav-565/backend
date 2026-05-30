import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('api/instructors')
  async getInstructors() {
    return this.prisma.instructorProfile.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' }
    });
  }

  @Get('api/students')
  async getStudents() {
    return this.prisma.studentProfile.findMany({
      select: { id: true, firstName: true, lastName: true, groupId: true },
      orderBy: { lastName: 'asc' }
    });
  }
}
