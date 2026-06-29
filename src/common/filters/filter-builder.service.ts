// src/common/filters/filter-builder.service.ts
// ============================================================
// تبدیل FilterConditionDto به Prisma WHERE clause
// فیلترها به ترتیب order مرتب شده، سپس با AND ترکیب می‌شوند
// ============================================================

import { Injectable } from '@nestjs/common';
import {
  BooleanOperator,
  DateOperator,
  FilterConditionDto,
  NumberOperator,
  SmartFilterDto,
  StringOperator,
} from './smart-filter.dto';

@Injectable()
export class FilterBuilderService {
  /**
   * ورودی: SmartFilterDto
   * خروجی: { where, orderBy, skip, take } — آماده برای Prisma
   */
  build(dto: SmartFilterDto) {
    const sorted = [...(dto.filters ?? [])].sort((a, b) => a.order - b.order);
    const conditions = sorted
      .map((f) => this.buildCondition(f))
      .filter((c): c is Record<string, unknown> => c !== null);

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const orderBy = dto.sort
      ? { [dto.sort.field]: dto.sort.direction }
      : undefined;

    const page = Math.max(1, dto.page ?? 1);
    const take = Math.min(dto.pageSize ?? 20, 500);
    const skip = (page - 1) * take;

    return { where, orderBy, skip, take };
  }

  private buildCondition(f: FilterConditionDto): Record<string, any> | null {
    // پشتیبانی از فیلدهای تودرتو مثل 'grade.label' یا 'center.name'
    if (f.field.includes('.')) {
      const [relation, field] = f.field.split('.', 2);
      const innerFilter = this.buildCondition({ ...f, field });
      if (!innerFilter) return null;
      return { [relation]: innerFilter };
    }
    switch (f.fieldType) {
      case 'string':
        return this.buildString(f);
      case 'number':
        return this.buildNumber(f);
      case 'date':
        return this.buildDate(f);
      case 'boolean':
        return this.buildBoolean(f);
      case 'enum':
        return { [f.field]: { equals: f.value } };
      default:
        return null;
    }
  }

  // ─── String ───────────────────────────────────────────────

  private buildString(f: FilterConditionDto) {
    const mode = 'insensitive' as const;
    switch (f.operator as StringOperator) {
      case StringOperator.CONTAINS:
        return { [f.field]: { contains: String(f.value), mode } };
      case StringOperator.NOT_CONTAINS:
        return { NOT: { [f.field]: { contains: String(f.value), mode } } };
      case StringOperator.EQUALS:
        return { [f.field]: { equals: String(f.value), mode } };
      case StringOperator.NOT_EQUALS:
        return { NOT: { [f.field]: { equals: String(f.value), mode } } };
      case StringOperator.STARTS_WITH:
        return { [f.field]: { startsWith: String(f.value), mode } };
      case StringOperator.ENDS_WITH:
        return { [f.field]: { endsWith: String(f.value), mode } };
      case StringOperator.IS_EMPTY:
        return { OR: [{ [f.field]: null }, { [f.field]: '' }] };
      case StringOperator.IS_NOT_EMPTY:
        return {
          AND: [{ NOT: { [f.field]: null } }, { NOT: { [f.field]: '' } }],
        };
      default:
        return null;
    }
  }

  // ─── Number ───────────────────────────────────────────────

  private buildNumber(f: FilterConditionDto) {
    const v = Number(f.value);
    switch (f.operator as NumberOperator) {
      case NumberOperator.EQUALS:
        return { [f.field]: { equals: v } };
      case NumberOperator.NOT_EQUALS:
        return { NOT: { [f.field]: { equals: v } } };
      case NumberOperator.GREATER_THAN:
        return { [f.field]: { gt: v } };
      case NumberOperator.LESS_THAN:
        return { [f.field]: { lt: v } };
      case NumberOperator.GREATER_OR_EQUAL:
        return { [f.field]: { gte: v } };
      case NumberOperator.LESS_OR_EQUAL:
        return { [f.field]: { lte: v } };
      case NumberOperator.BETWEEN:
        return { [f.field]: { gte: v, lte: Number(f.valueTo) } };
      case NumberOperator.NOT_BETWEEN:
        return {
          OR: [
            { [f.field]: { lt: v } },
            { [f.field]: { gt: Number(f.valueTo) } },
          ],
        };
      case NumberOperator.IS_NULL:
        return { [f.field]: null };
      case NumberOperator.IS_NOT_NULL:
        return { NOT: { [f.field]: null } };
      default:
        return null;
    }
  }

  // ─── Date ─────────────────────────────────────────────────

  private buildDate(f: FilterConditionDto) {
    const v = f.value ? new Date(String(f.value)) : null;
    const now = new Date();

    switch (f.operator as DateOperator) {
      case DateOperator.EQUALS: {
        if (!v) return null;
        const dayStart = new Date(v);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(v);
        dayEnd.setHours(23, 59, 59, 999);
        return { [f.field]: { gte: dayStart, lte: dayEnd } };
      }
      case DateOperator.BEFORE:
        return { [f.field]: { lt: v } };
      case DateOperator.AFTER:
        return { [f.field]: { gt: v } };
      case DateOperator.BETWEEN:
        return { [f.field]: { gte: v, lte: new Date(String(f.valueTo)) } };
      case DateOperator.THIS_YEAR:
        return {
          [f.field]: {
            gte: new Date(now.getFullYear(), 0, 1),
            lte: new Date(now.getFullYear(), 11, 31),
          },
        };
      case DateOperator.THIS_MONTH:
        return {
          [f.field]: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          },
        };
      case DateOperator.IS_NULL:
        return { [f.field]: null };
      case DateOperator.IS_NOT_NULL:
        return { NOT: { [f.field]: null } };
      default:
        return null;
    }
  }

  // ─── Boolean ──────────────────────────────────────────────

  private buildBoolean(f: FilterConditionDto) {
    switch (f.operator as BooleanOperator) {
      case BooleanOperator.IS_TRUE:
        return { [f.field]: true };
      case BooleanOperator.IS_FALSE:
        return { [f.field]: false };
      default:
        return null;
    }
  }
}
