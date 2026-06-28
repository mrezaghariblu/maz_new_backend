import {
  IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString,
  Length, Max, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, AttendanceType, PromotionDecision, DisabilitySeverity } from '@prisma/client';
import { AssignDisabilityDto } from '../../users/dto/user.dto';

export class CreateStudentDto {
  @IsString() @Length(10, 10) nationalCode: string;
  @IsString() @Length(2, 80) firstName: string;
  @IsString() @Length(2, 80) lastName: string;
  @IsEnum(Gender) gender: Gender;
  @IsOptional() @IsInt() @Min(1) @Max(31) birthDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) birthMonth?: number;
  @IsOptional() @IsInt() birthYearShamsi?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() homePhone?: string;
  @IsOptional() @IsString() @Length(1, 100) guardianName?: string;
  @IsOptional() @IsString() @Length(10, 10) guardianNationalCode?: string;
  @IsOptional() @IsString() guardianPhone?: string;
  @IsOptional() @IsInt() guardianPhysicalStatusId?: number;
  @IsOptional() @IsString() @Length(1, 100) secondGuardianName?: string;
  @IsOptional() @IsString() @Length(10, 10) secondGuardianNationalCode?: string;
  @IsOptional() @IsString() secondGuardianPhone?: string;
  @IsOptional() @IsInt() secondGuardianPhysicalStatusId?: number;
  @IsOptional() @IsInt() educationLevelId?: number;
  @IsOptional() @IsInt() gradeId?: number;
  @IsOptional() @IsInt() fieldOfStudyId?: number;
  @IsOptional() @IsInt() centerId?: number;
  @IsOptional() @IsInt() districtId?: number;
  @IsOptional() @IsEnum(AttendanceType) attendanceType?: AttendanceType;
  @IsOptional() @IsInt() @Min(1) @Max(31) entryDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) entryMonth?: number;
  @IsOptional() @IsInt() entryYear?: number;
  @IsOptional() @IsInt() physicalStatusId?: number;
  @IsOptional() @IsInt() bookTypeId?: number;
  @IsOptional() @IsBoolean() needsOccupationalTherapy?: boolean;
  @IsOptional() @IsBoolean() needsSpeechTherapy?: boolean;
  @IsOptional() @IsBoolean() needsPhysiotherapy?: boolean;
  @IsOptional() @IsInt() speechDisorderId?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) assistiveDeviceIds?: number[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AssignDisabilityDto)
  disabilities?: AssignDisabilityDto[];
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() @Length(1, 26) shabaNumber?: string;
  @IsOptional() @IsBoolean() isMartyrFamily?: boolean;
  @IsOptional() @IsBoolean() isOrphan?: boolean;
  @IsOptional() @IsBoolean() isUnderWelfare?: boolean;
  @IsOptional() @IsBoolean() isUnderRelief?: boolean;
  @IsOptional() @IsBoolean() hasNonParentGuardian?: boolean;
  @IsOptional() @IsBoolean() willingCultural?: boolean;
  @IsOptional() @IsBoolean() willingArt?: boolean;
  @IsOptional() @IsBoolean() willingSports?: boolean;
  @IsOptional() @IsBoolean() willingQuran?: boolean;
  @IsOptional() @IsString() achievementsText?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateStudentDto {
  // اجازه تغییر کد ملی — سرویس تکراری نبودن را بررسی می‌کند
  @IsOptional() @IsString() @Length(10, 10) nationalCode?: string;
  @IsOptional() @IsString() @Length(2, 80) firstName?: string;
  @IsOptional() @IsString() @Length(2, 80) lastName?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsInt() @Min(1) @Max(31) birthDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) birthMonth?: number;
  @IsOptional() @IsInt() birthYearShamsi?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() homePhone?: string;
  @IsOptional() @IsString() guardianName?: string;
  @IsOptional() @IsString() guardianNationalCode?: string;
  @IsOptional() @IsString() guardianPhone?: string;
  @IsOptional() @IsInt() guardianPhysicalStatusId?: number;
  @IsOptional() @IsString() secondGuardianName?: string;
  @IsOptional() @IsString() secondGuardianNationalCode?: string;
  @IsOptional() @IsString() secondGuardianPhone?: string;
  @IsOptional() @IsInt() secondGuardianPhysicalStatusId?: number;
  @IsOptional() @IsInt() educationLevelId?: number;
  @IsOptional() @IsInt() gradeId?: number;
  @IsOptional() @IsInt() fieldOfStudyId?: number;
  @IsOptional() @IsInt() centerId?: number;
  @IsOptional() @IsInt() districtId?: number;
  @IsOptional() @IsEnum(AttendanceType) attendanceType?: AttendanceType;
  @IsOptional() @IsInt() entryDay?: number;
  @IsOptional() @IsInt() entryMonth?: number;
  @IsOptional() @IsInt() entryYear?: number;
  @IsOptional() @IsInt() physicalStatusId?: number;
  @IsOptional() @IsInt() bookTypeId?: number;
  @IsOptional() @IsBoolean() needsOccupationalTherapy?: boolean;
  @IsOptional() @IsBoolean() needsSpeechTherapy?: boolean;
  @IsOptional() @IsBoolean() needsPhysiotherapy?: boolean;
  @IsOptional() @IsInt() speechDisorderId?: number;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() shabaNumber?: string;
  @IsOptional() @IsBoolean() isMartyrFamily?: boolean;
  @IsOptional() @IsBoolean() isOrphan?: boolean;
  @IsOptional() @IsBoolean() isUnderWelfare?: boolean;
  @IsOptional() @IsBoolean() isUnderRelief?: boolean;
  @IsOptional() @IsBoolean() hasNonParentGuardian?: boolean;
  @IsOptional() @IsBoolean() willingCultural?: boolean;
  @IsOptional() @IsBoolean() willingArt?: boolean;
  @IsOptional() @IsBoolean() willingSports?: boolean;
  @IsOptional() @IsBoolean() willingQuran?: boolean;
  @IsOptional() @IsString() achievementsText?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetAssistiveDevicesDto {
  @IsArray() @IsInt({ each: true }) ids: number[];
}

export class AssignToClassDto {
  @IsInt() classRoomId: number;
  @IsInt() gradeId: number;
  @IsInt() academicYearId: number;
}

export class PromotionDecisionDto {
  @IsInt() academicYearId: number;
  @IsEnum(PromotionDecision) decision: PromotionDecision;
  @IsOptional() @IsInt() nextGradeId?: number;
  @IsOptional() @IsString() note?: string;
}
