import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { Gender, UserType } from '@prisma/client';

export class CreateUserDto {
  @IsString() @Length(10, 10) nationalCode: string;
  @IsString() @Length(2, 80) firstName: string;
  @IsString() @Length(2, 80) lastName: string;
  @IsEnum(Gender) gender: Gender;
  @IsEnum(UserType) userType: UserType;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @Length(2, 80) firstName?: string;
  @IsOptional() @IsString() @Length(2, 80) lastName?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsEnum(UserType) userType?: UserType;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ChangePasswordDto {
  @IsString() @MinLength(6) newPassword: string;
}

export class AssignCenterDto {
  @IsNumber() centerId: number;
  @IsNumber() academicYearId: number;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsString() note?: string;
}

export class TransferDto {
  @IsNumber() fromCenterId: number;
  @IsNumber() toCenterId: number;
  @IsNumber() academicYearId: number;
  @IsOptional() @IsString() note?: string;
}
