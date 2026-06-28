// src/smart-class/smart-class.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── قوانین جدول شماره ۲ ──────────────────────────────────────────────────
// key: گروه استثنایی — value: { min, max } به تفکیک دوره تحصیلی
type EduLevel = 'PRE_SCHOOL' | 'PRIMARY' | 'FIRST_MIDDLE' | 'SECOND_MIDDLE';

interface CapacityRule { min: number; max: number; }

const CLASS_CAPACITY: Record<string, Record<EduLevel, CapacityRule>> = {
  // کم‌توان ذهنی
  INTELLECTUAL: {
    PRE_SCHOOL:    { min: 4, max: 7 },   // زیر ۶ سال
    PRIMARY:       { min: 6, max: 11 },
    FIRST_MIDDLE:  { min: 6, max: 11 },
    SECOND_MIDDLE: { min: 6, max: 11 },
  },
  // باآسیب شنوایی
  HEARING: {
    PRE_SCHOOL:    { min: 4, max: 7 },
    PRIMARY:       { min: 6, max: 11 },
    FIRST_MIDDLE:  { min: 6, max: 11 },
    SECOND_MIDDLE: { min: 6, max: 11 },
  },
  // باآسیب بینایی
  VISUAL: {
    PRE_SCHOOL:    { min: 4, max: 7 },
    PRIMARY:       { min: 6, max: 11 },
    FIRST_MIDDLE:  { min: 6, max: 11 },
    SECOND_MIDDLE: { min: 6, max: 11 },
  },
  // جسمی-حرکتی
  PHYSICAL_MOTOR: {
    PRE_SCHOOL:    { min: 3, max: 5 },
    PRIMARY:       { min: 3, max: 5 },
    FIRST_MIDDLE:  { min: 3, max: 5 },
    SECOND_MIDDLE: { min: 3, max: 5 },
  },
  // چند معلولیتی
  MULTI: {
    PRE_SCHOOL:    { min: 3, max: 5 },
    PRIMARY:       { min: 3, max: 5 },
    FIRST_MIDDLE:  { min: 3, max: 5 },
    SECOND_MIDDLE: { min: 3, max: 5 },
  },
  // اختلال طیف اتیسم
  AUTISM: {
    PRE_SCHOOL:    { min: 3, max: 5 },
    PRIMARY:       { min: 3, max: 5 },
    FIRST_MIDDLE:  { min: 3, max: 5 },
    SECOND_MIDDLE: { min: 3, max: 5 },
  },
  // اختلال هیجانی-رفتاری شدید
  EMOTIONAL_BEHAVIORAL: {
    PRE_SCHOOL:    { min: 3, max: 5 },
    PRIMARY:       { min: 3, max: 5 },
    FIRST_MIDDLE:  { min: 3, max: 5 },
    SECOND_MIDDLE: { min: 3, max: 5 },
  },
};

// disability code → گروه ظرفیت
const DISABILITY_TO_CAPACITY_GROUP: Record<string, string> = {
  INTELLECTUAL:          'INTELLECTUAL',
  HEARING:               'HEARING',
  VISUAL:                'VISUAL',
  PHYSICAL_MOTOR:        'PHYSICAL_MOTOR',
  AUTISM:                'AUTISM',
  EMOTIONAL_BEHAVIORAL:  'EMOTIONAL_BEHAVIORAL',
};

// disability code → GradeTrack
const DISABILITY_TO_TRACK: Record<string, string> = {
  INTELLECTUAL:         'INTELLECTUAL_AUTISM',
  AUTISM:               'INTELLECTUAL_AUTISM',
  HEARING:              'SENSORY_MOTOR',
  VISUAL:               'SENSORY_MOTOR',
  PHYSICAL_MOTOR:       'SENSORY_MOTOR',
  EMOTIONAL_BEHAVIORAL: 'INTELLECTUAL_AUTISM',
};

export interface StudentProfile {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  gradeId: number | null;
  gradeLabel: string;
  gradeTrack: string;
  educationLevelCode: string;
  disabilityCodes: string[];
  isMultiple: boolean;
  dominantDisability: string | null;
  dominantCapacityGroup: string;
}

