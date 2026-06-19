import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { CenterType } from '@prisma/client';

export class CreateCenterDto {
  @IsString() @Length(2, 150) name: string;
  @IsString() @Length(2, 20) code: string;
  @IsEnum(CenterType) type: CenterType;
  @IsString() @Length(2, 50) province: string;
  @IsString() @Length(2, 50) city: string;
  @IsString() address: string;
  @IsString() @IsOptional() phone?: string;
}

export class UpdateCenterDto {
  @IsOptional() @IsString() @Length(2, 150) name?: string;
  @IsOptional() @IsEnum(CenterType) type?: CenterType;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
