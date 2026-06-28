// src/smart-class/smart-class.dto.ts
import { IsInt, IsOptional } from 'class-validator';

export class GenerateProposalDto {
  @IsInt() centerId: number;
  @IsInt() academicYearId: number;
}

export class ConfirmProposalDto {
  @IsInt() centerId: number;
  @IsInt() academicYearId: number;
  @IsOptional() classes?: ConfirmClassDto[];
}

export class ConfirmClassDto {
  name: string;
  gradeIds: number[];
  studentIds: number[];
}
