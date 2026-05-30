import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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

  // НОВЫЙ МЕТОД: ЗАЧИСЛЕНИЕ УЧЕНИКА
  async enrollApplication(applicationId: number, groupId: number) {
    // 1. Проверяем, существует ли заявка и не обработана ли она уже
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Заявка не найдена');
    if (application.status === 'APPROVED') throw new BadRequestException('Заявка уже одобрена');

    // 2. Генерируем временный пароль (или email, если его не было в заявке)
    // В реальном проекте email должен приходить из формы, но для MVP сделаем заглушку на основе телефона
    const tempEmail = `student_${application.phone.replace(/\D/g, '')}@btmsh.ru`;
    const tempPassword = await bcrypt.hash('123456', 10); // Временный пароль

    // 3. Запускаем ТРАНЗАКЦИЮ (всё или ничего)
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        
        // Шаг А: Создаем базового Пользователя (User)
        const newUser = await prisma.user.create({
          data: {
            name: application.name,
            email: tempEmail,
            password: tempPassword,
            role: 'STUDENT',
          },
        });

        // Шаг Б: Создаем Профиль Ученика (StudentProfile) и привязываем к Группе
        const studentProfile = await prisma.studentProfile.create({
          data: {
            userId: newUser.id,
            firstName: application.name.split(' ')[0] || application.name,
            lastName: application.name.split(' ')[1] || '',
            phone: application.phone,
            groupId: groupId,
          },
        });

        // Шаг В: Меняем статус заявки на APPROVED
        const updatedApp = await prisma.application.update({
          where: { id: applicationId },
          data: { status: 'APPROVED' },
        });

        return { user: newUser, profile: studentProfile, application: updatedApp };
      });

      return result;

    } catch (error) {
      console.error('Ошибка при транзакции зачисления:', error);
      throw new BadRequestException('Не удалось зачислить ученика. Возможно, такой email уже существует.');
    }
  }

  async findAll() {
    return this.prisma.application.findMany({
      orderBy: { 
        createdAt: 'desc' 
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.application.findUnique({
      where: { id },
    });
  }

  async updateStatus(id: number, status: any) {
    return this.prisma.application.update({
      where: { id: id },
      data: { status: status },
    });
  }
}