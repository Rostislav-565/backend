import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(data: CreatePaymentDto) {
    const student = await this.prisma.studentProfile.findUnique({ where: { id: data.studentId } });
    if (!student) throw new NotFoundException('Ученик не найден');

    const payment = await this.prisma.payment.create({
      data: {
        studentId: data.studentId,
        amount: data.amount,
        method: data.method,
        description: data.description,
        status: 'PAID',
      },
      include: {
        student: { include: { group: true } }
      }
    });

    await this.prisma.studentProfile.update({
      where: { id: data.studentId },
      data: { balance: { increment: data.amount } }
    });

    return this.mapForFrontend(payment);
  }

  async getAllPayments() {
    const payments = await this.prisma.payment.findMany({
      orderBy: { id: 'desc' },
      include: {
        student: { include: { group: true } }
      }
    });

    return payments.map(this.mapForFrontend);
  }

  async updatePayment(id: number, data: UpdatePaymentDto) {
    const updated = await this.prisma.payment.update({
      where: { id },
      data,
      include: {
        student: { include: { group: true } }
      }
    });
    return this.mapForFrontend(updated);
  }

  async deletePayment(id: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Платеж не найден');

    await this.prisma.studentProfile.update({
      where: { id: payment.studentId },
      data: { balance: { decrement: payment.amount } }
    });

    await this.prisma.payment.delete({ where: { id } });
    return { success: true, message: 'Платеж удален' };
  }

  private mapForFrontend(payment: any) {
    return {
      id: payment.id,
      studentId: payment.studentId,
      amount: Number(payment.amount),
      date: payment.createdAt, 
      description: payment.description,
      method: payment.method,
      status: payment.status,
      student: {
        id: payment.student.id,
        firstName: payment.student.firstName,
        lastName: payment.student.lastName,
        group: payment.student.group ? { name: payment.student.group.name } : null
      }
    };
  }
}