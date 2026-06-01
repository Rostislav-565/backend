import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum LessonType {
  THEORY = 'THEORY',
  DRIVING = 'DRIVING',
}

export class CreateLessonDto {
  @IsEnum(LessonType)
  type!: LessonType;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;

  @ValidateIf((o) => o.type === LessonType.DRIVING)
  @IsInt()
  studentId?: number;

  @ValidateIf((o) => o.type === LessonType.THEORY)
  @IsInt()
  groupId?: number;

  @IsOptional() @IsString() carModel?: string;
  @IsOptional() @IsString() carNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLessonDto {
  @IsOptional() @IsISO8601() startTime?: string;
  @IsOptional() @IsISO8601() endTime?: string;
  @IsOptional() @IsInt() studentId?: number;
  @IsOptional() @IsString() carModel?: string;
  @IsOptional() @IsString() carNumber?: string;
  @IsOptional() @IsString() notes?: string;
}