export interface ProposedClass {
  suggestedName: string;
  gradeIds: number[];
  gradeLabels: string[];
  track: string;
  educationLevelCode: string;
  capacityRule: CapacityRule;
  students: StudentProfile[];
  studentCount: number;
  isValid: boolean;
  warnings: string[];
  // برای ویرایش توسط مدیر
  isMultiGrade: boolean;
  isMultiDisability: boolean;
}

export interface ClassProposal {
  centerId: number;
  academicYearId: number;
  totalUnassigned: number;
  proposedClasses: ProposedClass[];
  unplacedStudents: StudentProfile[];
  generatedAt: string;
  summary: {
    totalProposedClasses: number;
    validClasses: number;
    warningClasses: number;
    totalPlaced: number;
    totalUnplaced: number;
  };
}

@Injectable()
export class SmartClassService {
  constructor(private prisma: PrismaService) {}

  // ─── تولید پیشنهاد ────────────────────────────────────────────────────────
  async generateProposal(centerId: number, academicYearId: number): Promise<ClassProposal> {
    // دانش‌آموزان کلاسبندی‌نشده با همه اطلاعات لازم
    const students = await this.prisma.student.findMany({
      where: {
        centerId,
        isActive: true,
        classAssignments: { none: { academicYearId, revokedAt: null } },
      },
      include: {
        grade: { select: { id: true, label: true, track: true, educationLevelId: true } },
        educationLevel: { select: { id: true, code: true, label: true } },
        disabilities: {
          include: { disabilityType: { select: { id: true, code: true, label: true } } },
        },
      },
      orderBy: [{ gradeId: 'asc' }, { lastName: 'asc' }],
    });

    if (!students.length) {
      return {
        centerId, academicYearId,
        totalUnassigned: 0,
        proposedClasses: [],
        unplacedStudents: [],
        generatedAt: new Date().toISOString(),
        summary: { totalProposedClasses: 0, validClasses: 0, warningClasses: 0, totalPlaced: 0, totalUnplaced: 0 },
      };
    }

    // ساخت پروفایل هر دانش‌آموز
    const profiles: StudentProfile[] = students.map(s => {
      const codes = s.disabilities.map(d => d.disabilityType.code);
      const isMultiple = codes.length > 1;
      const dominant = this.getDominantDisability(codes, isMultiple);
      const capacityGroup = isMultiple
        ? 'MULTI'
        : (DISABILITY_TO_CAPACITY_GROUP[dominant ?? ''] ?? 'INTELLECTUAL');

      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        gradeId: s.gradeId,
        gradeLabel: s.grade?.label ?? 'نامشخص',
        gradeTrack: s.grade?.track ?? 'NORMAL',
        educationLevelCode: (s.educationLevel?.code ?? 'PRIMARY') as EduLevel,
        disabilityCodes: codes,
        isMultiple,
        dominantDisability: dominant,
        dominantCapacityGroup: capacityGroup,
      };
    });

    // گروه‌بندی اولیه: educationLevel + track + gradeId
    const groups = this.groupStudents(profiles);

    // تبدیل گروه‌ها به کلاس‌های پیشنهادی با در نظر گرفتن ظرفیت
    const proposed: ProposedClass[] = [];
    const unplaced: StudentProfile[] = [];

    let classIndex = 1;
    for (const [, groupStudents] of groups) {
      const subClasses = this.splitByCapacity(groupStudents, classIndex);
      for (const cls of subClasses) {
        proposed.push(cls);
        classIndex += subClasses.length;
      }
    }

    // دانش‌آموزانی که گروه کافی نساختند (کمتر از min ظرفیت)
    // اینا رو جمع می‌کنیم و به مدیر نشون می‌دیم که باید دستی جایگذاری کنه
    const placedIds = new Set(proposed.flatMap(c => c.students.map(s => s.id)));
    const unplacedStudents = profiles.filter(p => !placedIds.has(p.id));

