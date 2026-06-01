import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLessonDto } from './dto/lesson.dto';

@Injectable()
export class InstructorService {
  constructor(private prisma: PrismaService) {}

  private async getInstructorProfile(userId: number) {
    const profile = await this.prisma.instructorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Профиль инструктора не найден');
    return profile;
  }

  async getProfile(userId: number) {
    const profile = await this.getInstructorProfile(userId);
    
    const total = await this.prisma.lesson.count({ where: { instructorId: profile.id } });
    const completed = await this.prisma.lesson.count({ where: { instructorId: profile.id, status: 'COMPLETED' } });
    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      experience: profile.experience,
      carModel: profile.carModel,
      carNumber: profile.carNumber,
      stats: { total, completed, attendanceRate }
    };
  }

  async getTheoryGroup(userId: number) {
    const profile = await this.getInstructorProfile(userId);

    const group = await this.prisma.group.findFirst({
      where: { theoryInstructorId: profile.id },
      include: {
        course: { select: { name: true, description: true } },
        students: { select: { id: true, firstName: true, lastName: true, phone: true } }
      }
    });

    if (!group) return null;

    return group;
  }

  async getLessons(userId: number) {
    const profile = await this.getInstructorProfile(userId);

    const lessons = await this.prisma.lesson.findMany({
      where: { instructorId: profile.id },
      include: {
        student: { select: { firstName: true, lastName: true } },
        group: { select: { name: true } }
      }
    });

    return lessons;
  }

  async createLesson(userId: number, dto: CreateLessonDto) {
    const profile = await this.getInstructorProfile(userId);

    const overlap = await this.prisma.lesson.findFirst({
      where: {
        instructorId: profile.id,
        status: 'SCHEDULED',
        AND: [
          { startTime: { lt: new Date(dto.endTime) } },
          { endTime: { gt: new Date(dto.startTime) } }
        ]
      }
    });

    if (overlap) {
      throw new ConflictException('Данное время или автомобиль уже заняты!');
    }

    const newLesson = await this.prisma.lesson.create({
      data: {
        instructorId: profile.id,
        type: dto.type,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        studentId: dto.studentId,
        groupId: dto.groupId,
        carModel: dto.carModel,
        carNumber: dto.carNumber,
        notes: dto.notes
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        group: { select: { name: true } }
      }
    });

    return newLesson;
  }

  async updateLesson(userId: number, lessonId: number, dto: any) {
    const profile = await this.getInstructorProfile(userId);

    if (dto.startTime && dto.endTime) {
      const overlap = await this.prisma.lesson.findFirst({
        where: {
          instructorId: profile.id,
          status: 'SCHEDULED',
          id: { not: Number(lessonId) },
          AND: [
            { startTime: { lt: new Date(dto.endTime) } },
            { endTime: { gt: new Date(dto.startTime) } }
          ]
        }
      });
      if (overlap) throw new ConflictException('Выбранное новое время пересекается с другим занятием!');
    }

    return this.prisma.lesson.update({
      where: { id: Number(lessonId) },
      data: {
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        studentId: dto.studentId,
        carModel: dto.carModel,
        carNumber: dto.carNumber,
        notes: dto.notes
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        group: { select: { name: true } }
      }
    });
  }

  async deleteLesson(userId: number, lessonId: number) {
    const profile = await this.getInstructorProfile(userId);
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: Number(lessonId), instructorId: profile.id }
    });
    
    if (!lesson) throw new NotFoundException('Занятие не найдено');

    await this.prisma.lesson.delete({ where: { id: Number(lessonId) } });
    return { success: true, message: 'Занятие отменено' };
  }
}