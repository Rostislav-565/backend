import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';

@Injectable()
export class AuthService {
  private otpStorage = new Map<string, string>();

  private readonly googleScriptUrl = 'https://script.google.com/macros/s/AKfycbwX4eS9fhqt3b0KelnEkpsIZCRKSMbcGxMQydzKGaCmO5rJmNNAVBshOwGbJdo8VYlUTw/exec';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async sendEmailViaApi(email: string, subject: string, html: string) {
    try {
      await axios.post(this.googleScriptUrl, {
        to: email,
        subject: subject,
        html: html
      });
      console.log(`✅ Письмо успешно ушло на ${email} через Google API`);
    } catch (e: any) {
      console.error('⚠️ Ошибка Google API:', e.message);
      throw new BadRequestException('Не удалось отправить письмо. Проверьте адрес или попробуйте позже.');
    }
  }

  async sendVerificationCode(email: string) {
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) {
      throw new BadRequestException('Пользователь с таким Email уже зарегистрирован');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpStorage.set(email, code);
    setTimeout(() => this.otpStorage.delete(email), 5 * 60 * 1000);

    const htmlContent = `
      <div style="background-color: #0d0d0d; color: #fff; padding: 30px; font-family: sans-serif; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #222;">
        <h2 style="color: #2f80ed; text-align: center;">Добро пожаловать в БТМСХ!</h2>
        <p style="font-size: 16px; line-height: 1.5; text-align: center;">Вы начали регистрацию. Используйте код ниже для подтверждения почты:</p>
        <div style="background-color: #161616; border: 1px solid #333; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #fff; margin: 25px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #555; text-align: center;">Код действителен 5 минут.</p>
      </div>
    `;

    await this.sendEmailViaApi(email, 'Код подтверждения регистрации | Автошкола БТМСХ', htmlContent);

    return { message: 'Код успешно отправлен' };
  }

  async registerUser(dto: any) {
    const { email, password, name, verificationCode } = dto;
    const savedCode = this.otpStorage.get(email);

    if (!savedCode || savedCode !== verificationCode) {
      throw new BadRequestException('Неверный или истекший код подтверждения');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'GUEST',
        name: name,
      },
    });

    this.otpStorage.delete(email);

    return {
      message: 'Регистрация успешно завершена! Ожидайте подтверждения администратором.',
      userId: newUser.id,
      email: newUser.email,
    }
  }

  async loginUser(dto: any) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new BadRequestException('Неверный Email или пароль');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    
    return {
      message: 'Вход успешно выполнен',
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      token: this.jwtService.sign(payload),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new NotFoundException('Пользователь с таким email не найден');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetCode: code, resetCodeExpires: expires },
    });

    const htmlContent = `
      <div style="background-color: #0d0d0d; color: #fff; padding: 30px; font-family: sans-serif; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #222;">
        <h2 style="color: #2f80ed; text-align: center;">Восстановление доступа</h2>
        <p style="font-size: 16px; line-height: 1.5; text-align: center;">Ваш секретный код:</p>
        <div style="font-size: 28px; font-weight: bold; text-align: center; color: #fff; margin: 25px 0;">${code}</div>
      </div>`;

    await this.sendEmailViaApi(email, 'Восстановление пароля | Автошкола БТМСХ', htmlContent);

    return { success: true, message: 'Код отправлен на почту' };
  }

  async verifyResetCode(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.resetCode !== code) {
      throw new BadRequestException('Неверный код восстановления');
    }
    if (!user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      throw new BadRequestException('Срок действия кода истёк. Запросите новый.');
    }
    return { success: true, message: 'Код верный' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    await this.verifyResetCode(email, code);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpires: null,
      },
    });
    return { success: true, message: 'Пароль успешно изменен' };
  }
}