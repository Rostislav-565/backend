import { PrismaClient, Role, LessonType, LessonStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { fakerRU as faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Генерация валидного телефона РФ
const generatePhone = () => {
  return `+7 (9${faker.string.numeric(2)}) ${faker.string.numeric(3)}-${faker.string.numeric(2)}-${faker.string.numeric(2)}`;
};

// Функция для генерации адекватного рабочего времени (с 08:00 до 19:00)
const getRealisticWorkingDate = (baseDate: Date) => {
  const newDate = new Date(baseDate);
  const hour = faker.number.int({ min: 8, max: 19 });
  const minute = faker.helpers.arrayElement([0, 30]);
  newDate.setHours(hour, minute, 0, 0);
  return newDate;
};

async function main() {
  console.log('🌱 Очистка базы данных перед засевом...');

  // Удаляем данные в строгом порядке, учитывая внешние ключи (Foreign Keys)
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.group.deleteMany();
  await prisma.course.deleteMany();
  await prisma.instructorProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('🔄 Старые данные успешно удалены. Генерируем новые...');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // Создаем базовые курсы автошколы
  const courseA = await prisma.course.create({ data: { name: 'Категория А (Мотоциклы)', price: 25000, description: 'Полный курс обучения вождению мотоцикла с подготовкой к экзамену в ГИБДД.' } });
  const courseB = await prisma.course.create({ data: { name: 'Категория B (Легковые)', price: 45000, description: 'Обучение вождению легкового автомобиля (МКПП/АКПП), теория и практика.' } });

  // ==========================================
  // ТЕСТОВЫЕ АККАУНТЫ ДЛЯ ТЕБЯ (ДЛЯ ВХОДА НА ЗАЩИТЕ)
  // ==========================================
  
  // 1. Главный Админ
  await prisma.user.create({
    data: {
      name: 'Администратор БТМСХ',
      email: 'admin@auto.ru',
      password: defaultPassword,
      role: Role.ADMIN,
    }
  });

  // 2. Демо-Инструктор
  const demoInstructorUser = await prisma.user.create({
    data: {
      name: 'Петров Петр Петрович',
      email: 'instructor@auto.ru',
      password: defaultPassword,
      role: Role.INSTRUCTOR,
      instructorProfile: {
        create: {
          firstName: 'Петр',
          lastName: 'Петров',
          phone: '+7 (999) 111-22-33',
          carModel: 'Hyundai Solaris',
          carNumber: 'А123АА 777',
          experience: 10,
        }
      }
    },
    include: { instructorProfile: true }
  });

  // 3. Демо-Студент (СВОБОДНЫЙ, БЕЗ ГРУППЫ — для демонстрации добавления в группу!)
  const demoStudentUser = await prisma.user.create({
    data: {
      name: 'Иванов Иван Иванович',
      email: 'student@auto.ru',
      password: defaultPassword,
      role: Role.STUDENT,
      studentProfile: {
        create: {
          firstName: 'Иван',
          lastName: 'Иванов',
          phone: '+7 (999) 555-44-33',
          groupId: null, // Он свободный!
          balance: 0,
        }
      }
    },
    include: { studentProfile: true }
  });

  // Добавим демо-студенту успешную оплату
  await prisma.payment.create({
    data: {
      studentId: demoStudentUser.studentProfile!.id,
      amount: 15000,
      method: PaymentMethod.SBP,
      status: PaymentStatus.PAID,
      description: 'Частичная оплата за обучение',
    }
  });

  // ==========================================
  // ГЕНЕРАЦИЯ ОСТАЛЬНЫХ ДАННЫХ (ДЛЯ МАССОВОСТИ)
  // ==========================================

  // Генерируем инструкторов
  const instructors: any[] = [demoInstructorUser.instructorProfile];
  for (let i = 0; i < 8; i++) {
    const gender = faker.helpers.arrayElement(['male', 'female'] as const);
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName(gender);
    const fullName = `${lastName} ${firstName}`;

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: defaultPassword,
        role: Role.INSTRUCTOR,
        instructorProfile: {
          create: {
            firstName,
            lastName,
            phone: generatePhone(),
            carModel: faker.helpers.arrayElement(['Lada Granta', 'Renault Logan', 'Kia Rio', 'Skoda Rapid']),
            carNumber: `${faker.string.alpha({ length: 1, casing: 'upper' })}${faker.number.int({ min: 100, max: 999 })}${faker.string.alpha({ length: 2, casing: 'upper' })} 64`,
            experience: faker.number.int({ min: 3, max: 15 }),
          },
        },
      },
      include: { instructorProfile: true },
    });
    instructors.push(user.instructorProfile);
  }
  console.log('✅ Созданы инструкторы и их автопарк');

  // Генерируем учебные группы
  const groups: any[] = [];
  const groupNames = ['Группа А-01/2026', 'Группа Б-01/2026', 'Группа Б-02/2026', 'Группа А-02/2026'];
  
  for (let i = 0; i < groupNames.length; i++) {
    const isCategoryA = groupNames[i].includes('А');
    const group = await prisma.group.create({
      data: {
        name: groupNames[i],
        courseId: isCategoryA ? courseA.id : courseB.id,
        theoryInstructorId: faker.helpers.arrayElement(instructors).id,
        startDate: faker.date.recent({ days: 30 }),
        endDate: faker.date.soon({ days: 90 }),
      },
    });
    groups.push(group);
  }
  console.log('✅ Созданы учебные группы');

  // Генерируем студентов (часть в группах, часть — свободные!)
  const students: any[] = [demoStudentUser.studentProfile];
  
  for (let i = 0; i < 60; i++) {
    const gender = faker.helpers.arrayElement(['male', 'female'] as const);
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName(gender);
    const fullName = `${lastName} ${firstName}`;

    // КРИТИЧЕСКИЙ ФИКС: 45 студентов раскидываем по группам, а 15 оставляем без группы (groupId: null)
    const assignToGroup = i < 45;
    const targetGroup = assignToGroup ? faker.helpers.arrayElement(groups) : null;

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: defaultPassword,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            firstName,
            lastName,
            phone: generatePhone(),
            groupId: targetGroup ? targetGroup.id : null,
            balance: 0,
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push(user.studentProfile);

    // Добавляем студенту историю оплат
    await prisma.payment.create({
      data: {
        studentId: user.studentProfile!.id,
        amount: faker.helpers.arrayElement([15000, 25000, 45000]),
        method: faker.helpers.arrayElement([PaymentMethod.CARD, PaymentMethod.CASH, PaymentMethod.SBP]),
        status: PaymentStatus.PAID,
        description: 'Оплата за обучение в автошколе',
      },
    });
  }
  console.log('✅ Созданы студенты (75% распределены по группам, 25% свободны для админки)');

  // Генерируем Лекции теории для сформированных групп
  for (const group of groups) {
    const groupStudents = students.filter(s => s?.groupId === group.id);
    if (groupStudents.length === 0) continue;

    for (let i = 0; i < 5; i++) {
      const rawDate = faker.date.recent({ days: 15 });
      const lessonDate = getRealisticWorkingDate(rawDate);

      const lesson = await prisma.lesson.create({
        data: {
          type: LessonType.THEORY,
          startTime: lessonDate,
          endTime: new Date(lessonDate.getTime() + 2 * 60 * 60 * 1000), // +2 часа лекция
          status: LessonStatus.COMPLETED,
          notes: `Теоретическое занятие. Тема №${i + 1}`,
          instructorId: group.theoryInstructorId!,
          groupId: group.id,
        },
      });

      // Заполняем журнал посещаемости для этой лекции
      for (const student of groupStudents) {
        await prisma.attendance.create({
          data: {
            lessonId: lesson.id,
            studentId: student.id,
            isPresent: faker.number.int({ min: 1, max: 100 }) > 15, // 85% посещаемость
          },
        });
      }
    }
  }
  console.log('✅ Созданы журналы теории и посещаемости');

  // Генерируем Практические занятия (Вождение) только для студентов, у которых есть группа
  const studentsWithGroup = students.filter(s => s?.groupId !== null);
  
  for (const student of studentsWithGroup) {
    const personalInstructor = faker.helpers.arrayElement(instructors);

    for (let i = 0; i < 6; i++) {
      const isPast = i < 4; // 4 занятия в прошлом (выполнены), 2 в будущем (запланированы)
      const rawDate = isPast ? faker.date.recent({ days: 20 }) : faker.date.soon({ days: 10 });
      const lessonDate = getRealisticWorkingDate(rawDate);

      await prisma.lesson.create({
        data: {
          type: LessonType.DRIVING,
          startTime: lessonDate,
          endTime: new Date(lessonDate.getTime() + 1.5 * 60 * 60 * 1000), // 1.5 часа вождение
          status: isPast ? LessonStatus.COMPLETED : LessonStatus.SCHEDULED,
          notes: isPast ? 'Успешная отработка элементов на автодроме' : 'Городской маршрут №2',
          carModel: personalInstructor.carModel,
          carNumber: personalInstructor.carNumber,
          instructorId: personalInstructor.id,
          studentId: student.id,
        },
      });
    }
  }

  console.log('✅ Индивидуальные занятия по вождению успешно разложены по календарям');
  console.log('🎉 БАЗА ДАННЫХ ИДЕАЛЬНО И БЕЗОПАСНО ЗАСЕЯНА СВЯЗАННЫМИ ДАННЫМИ!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка во время засева:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });