import { IsInt, IsNumber, IsOptional, IsString, IsEnum, IsPositive } from 'class-validator';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  SBP = 'SBP',
  TRANSFER = 'TRANSFER',
}

export class CreatePaymentDto {
  @IsInt()
  studentId!: number;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;
}