import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { GradeTrack, GradeBranch } from '@prisma/client';

export class CreateGradeDto {
  @IsInt() educationLevelId: number;
  @IsString() @Length(1, 40) code: string;
  @IsString() @Length(1, 100) label: string;
  @IsOptional() @IsEnum(GradeTrack) track?: GradeTrack;
  @IsOptional() @IsEnum(GradeBranch) branch?: GradeBranch;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateGradeDto {
  @IsOptional() @IsString() @Length(1, 100) label?: string;
  @IsOptional() @IsEnum(GradeTrack) track?: GradeTrack;
  @IsOptional() @IsEnum(GradeBranch) branch?: GradeBranch;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
