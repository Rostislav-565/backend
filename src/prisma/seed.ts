import { PrismaClient, Role, LessonType, LessonStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const getRelativeDate = (daysOffset: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 0, 0, 0);
  return date;
};

async function main() {
  console.log('🌱 Начинаем детерминированную очистку БД...');

  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.group.deleteMany();
  await prisma.course.deleteMany();
  await prisma.instructorProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('🔄 База чиста. Создаем идеальный презентационный набор данных...');

  const password123 = await bcrypt.hash('password123', 10);

  const courseB = await prisma.course.create({
    data: { name: 'Категория B (Легковые)', price: 45000, description: 'Полный курс с теорией и вождением.' }
  });

  await prisma.user.create({
    data: { name: 'Администратор БТМСХ', email: 'admin@auto.ru', password: password123, role: Role.ADMIN }
  });

  const theoryInstructor = await prisma.user.create({
    data: {
      name: 'Смирнов Петр (Теория)', email: 'theory@auto.ru', password: password123, role: Role.INSTRUCTOR,
      instructorProfile: {
        create: { firstName: 'Петр', lastName: 'Смирнов', phone: '+7 (999) 111-11-11', carModel: 'Аудитория 101', carNumber: '-', experience: 15 }
      }
    }, include: { instructorProfile: true }
  });

  const drivingInstructor = await prisma.user.create({
    data: {
      name: 'Иванов Алексей (Вождение)', email: 'drive@auto.ru', password: password123, role: Role.INSTRUCTOR,
      instructorProfile: {
        create: { firstName: 'Алексей', lastName: 'Иванов', phone: '+7 (999) 222-22-22', carModel: 'Kia Rio', carNumber: 'А123АА 64', experience: 7 }
      }
    }, include: { instructorProfile: true }
  });

  const group = await prisma.group.create({
    data: {
      name: 'Группа Б-01/2026',
      courseId: courseB.id,
      theoryInstructorId: theoryInstructor.instructorProfile!.id,
      startDate: getRelativeDate(-14, 9),
      endDate: getRelativeDate(60, 18),
    }
  });

  const student1 = await prisma.user.create({
    data: {
      name: 'Соколов Дмитрий', email: 'student1@auto.ru', password: password123, role: Role.STUDENT,
      studentProfile: { create: { firstName: 'Дмитрий', lastName: 'Соколов', phone: '+7 (900) 000-00-01', groupId: group.id, balance: 45000 } }
    }, include: { studentProfile: true }
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Попова Анна', email: 'student2@auto.ru', password: password123, role: Role.STUDENT,
      studentProfile: { create: { firstName: 'Анна', lastName: 'Попова', phone: '+7 (900) 000-00-02', groupId: group.id, balance: 20000 } }
    }, include: { studentProfile: true }
  });

  const freeStudent = await prisma.user.create({
    data: {
      name: 'Новиков Егор (Новичок)', email: 'new@auto.ru', password: password123, role: Role.STUDENT,
      studentProfile: {
        create: { firstName: 'Егор', lastName: 'Новиков', phone: '+7 (999) 999-99-99', groupId: null, balance: 0 }
      }
    }, include: { studentProfile: true }
  });

  await prisma.payment.create({ data: { studentId: student1.studentProfile!.id, amount: 45000, method: PaymentMethod.CARD, status: PaymentStatus.PAID, description: 'Полная оплата' } });
  await prisma.payment.create({ data: { studentId: student2.studentProfile!.id, amount: 20000, method: PaymentMethod.SBP, status: PaymentStatus.PAID, description: 'Частичная оплата' } });

  const theoryLesson1 = await prisma.lesson.create({
    data: {
      type: LessonType.THEORY,
      startTime: getRelativeDate(-1, 18),
      endTime: getRelativeDate(-1, 20),
      status: LessonStatus.COMPLETED,
      notes: 'ПДД: Знаки приоритета',
      instructorId: theoryInstructor.instructorProfile!.id,
      groupId: group.id,
    }
  });

  await prisma.attendance.createMany({
    data: [
      { lessonId: theoryLesson1.id, studentId: student1.studentProfile!.id, isPresent: true },
      { lessonId: theoryLesson1.id, studentId: student2.studentProfile!.id, isPresent: false },
    ]
  });

  const endTime = getRelativeDate(1, 11);
endTime.setMinutes(30);

  await prisma.lesson.create({
    data: {
      type: LessonType.DRIVING,
      startTime: getRelativeDate(1, 10),
      endTime: endTime,
      status: LessonStatus.SCHEDULED,
      notes: 'Городской маршрут №1',
      instructorId: drivingInstructor.instructorProfile!.id,
      studentId: student1.studentProfile!.id,
      carModel: drivingInstructor.instructorProfile!.carModel,
      carNumber: drivingInstructor.instructorProfile!.carNumber,
    }
  });

  console.log('✅ ИДЕАЛЬНАЯ БАЗА ДЛЯ ПРЕЗЕНТАЦИИ ГОТОВА!');
  console.log('🔐 Доступы:');
  console.log('Админ: admin@auto.ru | Пароль: password123');
  console.log('Инструктор по вождению: drive@auto.ru');
  console.log('Ученик с расписанием: student1@auto.ru');
  console.log('Свободный ученик (для тестов): new@auto.ru');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });