import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Length } from 'class-validator';

export class CreateClassRoomDto {
  @IsInt() centerId: number;
  @IsInt() academicYearId: number;
  @IsString() @Length(1, 100) name: string;
  // پایه(های) این کلاس — می‌تواند چندپایه باشد
  @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) gradeIds: number[];
}

export class UpdateClassRoomDto {
  @IsOptional() @IsString() @Length(1, 100) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetClassGradesDto {
  @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) gradeIds: number[];
}

export class AssignTeacherDto {
  @IsInt() userId: number;
  @IsInt() academicYearId: number;
  @IsOptional() @IsInt() subjectId?: number;
}
