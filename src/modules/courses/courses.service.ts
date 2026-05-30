import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CoursesService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.course.count();
    
    if (count === 0) {
      console.log('Таблица курсов пуста. Загружаю стандартные программы обучения...');
      
      const defaultCourses = [
        { name: 'Категория M', description: 'Мопеды и скутеры до 50 куб. см.', price: 8000 },
        { name: 'Категория A1', description: 'Легкие мотоциклы (до 125 куб. см).', price: 10000 },
        { name: 'Категория A', description: 'Мотоциклы. Любые объемы двигателей.', price: 16000 },
        { name: 'Категория B', description: 'Легковые авто. Обучение на МКПП и АКПП.', price: 40000 },
        { name: 'Категория BE', description: 'Легковые автомобили с тяжелым прицепом.', price: 20000 },
        { name: 'Категория C', description: 'Грузовые авто свыше 3.5 тонн.', price: 24000 },
        { name: 'Категория CE', description: 'Грузовики с прицепом (фуры).', price: 30000 },
        { name: 'Категория D', description: 'Автобусы. Профессиональная перевозка пассажиров.', price: 50000 },
      ];

      await this.prisma.course.createMany({
        data: defaultCourses
      });
      console.log('Курсы успешно загружены в базу!');
    }
  }

  async getAllCourses() {
    return this.prisma.course.findMany({
      orderBy: { id: 'asc' }
    });
  }

  async getCourseById(id: number) {
    return this.prisma.course.findUnique({ where: { id } });
  }
}