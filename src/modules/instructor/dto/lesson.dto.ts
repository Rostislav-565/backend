import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, ValidateIf, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum LessonType {
  THEORY = 'THEORY',
  DRIVING = 'DRIVING',
}

export enum LessonStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class AttendanceRecordDto {
  @IsInt()
  studentId!: number;

  @IsBoolean()
  isPresent!: boolean;
}

export class CreateLessonDto {
  @IsEnum(LessonType)
  type!: LessonType;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;

  @ValidateIf((o) => o.type === LessonType.DRIVING)
  @IsOptional()
  @IsInt()
  studentId?: number;

  @ValidateIf((o) => o.type === LessonType.THEORY)
  @IsOptional()
  @IsInt()
  groupId?: number;

  @IsOptional()
  @IsInt()
  instructorId?: number; 

  @IsOptional() @IsString() carModel?: string;
  @IsOptional() @IsString() carNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLessonDto {
  @IsOptional() @IsISO8601() startTime?: string;
  @IsOptional() @IsISO8601() endTime?: string;
  @IsOptional() @IsInt() studentId?: number;
  @IsOptional() @IsInt() instructorId?: number;
  @IsOptional() @IsString() carModel?: string;
  @IsOptional() @IsString() carNumber?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  attendance?: AttendanceRecordDto[];
}