import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @Length(7, 9)
  label: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class UpdateAcademicYearDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}
