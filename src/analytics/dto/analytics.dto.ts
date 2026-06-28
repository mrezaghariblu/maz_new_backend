import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum AnalyticsDimension {
  DISTRICT       = 'DISTRICT',
  CENTER         = 'CENTER',
  CENTER_TYPE    = 'CENTER_TYPE',
  EDUCATION_LEVEL= 'EDUCATION_LEVEL',
  GRADE          = 'GRADE',
  DISABILITY_TYPE= 'DISABILITY_TYPE',
  GENDER         = 'GENDER',
  ATTENDANCE_TYPE= 'ATTENDANCE_TYPE',
  ACADEMIC_YEAR  = 'ACADEMIC_YEAR',
  USER_TYPE      = 'USER_TYPE',
  JOB_POSITION   = 'JOB_POSITION',
  EMPLOYMENT_TYPE= 'EMPLOYMENT_TYPE',
  MARITAL_STATUS = 'MARITAL_STATUS',
  IS_MULTIPLE_DISABILITY = 'IS_MULTIPLE_DISABILITY',
}

export enum AnalyticsEntity {
  STUDENT = 'STUDENT',
  USER    = 'USER',
  CENTER  = 'CENTER',
}

export class AnalyticsFilterDto {
  @IsString() field: string;
  @IsString() operator: string;
  @IsOptional() value?: any;
}

export class AnalyticsQueryDto {
  @IsEnum(AnalyticsEntity) entity: AnalyticsEntity;

  @IsArray()
  @IsEnum(AnalyticsDimension, { each: true })
  dimensions: AnalyticsDimension[];

  @IsOptional() @IsInt() academicYearId?: number;
  @IsOptional() @IsInt() centerId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyticsFilterDto)
  filters?: AnalyticsFilterDto[];
}
