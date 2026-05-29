import { Injectable, BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private otpStorage = new Map<string, string>();

  constructor(
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
  ) {}

  async sendVerificationCode(email: string) {
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) {
      throw new BadRequestException('Пользователь с таким Email уже зарегистрирован');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    this.otpStorage.set(email, code);
    setTimeout(() => this.otpStorage.delete(email), 5 * 60 * 1000);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Код подтверждения регистрации | Автошкола БТМСХ',
        html: `
          <div style="background-color: #0d0d0d; color: #fff; padding: 30px; font-family: sans-serif; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #222;">
            <h2 style="color: #2f80ed; text-align: center;">Добро пожаловать в БТМСХ!</h2>
            <p style="font-size: 16px; line-height: 1.5; text-align: center;">Вы начали регистрацию личного кабинета. Используйте код ниже для подтверждения почты:</p>
            <div style="background-color: #161616; border: 1px solid #333; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #fff; margin: 25px 0;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #555; text-align: center;">Код действителен 5 минут. Если вы не запрашивали его, проигнорируйте письмо.</p>
          </div>
        `,
      });

      return { message: 'Код успешно отправлен на почту' };
    } catch (error) {
      console.error('Ошибка отправки почты:', error);
      throw new BadRequestException('Не удалось отправить письмо с кодом');
    }
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
      },
    });

    this.otpStorage.delete(email);

    return {
      message: 'Регистрация успешно завершена!',
      userId: newUser.id,
      email: newUser.email,
    }
  }

  async loginUser(dto: any) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new BadRequestException('Неверный Email или пароль');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Неверный Email или пароль');
    }

    return {
      message: 'Вход успешно выполнен',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    }
  }
}
