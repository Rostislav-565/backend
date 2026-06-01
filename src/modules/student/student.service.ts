import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  private async getStudentProfile(userId: number) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        group: { include: { course: true } },
        payments: true,
      },
    });

    if (!profile) throw new NotFoundException('Профиль ученика не найден');
    return profile;
  }

  async getDashboard(userId: number) {
    const student = await this.getStudentProfile(userId);

    const theoryAttended = student.groupId
      ? await this.prisma.lesson.count({
          where: {
            groupId: student.groupId,
            type: 'THEORY',
            status: 'COMPLETED',
          },
        })
      : 0;

    const drivingAttended = await this.prisma.lesson.count({
      where: {
        studentId: student.id,
        type: 'DRIVING',
        status: 'COMPLETED',
      },
    });

    const theoryTotal = 24;
    const drivingTotal = 28;

    let currentStep = 0;
    if (drivingAttended > 0 && drivingAttended < 10) currentStep = 1; // Автодром
    else if (drivingAttended >= 10 && drivingAttended < 25) currentStep = 2; // Город
    else if (drivingAttended >= 25 && drivingAttended < drivingTotal) currentStep = 3; // Внутренний
    else if (drivingAttended >= drivingTotal && theoryAttended >= theoryTotal) currentStep = 4; // ГИБДД

    const totalCost = student.group?.course?.price ? Number(student.group.course.price) : 45000;
    const paid = student.payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const debt = totalCost - paid;

    const lastDrivingLesson = await this.prisma.lesson.findFirst({
      where: { studentId: student.id, type: 'DRIVING' },
      include: { instructor: true },
      orderBy: { createdAt: 'desc' },
    });

    const instructorInfo = lastDrivingLesson?.instructor
      ? {
          fullName: `${lastDrivingLesson.instructor.lastName} ${lastDrivingLesson.instructor.firstName}`,
          phone: lastDrivingLesson.instructor.phone || 'Не указан',
          car: `${lastDrivingLesson.instructor.carModel} (${lastDrivingLesson.instructor.carNumber})`,
        }
      : {
          fullName: 'Инструктор не назначен',
          phone: '—',
          car: '—',
        };

    return {
      fullName: `${student.lastName} ${student.firstName}`,
      category: student.group?.course?.name.includes('A') ? 'A' : 'B',
      status: student.group ? 'Активный' : 'Ожидает группу',
      startDate: student.group?.startDate?.toISOString().split('T')[0] || 'Не назначена',
      endDate: student.group?.endDate?.toISOString().split('T')[0] || 'Не назначена',
      groupName: student.group?.name || 'Без группы',
      progress: {
        theoryAttended,
        theoryTotal,
        drivingAttended,
        drivingTotal,
      },
      finance: {
        totalCost,
        paid,
        debt: debt > 0 ? debt : 0,
        dueDate: student.group?.endDate 
            ? new Date(student.group.endDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
            : 'Не определен',
      },
      instructor: instructorInfo,
      currentStep,
    };
  }

  async getUpcomingLessons(userId: number) {
    const student = await this.getStudentProfile(userId);

    const upcomingLessons = await this.prisma.lesson.findMany({
      where: {
        startTime: { gt: new Date() },
        status: 'SCHEDULED',
        OR: [
          { studentId: student.id },
          { groupId: student.groupId },
        ],
      },
      include: {
        instructor: true,
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 5,
    });

    return upcomingLessons.map((lesson) => {
      const startDate = new Date(lesson.startTime);
      const endDate = new Date(lesson.endTime);

      const formattedTime = `${startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

      return {
        id: lesson.id,
        type: lesson.type,
        date: startDate.toISOString().split('T')[0],
        time: formattedTime,
        instructorName: `${lesson.instructor.lastName} ${lesson.instructor.firstName}`,
        carInfo: lesson.type === 'DRIVING' 
          ? `${lesson.carModel || lesson.instructor.carModel} (${lesson.carNumber || lesson.instructor.carNumber})` 
          : undefined,
        location: lesson.type === 'THEORY' ? 'Учебный класс' : 'Автодром / Город',
      };
    });
  }
}