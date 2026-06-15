import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
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

  async getAllStudents() {
    return this.prisma.studentProfile.findMany({
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: { lastName: 'asc' }
    });
  }

  async getAllDrivingInstructors() {
    return this.prisma.instructorProfile.findMany({
      where: {
        carModel: { not: { in: ["", "Не указан", "Не назначено", "Не назначен"] } },
      },
      select: { id: true, firstName: true, lastName: true, carModel: true, carNumber: true },
      orderBy: { lastName: 'asc' }
    });
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
    return this.prisma.group.findFirst({
      where: { theoryInstructorId: profile.id },
      include: {
        course: { select: { name: true, description: true } },
        students: { select: { id: true, firstName: true, lastName: true, phone: true } }
      }
    });
  }

  async getLessons(userId: number) {
    const profile = await this.getInstructorProfile(userId);
    const group = await this.prisma.group.findFirst({ where: { theoryInstructorId: profile.id } });

    return this.prisma.lesson.findMany({
      where: {
        status: { not: 'CANCELLED' },
        OR: [
          { instructorId: profile.id }, // Уроки, где этот человек - инструктор
          group ? { student: { groupId: group.id } } : { id: -1 } // Уроки студентов его группы (у любых инструкторов)
        ]
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        instructor: { select: { firstName: true, lastName: true } },
        group: { select: { name: true } },
        attendance: true
      }
    });
  }

  async createLesson(userId: number, dto: CreateLessonDto) {
    const creator = await this.prisma.instructorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException('Доступ запрещен');

    const targetInstructorId = dto.instructorId || creator.id;

    // ВАЖНОЕ ИСПРАВЛЕНИЕ: Формируем точные условия, без пустых объектов {}
    const orConditions: any[] = [{ instructorId: targetInstructorId }];
    if (dto.studentId) {
      orConditions.push({ studentId: dto.studentId });
    }

    const overlappingLesson = await this.prisma.lesson.findFirst({
      where: {
        status: { not: 'CANCELLED' },
        startTime: { lt: new Date(dto.endTime) },
        endTime: { gt: new Date(dto.startTime) },
        OR: orConditions
      }
    });

    if (overlappingLesson) {
      throw new ConflictException('Данное время уже занято инструктором или выбранным курсантом!');
    }

    return this.prisma.lesson.create({
      data: {
        type: dto.type,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        instructorId: targetInstructorId,
        studentId: dto.studentId || null,
        groupId: dto.groupId || null,
        carModel: dto.carModel,
        carNumber: dto.carNumber,
        notes: dto.notes,
      }
    });
  }

  async updateLesson(userId: number, lessonId: number, dto: any) {
    if (dto.startTime && dto.endTime) {
      const existingLesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!existingLesson) throw new NotFoundException('Занятие не найдено');

      const actualInstructorId = dto.instructorId || existingLesson.instructorId;
      const actualStudentId = dto.studentId || existingLesson.studentId;

      // ВАЖНОЕ ИСПРАВЛЕНИЕ ДЛЯ РЕДАКТИРОВАНИЯ
      const orConditions: any[] = [{ instructorId: actualInstructorId }];
      if (actualStudentId) {
        orConditions.push({ studentId: actualStudentId });
      }

      const overlappingLesson = await this.prisma.lesson.findFirst({
        where: {
          id: { not: lessonId },
          status: { not: 'CANCELLED' },
          startTime: { lt: new Date(dto.endTime) },
          endTime: { gt: new Date(dto.startTime) },
          OR: orConditions
        }
      });

      if (overlappingLesson) {
        throw new ConflictException('Выбранное новое время пересекается с другим занятием!');
      }
    }

    if (dto.attendance && Array.isArray(dto.attendance)) {
      for (const record of dto.attendance) {
        await this.prisma.attendance.upsert({
          where: { lessonId_studentId: { lessonId, studentId: record.studentId } },
          create: { lessonId, studentId: record.studentId, isPresent: record.isPresent },
          update: { isPresent: record.isPresent }
        });
      }
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        status: dto.status || undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        instructorId: dto.instructorId || undefined,
        studentId: dto.studentId || undefined,
        carModel: dto.carModel || undefined,
        carNumber: dto.carNumber || undefined,
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        group: { select: { name: true } },
        attendance: true
      }
    });
  }

  async deleteLesson(userId: number, lessonId: number) {
    const lesson = await this.prisma.lesson.findFirst({ where: { id: Number(lessonId) } });
    if (!lesson) throw new NotFoundException('Занятие не найдено');
    await this.prisma.lesson.delete({ where: { id: Number(lessonId) } });
    return { success: true, message: 'Занятие отменено' };
  }
}