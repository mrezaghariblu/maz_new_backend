// src/lookups/dto/lookup.dto.ts
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateLookupValueDto {
  @IsString() @Length(2, 40) groupKey: string;
  @IsString() @Length(1, 40) code: string;
  @IsString() @Length(1, 150) label: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateLookupValueDto {
  @IsOptional() @IsString() @Length(1, 150) label?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
