import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  private async getStudentProfile(userId: number) {
    return await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        group: { include: { course: true } },
        payments: true,
      },
    });
  }

  async getDashboard(userId: number) {
    const student = await this.getStudentProfile(userId);

    if (!student) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      return {
        fullName: user?.name || 'Новый курсант',
        category: '—',
        status: 'Ожидает распределения',
        startDate: 'Не назначена',
        endDate: 'Не назначена',
        groupName: 'Без группы',
        progress: { theoryAttended: 0, theoryTotal: 24, drivingAttended: 0, drivingTotal: 28 },
        finance: { totalCost: 0, paid: 0, debt: 0, dueDate: 'Не определен' },
        instructor: { fullName: 'Инструктор не назначен', phone: '—', car: '—' },
        currentStep: 0,
      };
    }

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

    if (drivingAttended >= drivingTotal && theoryAttended >= theoryTotal) {
      currentStep = 4;
    } 
    else if (drivingAttended >= 25) {
      currentStep = 3;
    } 
    else if (drivingAttended > 10) {
      currentStep = 2;
    } 
    else if (drivingAttended > 0 || theoryAttended >= 2) {
      currentStep = 1;
    }

    const totalCost = student.group?.course?.price ? Number(student.group.course.price) : 45000;
    const paid = student.payments
      ? student.payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0)
      : 0;
    const debt = totalCost - paid;

    const lastDrivingLesson = await this.prisma.lesson.findFirst({
      where: { studentId: student.id, type: 'DRIVING' },
      include: { instructor: true },
      orderBy: { startTime: 'desc' }, 
    });

    const instructorInfo = lastDrivingLesson?.instructor
      ? {
          fullName: `${lastDrivingLesson.instructor.lastName || ''} ${lastDrivingLesson.instructor.firstName || ''}`.trim() || 'Инструктор',
          phone: lastDrivingLesson.instructor.phone || 'Не указан',
          car: lastDrivingLesson.instructor.carModel 
            ? `${lastDrivingLesson.instructor.carModel} (${lastDrivingLesson.instructor.carNumber || '—'})`
            : '—',
        }
      : {
          fullName: 'Инструктор не назначен',
          phone: '—',
          car: '—',
        };

    const formatDate = (date: any) => {
      if (!date) return 'Не назначена';
      const d = new Date(date);
      return isNaN(d.getTime()) ? 'Не назначена' : d.toISOString().split('T')[0];
    };

    return {
      fullName: student.lastName && student.firstName ? `${student.lastName} ${student.firstName}` : (student.user?.name || 'Курсант'),
      category: student.group?.course?.name.includes('A') ? 'A' : 'B',
      status: student.group ? 'Активный' : 'Ожидает группу',
      startDate: formatDate(student.group?.startDate),
      endDate: formatDate(student.group?.endDate),
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
            ? formatDate(new Date(new Date(student.group.endDate).getTime() - 14 * 24 * 60 * 60 * 1000))
            : 'Не определен',
      },
      instructor: instructorInfo,
      currentStep,
    };
  }

  async getUpcomingLessons(userId: number) {
    const student = await this.getStudentProfile(userId);
    if (!student) return [];

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
      const startDate = lesson.startTime ? new Date(lesson.startTime) : new Date();
      const endDate = lesson.endTime ? new Date(lesson.endTime) : new Date();

      const formattedTime = `${startDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

      return {
        id: lesson.id,
        type: lesson.type,
        date: startDate.toISOString().split('T')[0],
        time: formattedTime,
        instructorName: lesson.instructor 
          ? `${lesson.instructor.lastName || ''} ${lesson.instructor.firstName || ''}`.trim() || 'Преподаватель'
          : 'Не указан',
        carInfo: lesson.type === 'DRIVING' && lesson.instructor
          ? `${lesson.carModel || lesson.instructor.carModel || 'ТС'} (${lesson.carNumber || lesson.instructor.carNumber || '—'})` 
          : undefined,
        location: lesson.type === 'THEORY' ? 'Учебный класс' : 'Автодром / Город',
      };
    });
  }
}