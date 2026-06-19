// src/common/filters/smart-filter.dto.ts
// ============================================================
// سیستم فیلتر هوشمند — پشتیبانی از انواع داده عددی، رشته‌ای،
// تاریخ، boolean. فیلترها به ترتیب اعمال می‌شوند.
// ============================================================

import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// ─── Operator enums ─────────────────────────────────────────

export enum StringOperator {
  CONTAINS     = 'contains',      // شامل
  NOT_CONTAINS = 'not_contains',  // شامل نمی‌شود
  EQUALS       = 'equals',        // برابر
  NOT_EQUALS   = 'not_equals',    // نابرابر
  STARTS_WITH  = 'starts_with',   // شروع با
  ENDS_WITH    = 'ends_with',     // پایان با
  IS_EMPTY     = 'is_empty',      // خالی
  IS_NOT_EMPTY = 'is_not_empty',  // خالی نیست
}

export enum NumberOperator {
  EQUALS          = 'equals',           // =
  NOT_EQUALS      = 'not_equals',       // ≠
  GREATER_THAN    = 'greater_than',     // >
  LESS_THAN       = 'less_than',        // <
  GREATER_OR_EQUAL = 'greater_or_equal', // ≥
  LESS_OR_EQUAL   = 'less_or_equal',    // ≤
  BETWEEN         = 'between',          // بین دو عدد
  NOT_BETWEEN     = 'not_between',      // خارج از بازه
  IS_NULL         = 'is_null',
  IS_NOT_NULL     = 'is_not_null',
}

export enum DateOperator {
  EQUALS          = 'equals',
  BEFORE          = 'before',
  AFTER           = 'after',
  BETWEEN         = 'between',
  THIS_YEAR       = 'this_year',
  THIS_MONTH      = 'this_month',
  IS_NULL         = 'is_null',
  IS_NOT_NULL     = 'is_not_null',
}

export enum BooleanOperator {
  IS_TRUE  = 'is_true',
  IS_FALSE = 'is_false',
}

export type FilterOperator =
  | StringOperator
  | NumberOperator
  | DateOperator
  | BooleanOperator;

export type FilterFieldType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

// ─── Single filter condition ─────────────────────────────────

export class FilterConditionDto {
  @IsString()
  field: string;           // نام فیلد (e.g. "lastName", "studentCount")

  @IsString()
  fieldType: FilterFieldType;

  @IsString()
  operator: FilterOperator;

  @IsOptional()
  value?: string | number | boolean | null;

  @IsOptional()
  valueTo?: number | string | null;  // برای BETWEEN

  // ترتیب اعمال — فیلترها به صورت ascending اجرا می‌شوند
  @IsNumber()
  order: number;
}

// ─── Sort config ─────────────────────────────────────────────

export class SortConfigDto {
  @IsString()
  field: string;

  @IsIn(['asc', 'desc'])
  direction: 'asc' | 'desc';
}

// ─── Main filter request ─────────────────────────────────────

export class SmartFilterDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  filters?: FilterConditionDto[];  // [] = بدون فیلتر

  @IsOptional()
  @ValidateNested()
  @Type(() => SortConfigDto)
  sort?: SortConfigDto;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number = 20;
}

// ─── Excel export request ────────────────────────────────────

export class ExcelColumnDto {
  @IsString()
  field: string;         // نام فیلد در داده

  @IsString()
  header: string;        // عنوان ستون در Excel (فارسی)

  @IsNumber()
  order: number;         // ترتیب ستون در فایل Excel

  @IsOptional()
  @IsNumber()
  width?: number;        // عرض ستون (character units)

  @IsOptional()
  @IsString()
  format?: string;       // فرمت اختیاری (e.g. 'date', 'number')
}

export class ExcelExportDto extends SmartFilterDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExcelColumnDto)
  columns: ExcelColumnDto[];   // ستون‌ها به ترتیب order مرتب می‌شوند

  @IsOptional()
  @IsString()
  sheetName?: string = 'داده‌ها';

  @IsOptional()
  @IsString()
  filename?: string;
}