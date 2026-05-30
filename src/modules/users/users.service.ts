import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
        studentProfile: true,
        instructorProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Пользователь успешно удален' };
  }

  async updateUser(id: number, data: { email: string; role: any; phone?: string; carModel?: string; carNumber?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        role: data.role,
      },
    });

    if (data.role === 'STUDENT') {
      await this.prisma.studentProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          firstName: user.name || 'Без имени',
          lastName: '',
          phone: data.phone || '',
        },
        update: {
          phone: data.phone || '',
        },
      });
    }

    if (data.role === 'INSTRUCTOR') {
      await this.prisma.instructorProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          firstName: user.name || 'Без имени',
          lastName: '',
          phone: data.phone || '',
          carModel: data.carModel || 'Не указана',
          carNumber: data.carNumber || 'Не указан',
          experience: 0,
        },
        update: {
          phone: data.phone || '',
          carModel: data.carModel || '',
          carNumber: data.carNumber || '',
        },
      });
    }

    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
        studentProfile: true,
        instructorProfile: true,
      }
    });
  }

  async getInstructors() {
    return this.prisma.instructorProfile.findMany({
      where: {
        user: { role: 'INSTRUCTOR' }
      },
      orderBy: { id: 'asc' }
    });
  }

  async getStudents() {
    return this.prisma.studentProfile.findMany({
      where: {
        user: { role: 'STUDENT' }
      },
      orderBy: { id: 'asc' }
    });
  }
}
