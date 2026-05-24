import { Injectable } from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(createApplicationDto: any) {
  return this.prisma.application.create({
    data: {
      name: createApplicationDto.name,
      phone: createApplicationDto.phone,
      course: createApplicationDto.course,
    },
  });
}

  async findAll() {
    return this.prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.application.findUnique({
      where: { id },
    });
  }
}