import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateCenterDto {
  @IsString() @Length(2, 150) name: string;
  @IsString() @Length(2, 20) code: string;
  @IsString() @Length(2, 50) organizationCode: string;
  @IsInt() centerTypeId: number;
  @IsString() @Length(2, 50) province: string;
  @IsString() @Length(2, 50) city: string;
  @IsOptional() @IsInt() districtId?: number;
  @IsString() address: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() @Length(1, 26) shabaNumber?: string;
  @IsOptional() @IsInt() establishedYear?: number;

  // کدهای واحد سازمانی
  @IsOptional() @IsString() preSchoolCode?: string;
  @IsOptional() @IsString() primaryCode?: string;
  @IsOptional() @IsString() firstMiddleCode?: string;
  @IsOptional() @IsString() firstMiddleVocationalCode?: string;
  @IsOptional() @IsString() secondMiddleSpecialVocationalCode?: string;
  @IsOptional() @IsString() secondMiddleCode?: string;
}

export class UpdateCenterDto {
  @IsOptional() @IsString() @Length(2, 150) name?: string;
  @IsOptional() @IsInt() centerTypeId?: number;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() @Length(2, 50) organizationCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsInt() districtId?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() @Length(1, 26) shabaNumber?: string;
  @IsOptional() @IsInt() establishedYear?: number;

  @IsOptional() @IsString() preSchoolCode?: string;
  @IsOptional() @IsString() primaryCode?: string;
  @IsOptional() @IsString() firstMiddleCode?: string;
  @IsOptional() @IsString() firstMiddleVocationalCode?: string;
  @IsOptional() @IsString() secondMiddleSpecialVocationalCode?: string;
  @IsOptional() @IsString() secondMiddleCode?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;
}
