import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, VerifyResetCodeDto, ResetPasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  async sendCode(@Body('email') email: string) {
    return this.authService.sendVerificationCode(email);
  }

  @Post('register')
  async register(@Body() dto: any) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  async login(@Body() dto: any) {
    try {
      return await this.authService.loginUser(dto);
    } catch (error) {
      console.error('Ошибка при входе:', error);
      throw error;
    }
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('verify-reset-code')
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto.email, dto.code);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }
}