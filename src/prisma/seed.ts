import { PrismaClient, Role, LessonType, LessonStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { fakerRU as faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Генерация телефона РФ
const generatePhone = () => {
  return `+7 (9${faker.string.numeric(2)}) ${faker.string.numeric(3)}-${faker.string.numeric(2)}-${faker.string.numeric(2)}`;
};

// НОВОЕ: Функция для генерации адекватного рабочего времени (с 08:00 до 19:00)
const getRealisticWorkingDate = (baseDate: Date) => {
  const newDate = new Date(baseDate);
  const hour = faker.number.int({ min: 8, max: 19 }); // Часы от 8 до 19
  const minute = faker.helpers.arrayElement([0, 30]); // Минуты ровно 00 или 30
  newDate.setHours(hour, minute, 0, 0);
  return newDate;
};

async function main() {
  console.log('🌱 Начинаем массовый засев базы данных (Реалистичный режим)...');

  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.group.deleteMany();
  await prisma.course.deleteMany();
  await prisma.instructorProfile.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  const courseA = await prisma.course.create({ data: { name: 'Категория А (Мотоциклы)', price: 25000 } });
  const courseB = await prisma.course.create({ data: { name: 'Категория B (Легковые)', price: 45000 } });

  // ==========================================
  // 1. ИНСТРУКТОРЫ
  // ==========================================
  const instructors: any[] = [];
  for (let i = 0; i < 10; i++) {
    const gender = faker.helpers.arrayElement(['male', 'female'] as const);
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName(gender);
    const fullName = `${lastName} ${firstName}`; // Единое имя для всех таблиц

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: defaultPassword,
        role: Role.INSTRUCTOR, // Исправлено: Инструктор должен иметь роль INSTRUCTOR, а не STUDENT
        instructorProfile: {
          create: {
            firstName: firstName,
            lastName: lastName,
            phone: generatePhone(),
            carModel: faker.helpers.arrayElement(['Lada Granta', 'Renault Logan', 'Kia Rio', 'Hyundai Solaris', 'Skoda Rapid']),
            carNumber: `${faker.string.alpha({ length: 1, casing: 'upper' })}${faker.number.int({ min: 100, max: 999 })}${faker.string.alpha({ length: 2, casing: 'upper' })} 77`,
            experience: faker.number.int({ min: 2, max: 20 }),
          },
        },
      },
      include: { instructorProfile: true },
    });
    instructors.push(user.instructorProfile);
  }
  console.log('✅ Создано 10 инструкторов');

  // ==========================================
  // 2. ГРУППЫ
  // ==========================================
  const groups: any[] = [];
  for (let i = 0; i < 5; i++) {
    const group = await prisma.group.create({
      data: {
        name: `Группа ${faker.helpers.arrayElement(['А', 'В'])}-${faker.number.int({ min: 10, max: 99 })}/2026`,
        courseId: faker.helpers.arrayElement([courseA.id, courseB.id]),
        theoryInstructorId: faker.helpers.arrayElement(instructors)?.id,
        startDate: faker.date.recent({ days: 60 }),
        endDate: faker.date.soon({ days: 90 }),
      },
    });
    groups.push(group);
  }
  console.log('✅ Создано 5 учебных групп');

  // ==========================================
  // 3. СТУДЕНТЫ
  // ==========================================
  const students: any[] = [];
  for (let i = 0; i < 100; i++) {
    const randomGroup = faker.helpers.arrayElement(groups);
    
    // Определяем пол и имя
    const gender = faker.helpers.arrayElement(['male', 'female'] as const);
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName(gender);
    const fullName = `${lastName} ${firstName}`;

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: defaultPassword,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            firstName: firstName,
            lastName: lastName,
            phone: generatePhone(),
            groupId: randomGroup.id,
            balance: 0,
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push(user.studentProfile);

    await prisma.payment.create({
      data: {
        studentId: user.studentProfile!.id,
        amount: faker.helpers.arrayElement([10000, 20000, 45000]),
        method: faker.helpers.arrayElement([PaymentMethod.CARD, PaymentMethod.CASH, PaymentMethod.SBP]),
        status: PaymentStatus.PAID,
      },
    });
  }
  console.log('✅ Создано 100 студентов с историей оплат');

  // ==========================================
  // 4. ТЕОРИЯ
  // ==========================================
  for (const group of groups) {
    const groupStudents = students.filter(s => s?.groupId === group.id);
    
    for (let i = 0; i < 10; i++) {
      // Генерируем дату и приводим к рабочему времени
      const rawDate = faker.date.recent({ days: 30 });
      const lessonDate = getRealisticWorkingDate(rawDate);
      
      const lesson = await prisma.lesson.create({
        data: {
          type: LessonType.THEORY,
          startTime: lessonDate,
          endTime: new Date(lessonDate.getTime() + 2 * 60 * 60 * 1000), // + 2 часа
          status: LessonStatus.COMPLETED,
          notes: `ПДД Раздел ${i + 1}`,
          instructorId: group.theoryInstructorId!,
          groupId: group.id,
        },
      });

      for (const student of groupStudents) {
        await prisma.attendance.create({
          data: {
            lessonId: lesson.id,
            studentId: student!.id,
            isPresent: faker.number.int({ min: 1, max: 100 }) > 15, 
          }
        });
      }
    }
  }
  console.log('✅ Сгенерированы лекции теории и электронные журналы');

  // ==========================================
  // 5. ВОЖДЕНИЕ
  // ==========================================
  let drivingLessonsCount = 0;
  for (const student of students) {
    const personalInstructor = faker.helpers.arrayElement(instructors);
    
    for (let i = 0; i < 15; i++) {
      const isPast = faker.datatype.boolean();
      
      // Генерируем дату и приводим к рабочему времени
      const rawDate = isPast ? faker.date.recent({ days: 40 }) : faker.date.soon({ days: 14 });
      const lessonDate = getRealisticWorkingDate(rawDate);
      
      await prisma.lesson.create({
        data: {
          type: LessonType.DRIVING,
          startTime: lessonDate,
          endTime: new Date(lessonDate.getTime() + 1.5 * 60 * 60 * 1000), // + 1.5 часа
          status: isPast ? LessonStatus.COMPLETED : LessonStatus.SCHEDULED,
          notes: isPast ? 'Отработка маневров' : null,
          instructorId: personalInstructor!.id,
          studentId: student!.id,
        },
      });
      drivingLessonsCount++;
    }
  }
  console.log(`✅ Создано ${drivingLessonsCount} индивидуальных уроков вождения`);
  console.log('🎉 БАЗА УСПЕШНО ЗАПОЛНЕНА РЕАЛИСТИЧНЫМИ ДАННЫМИ!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });