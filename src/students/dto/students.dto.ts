// src/students/dto/student.dto.ts
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateStudentDto {
  @IsString()
  @Length(10, 10)
  @Matches(/^\d{10}$/)
  nationalCode: string;

  @IsString()
  @Length(2, 80)
  firstName: string;
  @IsString()
  @Length(2, 80)
  lastName: string;
  @IsEnum(Gender)
  gender: Gender;

  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() parentName?: string;
  @IsOptional() @IsString() parentPhone?: string;
  @IsOptional() @IsString() address?: string;
}

export class UpdateStudentDto {
  @IsOptional() @IsString() @Length(2, 80) firstName?: string;
  @IsOptional() @IsString() @Length(2, 80) lastName?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() parentName?: string;
  @IsOptional() @IsString() parentPhone?: string;
  @IsOptional() @IsString() address?: string;
}

export class EnrollStudentDto {
  @IsNumber() centerId: number;
  @IsNumber() academicYearId: number;
  @IsString() grade: string;
  @IsOptional() @IsString() field?: string;
}
