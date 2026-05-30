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

  async updateUser(id: number, data: { email: string; role: any }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true, instructorProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const upadateUser = await this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        role: data.role,
      },
    });

    if (data.role === 'STUDENT' && !user.studentProfile) {
      await this.prisma.studentProfile.create({
        data: {
          userId: user.id,
          firstName: user.name || 'Без имени',
          lastName: '',
          phone: '',
        }
      });
    }

    if (data.role === 'INSTRUCTOR' && !user.instructorProfile) {
      await this.prisma.instructorProfile.create({
        data: {
          userId: user.id,
          firstName: user.name || 'Без имени',
          lastName: '',
          phone: '',
          carModel: 'Не указана',
          carNumber: 'Не указан',
          experience: 0,
        }
      });
    }

    return upadateUser;
  }
}