    // دانش‌آموزان unplaced رو در کلاس‌های موجود با warning جا می‌کنیم
    if (unplacedStudents.length > 0) {
      this.mergeUnplacedStudents(unplacedStudents, proposed, unplaced);
    }

    // نام‌گذاری نهایی
    this.nameClasses(proposed);

    const summary = {
      totalProposedClasses: proposed.length,
      validClasses: proposed.filter(c => c.isValid).length,
      warningClasses: proposed.filter(c => c.warnings.length > 0).length,
      totalPlaced: proposed.reduce((s, c) => s + c.studentCount, 0),
      totalUnplaced: unplaced.length,
    };

    return {
      centerId, academicYearId,
      totalUnassigned: students.length,
      proposedClasses: proposed,
      unplacedStudents: unplaced,
      generatedAt: new Date().toISOString(),
      summary,
    };
  }

  // ─── تأیید و ایجاد کلاس‌ها ───────────────────────────────────────────────
  async confirmProposal(centerId: number, academicYearId: number, classes: {
    name: string;
    gradeIds: number[];
    studentIds: number[];
  }[]) {
    return this.prisma.$transaction(async tx => {
      const results: { classRoom: any; assignments: number }[] = [];

      for (const cls of classes) {
        // ساخت classRoom
        const classRoom = await tx.classRoom.create({
          data: { centerId, academicYearId, name: cls.name },
        });

        // اضافه کردن پایه‌ها
        if (cls.gradeIds.length) {
          await tx.classGrade.createMany({
            data: cls.gradeIds.map(gId => ({ classRoomId: classRoom.id, gradeId: gId })),
            skipDuplicates: true,
          });
        }

        // تخصیص دانش‌آموزان
        let assigned = 0;
        for (const studentId of cls.studentIds) {
          const student = await tx.student.findUnique({
            where: { id: studentId },
            select: { gradeId: true },
          });
          if (!student?.gradeId) continue;

          // بررسی تکراری نبودن
          const exists = await tx.studentClassAssignment.findFirst({
            where: { studentId, academicYearId, revokedAt: null },
          });
          if (exists) continue;

          await tx.studentClassAssignment.create({
            data: {
              studentId,
              classRoomId: classRoom.id,
              gradeId: student.gradeId,
              academicYearId,
            },
          });
          assigned++;
        }

        results.push({ classRoom, assignments: assigned });
      }

      return { created: results.length, totalAssigned: results.reduce((s, r) => s + r.assignments, 0), results };
    });
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  private getDominantDisability(codes: string[], isMultiple: boolean): string | null {
    if (!codes.length) return null;
    if (!isMultiple) return codes[0];
    // اولویت: AUTISM > INTELLECTUAL > PHYSICAL_MOTOR > HEARING > VISUAL
    const priority = ['AUTISM', 'INTELLECTUAL', 'PHYSICAL_MOTOR', 'HEARING', 'VISUAL', 'EMOTIONAL_BEHAVIORAL'];
    for (const p of priority) {
      if (codes.includes(p)) return p;
    }
    return codes[0];
  }

  private groupStudents(profiles: StudentProfile[]): Map<string, StudentProfile[]> {
    const groups = new Map<string, StudentProfile[]>();

    for (const p of profiles) {
      // کلید گروه‌بندی: مقطع + track + پایه
      // دانش‌آموزان چندمعلولیتی: track بر اساس معلولیت غالب
      const track = p.isMultiple
        ? (DISABILITY_TO_TRACK[p.dominantDisability ?? ''] ?? p.gradeTrack)
        : p.gradeTrack;
      const key = `${p.educationLevelCode}__${track}__${p.gradeId ?? 'none'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }

    return groups;
  }

  private splitByCapacity(students: StudentProfile[], startIdx: number): ProposedClass[] {
    if (!students.length) return [];

    const sample = students[0];
    const eduLevel = sample.educationLevelCode as EduLevel;
    const track    = sample.gradeTrack;
    const gradeId  = sample.gradeId;

    // تعیین قانون ظرفیت
    const capGroup = sample.isMultiple ? 'MULTI'
      : (DISABILITY_TO_CAPACITY_GROUP[sample.dominantDisability ?? ''] ?? 'INTELLECTUAL');
    const rule = CLASS_CAPACITY[capGroup]?.[eduLevel] ?? { min: 3, max: 11 };

    const classes: ProposedClass[] = [];
    let remaining = [...students];

    while (remaining.length > 0) {
      const batch = remaining.splice(0, rule.max);
      const warnings: string[] = [];
      let isValid = true;

      if (batch.length < rule.min) {
        warnings.push(`تعداد دانش‌آموزان (${batch.length}) کمتر از حداقل مجاز (${rule.min}) است`);
        isValid = false;
      }

      // بررسی ترکیب معلولیت در کلاس
      const uniqueDisabilities = new Set(batch.flatMap(s => s.disabilityCodes));
      const isMultiDisability = batch.some(s => s.isMultiple) ||
        new Set(batch.map(s => s.dominantDisability)).size > 1;

      if (isMultiDisability && capGroup !== 'MULTI') {
        warnings.push('این کلاس ترکیب چند نوع معلولیت دارد — بررسی کنید');
      }

      classes.push({
        suggestedName: '',
        gradeIds: gradeId ? [gradeId] : [],
        gradeLabels: batch[0]?.gradeLabel ? [batch[0].gradeLabel] : [],
        track,
        educationLevelCode: eduLevel,
        capacityRule: rule,
        students: batch,
        studentCount: batch.length,
        isValid,
        warnings,
        isMultiGrade: false,
        isMultiDisability,
      });
    }

    return classes;
  }

  private mergeUnplacedStudents(
    unplaced: StudentProfile[],
    proposed: ProposedClass[],
    stillUnplaced: StudentProfile[],
  ) {
    for (const student of unplaced) {
      // پیدا کردن بهترین کلاس موجود برای merge
      const compatible = proposed.find(cls => {
        const sameLevel = cls.educationLevelCode === student.educationLevelCode;
        const sameTrack = cls.track === student.gradeTrack ||
          cls.track === (DISABILITY_TO_TRACK[student.dominantDisability ?? ''] ?? student.gradeTrack);
        const hasRoom   = cls.studentCount < cls.capacityRule.max;
        return sameLevel && sameTrack && hasRoom;
      });

      if (compatible) {
        compatible.students.push(student);
        compatible.studentCount++;
        compatible.warnings.push(`دانش‌آموز ${student.firstName} ${student.lastName} از گروه کم‌جمعیت ادغام شد`);
        if (!compatible.gradeIds.includes(student.gradeId ?? 0) && student.gradeId) {
          compatible.gradeIds.push(student.gradeId);
          compatible.gradeLabels.push(student.gradeLabel);
          compatible.isMultiGrade = compatible.gradeIds.length > 1;
        }
      } else {
        stillUnplaced.push(student);
      }
    }
  }

  private nameClasses(classes: ProposedClass[]) {
    const trackLabel: Record<string, string> = {
      INTELLECTUAL_AUTISM: 'ذهنی-اتیسم',
      SENSORY_MOTOR:        'حسی-حرکتی',
      NORMAL:               'عادی',
    };
    const eduLabel: Record<string, string> = {
      PRE_SCHOOL:    'پیش‌دبستانی',
      PRIMARY:       'ابتدایی',
      FIRST_MIDDLE:  'متوسطه اول',
      SECOND_MIDDLE: 'متوسطه دوم',
    };
    const persianAlpha = ['الف', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ی'];

    // گروه‌بندی بر اساس مقطع+track برای حروف الفبا
    const counter = new Map<string, number>();

    for (const cls of classes) {
      const baseKey = `${cls.educationLevelCode}_${cls.track}`;
      const idx = counter.get(baseKey) ?? 0;
      counter.set(baseKey, idx + 1);

      const gradeStr = cls.gradeLabels.join('/');
      const letter   = persianAlpha[idx] ?? String(idx + 1);
      cls.suggestedName = `کلاس ${gradeStr} ${letter}`;
    }
  }
}
