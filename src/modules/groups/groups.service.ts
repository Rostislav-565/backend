import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async createGroup(data: any) {
    return this.prisma.group.create({
      data: {
        name: data.name,
        courseId: data.courseId,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        theoryInstructorId: data.theoryInstructorId || null,
        
        students: data.studentIds && data.studentIds.length > 0 ? {
          connect: data.studentIds.map(id => ({ id }))
        } : undefined
      },
      include: {
        course: true,
        _count: { select: { students: true } }
      }
    });
  }

  async getAllGroups() {
    return this.prisma.group.findMany({
      include: {
        course: true,
        _count: {
          select: { students: true }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });
  }

  async updateGroup(id: number, data: any) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Группа не найдена');

    return this.prisma.group.update({
      where: { id },
      data: {
        name: data.name,
        courseId: data.courseId,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        theoryInstructorId: data.theoryInstructorId || null,
        
        students: data.studentIds ? {
          set: data.studentIds.map(studentId => ({ id: studentId }))
        } : undefined
      },
      include: {
        course: true,
        _count: { select: { students: true } }
      }
    });
  }

  async deleteGroup(id: number) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Группа не найдена');
    
    await this.prisma.group.delete({ where: { id } });
    return { message: 'Группа успешно удалена' };
  }
}