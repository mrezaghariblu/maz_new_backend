import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber,
  IsOptional, IsString, Length, Max, Min, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, UserType, DisabilitySeverity } from '@prisma/client';

export class CreateUserDto {
  @IsString() @Length(10, 10) nationalCode: string;
  @IsOptional() @IsString() @Length(1, 20) personnelCode?: string;
  @IsString() @Length(2, 80) firstName: string;
  @IsString() @Length(2, 80) lastName: string;
  @IsOptional() @IsString() @Length(2, 80) fatherName?: string;
  @IsEnum(Gender) gender: Gender;
  @IsEnum(UserType) userType: UserType;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) birthDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) birthMonth?: number;
  @IsOptional() @IsInt() birthYearShamsi?: number;
  @IsOptional() @IsInt() employmentTypeId?: number;
  @IsOptional() @IsInt() jobPositionId?: number;
  @IsOptional() @IsInt() employmentCategoryId?: number;
  @IsOptional() @IsNumber() requiredHours?: number;
  @IsOptional() @IsNumber() nonRequiredHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) exceptionalEntryDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) exceptionalEntryMonth?: number;
  @IsOptional() @IsInt() exceptionalEntryYear?: number;
  @IsOptional() @IsInt() serviceRecordYears?: number;
  @IsOptional() @IsInt() @Min(0) @Max(11) serviceRecordMonths?: number;
  @IsOptional() @IsInt() @Min(0) @Max(30) serviceRecordDays?: number;
  @IsOptional() @IsInt() maritalStatusId?: number;
  @IsOptional() @IsInt() educationDegreeId?: number;
  @IsOptional() @IsString() @Length(1, 100) fieldOfStudy?: string;
  @IsOptional() @IsString() @Length(1, 150) isargariStatus?: string;
  @IsOptional() @IsInt() physicalStatusId?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() shadMobileNumber?: string;
  @IsOptional() @IsString() shadUsername?: string;
  @IsOptional() @IsInt() districtId?: number;
  @IsOptional() @IsBoolean() willingJudgeCultural?: boolean;
  @IsOptional() @IsBoolean() willingJudgeQuranEtrat?: boolean;
  @IsOptional() @IsBoolean() willingJudgeSports?: boolean;
  @IsOptional() @IsString() judgeCertificateField?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsInt() centerId?: number;
  @IsOptional() @IsInt() academicYearId?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AssignDisabilityDto)
  disabilities?: AssignDisabilityDto[];
}

export class UpdateUserDto {
  // اجازه تغییر کد ملی — سرویس تکراری نبودن را بررسی می‌کند
  @IsOptional() @IsString() @Length(10, 10) nationalCode?: string;
  @IsOptional() @IsString() @Length(1, 20) personnelCode?: string;
  @IsOptional() @IsString() @Length(2, 80) firstName?: string;
  @IsOptional() @IsString() @Length(2, 80) lastName?: string;
  @IsOptional() @IsString() @Length(2, 80) fatherName?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsEnum(UserType) userType?: UserType;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) birthDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) birthMonth?: number;
  @IsOptional() @IsInt() birthYearShamsi?: number;
  @IsOptional() @IsInt() employmentTypeId?: number;
  @IsOptional() @IsInt() jobPositionId?: number;
  @IsOptional() @IsInt() employmentCategoryId?: number;
  @IsOptional() @IsNumber() requiredHours?: number;
  @IsOptional() @IsNumber() nonRequiredHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) exceptionalEntryDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) exceptionalEntryMonth?: number;
  @IsOptional() @IsInt() exceptionalEntryYear?: number;
  @IsOptional() @IsInt() serviceRecordYears?: number;
  @IsOptional() @IsInt() @Min(0) @Max(11) serviceRecordMonths?: number;
  @IsOptional() @IsInt() @Min(0) @Max(30) serviceRecordDays?: number;
  @IsOptional() @IsInt() maritalStatusId?: number;
  @IsOptional() @IsInt() educationDegreeId?: number;
  @IsOptional() @IsString() @Length(1, 100) fieldOfStudy?: string;
  @IsOptional() @IsString() @Length(1, 150) isargariStatus?: string;
  @IsOptional() @IsInt() physicalStatusId?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() shadMobileNumber?: string;
  @IsOptional() @IsString() shadUsername?: string;
  @IsOptional() @IsInt() districtId?: number;
  @IsOptional() @IsBoolean() willingJudgeCultural?: boolean;
  @IsOptional() @IsBoolean() willingJudgeQuranEtrat?: boolean;
  @IsOptional() @IsBoolean() willingJudgeSports?: boolean;
  @IsOptional() @IsString() judgeCertificateField?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── مدیریت دسترسی ورود (فقط SUPERUSER) ───────────────────
export class SetCanLoginDto {
  @IsBoolean() canLogin: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
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
  @IsOptional() @IsNumber() fromCenterId?: number;
  @IsNumber() toCenterId: number;
  @IsNumber() academicYearId: number;
  @IsOptional() @IsString() note?: string;
}

export class AssignDisabilityDto {
  @IsInt() disabilityTypeId: number;
  @IsOptional() @IsEnum(DisabilitySeverity) severity?: DisabilitySeverity;
  @IsOptional() @IsInt() @Min(1) @Max(3) autismLevel?: number;
}

export class SetDisabilitiesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => AssignDisabilityDto)
  items: AssignDisabilityDto[];
}
