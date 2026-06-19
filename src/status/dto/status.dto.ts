import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum StatusTarget {
  PERSONNEL = 'PERSONNEL',
  STUDENT = 'STUDENT',
  CENTER = 'CENTER',
}

export class CreateStatusTypeDto {
  @IsEnum(StatusTarget) target: StatusTarget;
  @IsString() code: string;
  @IsString() label: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class RecordStatusDto {
  @IsNumber() entityId: number;
  @IsNumber() statusTypeId: number;
  @IsNumber() academicYearId: number;
  @IsDateString() effectiveDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() note?: string;
}
