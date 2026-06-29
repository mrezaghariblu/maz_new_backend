/* eslint-disable prettier/prettier */
// prisma/seed.ts
// ============================================================
//  Seed جامع پروژه MAZ — مدیریت استثنایی استان زنجان
//  ترکیب و بهینه‌سازی تمام نسخه‌های قبلی seed
//  اجرا: npm run db:seed
// ============================================================

import {
  PrismaClient,
  UserType,
  Gender,
  DisabilitySeverity,
  AttendanceType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// تایپ‌های کمکی
// ─────────────────────────────────────────────────────────────
type LookupSeed = { code: string; label: string; sortOrder: number };
type GradeSeed = {
  code: string;
  label: string;
  sortOrder: number;
  track?: 'NORMAL' | 'INTELLECTUAL_AUTISM' | 'SENSORY_MOTOR';
  branch?: 'NORMAL' | 'VOCATIONAL';
};
type DisEntry = { id: number; sev?: DisabilitySeverity };
type StudentDef = {
  nc: string;
  fn: string;
  ln: string;
  g: Gender;
  grade: { id: number; code?: string };
  level: { id: number };
  center: { id: number };
  dist: { id: number };
  birth: [number, number, number]; // [year_shamsi, month, day]
  dis: DisEntry[];
  att?: AttendanceType;
  guardian?: string;
  guardianPhone?: string;
  needsSpeech?: boolean;
  needsOcc?: boolean;
  needsPhysio?: boolean;
  isMartyr?: boolean;
  isOrphan?: boolean;
  isUnderWelfare?: boolean;
};

// ─────────────────────────────────────────────────────────────
// توابع کمکی
// ─────────────────────────────────────────────────────────────
async function upsertLookup(groupKey: string, items: LookupSeed[]) {
  for (const item of items) {
    await prisma.lookupValue.upsert({
      where:  { groupKey_code: { groupKey, code: item.code } },
      update: { label: item.label, sortOrder: item.sortOrder },
      create: { groupKey, ...item },
    });
  }
}

async function getLookup(groupKey: string, code: string) {
  return prisma.lookupValue.findUniqueOrThrow({
    where: { groupKey_code: { groupKey, code } },
  });
}

async function getGrade(code: string) {
  return prisma.grade.findFirstOrThrow({ where: { code } });
}

// ─────────────────────────────────────────────────────────────
// ── ۱. مقادیر مرجع (LookupValue)
// ─────────────────────────────────────────────────────────────
async function seedLookups() {
  // ── نواحی آموزشی استان زنجان ─────────────────────────────
  await upsertLookup('DISTRICT', [
    { code: 'ZNJ0',          label: 'اداره کل آموزش و پرورش استان زنجان', sortOrder: 0   },
    { code: 'ZNJ1',          label: 'ناحیه یک زنجان',                      sortOrder: 10  },
    { code: 'ZNJ2',          label: 'ناحیه دو زنجان',                      sortOrder: 20  },
    { code: 'ABHAR',         label: 'ابهر',                                sortOrder: 30  },
    { code: 'KHORRAMDAREH',  label: 'خرمدره',                              sortOrder: 40  },
    { code: 'TAROM',         label: 'طارم',                                sortOrder: 50  },
    { code: 'KHODABANDEH',   label: 'خدابنده',                             sortOrder: 60  },
    { code: 'SOLTANIEH',     label: 'سلطانیه',                             sortOrder: 70  },
    { code: 'BAZINEH_ROOD',  label: 'بزینه رود',                           sortOrder: 80  },
    { code: 'ZANJAN_ROOD',   label: 'زنجانرود',                            sortOrder: 90  },
    { code: 'AFSHAR',        label: 'افشار',                               sortOrder: 100 },
    { code: 'SOJAS_ROOD',    label: 'سجاسرود',                             sortOrder: 110 },
    { code: 'IJROOD',        label: 'ایجرود',                              sortOrder: 120 },
    { code: 'MAHNESHAN',     label: 'ماهنشان',                             sortOrder: 130 },
    { code: 'ANGOORAN',      label: 'انگوران',                             sortOrder: 140 },
  ]);

  // ── نوع مرکز ─────────────────────────────────────────────
  await upsertLookup('CENTER_TYPE', [
    { code: 'OFFICE',               label: 'اداره',            sortOrder: 10 },
    { code: 'EXCEPTIONAL_SCHOOL',   label: 'مدرسه استثنایی',  sortOrder: 20 },
    { code: 'COMPREHENSIVE_CENTER', label: 'مرکز جامع سنجش، آموزش، توانبخشی و مداخله بهنگام رشدی', sortOrder: 30 },
    { code: 'REGULAR_SCHOOL',       label: 'مدرسه عادی',      sortOrder: 40 },
  ]);

  // ── مقطع تحصیلی ──────────────────────────────────────────
  await upsertLookup('EDUCATION_LEVEL', [
    { code: 'PRE_SCHOOL',    label: 'پیش دبستانی', sortOrder: 10 },
    { code: 'PRIMARY',       label: 'ابتدایی',     sortOrder: 20 },
    { code: 'FIRST_MIDDLE',  label: 'متوسطه اول',  sortOrder: 30 },
    { code: 'SECOND_MIDDLE', label: 'متوسطه دوم',  sortOrder: 40 },
  ]);

  // ── نوع استخدام ──────────────────────────────────────────
  await upsertLookup('EMPLOYMENT_TYPE', [
    { code: 'OFFICIAL',         label: 'رسمی',        sortOrder: 10 },
    { code: 'CONTRACTUAL',      label: 'پیمانی',      sortOrder: 20 },
    { code: 'SERVICE_PURCHASE', label: 'خرید خدمات',  sortOrder: 30 },
  ]);

  // ── پست سازمانی ──────────────────────────────────────────
  // ⚠️ هر پست code یکتا دارد (unique constraint: groupKey+code)
  await upsertLookup('JOB_POSITION', [
    // اداره
    { code: 'HEAD_OF_OFFICE',            label: 'رئیس اداره استثنایی',                          sortOrder: 10  },
    { code: 'OFFICE_DEPUTY',             label: 'معاون رئیس اداره استثنایی',                    sortOrder: 20  },
    { code: 'SENIOR_EXPERT_EDUCATIONAL', label: 'کارشناس مسئول آموزشی',                         sortOrder: 30  },
    { code: 'SENIOR_EXPERT_REHAB',       label: 'کارشناس مسئول توانبخشی',                       sortOrder: 30  },
    { code: 'EXPERT_FINANCIAL',          label: 'کارشناس امور مالی',                            sortOrder: 40  },
    { code: 'EXPERT_ASSESSMENT',         label: 'کارشناس سنجش و ارزشیابی',                      sortOrder: 40  },
    { code: 'EXPERT_VISUAL',             label: 'کارشناس دانش‌آموزان آسیب‌دیده بینایی',         sortOrder: 40  },
    { code: 'EXPERT_PHYSICAL',           label: 'کارشناس دانش‌آموزان آسیب‌دیده جسمی و حرکتی',  sortOrder: 40  },
    { code: 'EXPERT_HEARING',            label: 'کارشناس دانش‌آموزان آسیب‌دیده شنوایی',        sortOrder: 40  },
    { code: 'EXPERT_INTELLECTUAL',       label: 'کارشناس دانش‌آموزان کم‌توان ذهنی',             sortOrder: 40  },
    { code: 'EXPERT_NURTURING',          label: 'کارشناس امور پرورشی و تربیت بدنی',              sortOrder: 40  },
    { code: 'EXPERT_HEALTH',             label: 'کارشناس امور بهداشت',                           sortOrder: 40  },
    { code: 'EXPERT_COUNSELING',         label: 'کارشناس مشاوره',                                sortOrder: 40  },
    { code: 'EXPERT_LEARNING_DISORDERS', label: 'کارشناس اختلالات یادگیری',                     sortOrder: 40  },
    // مدرسه
    { code: 'MANAGER',                   label: 'مدیر مدرسه',          sortOrder: 50  },
    { code: 'TEACHING_MANAGER',          label: 'مدیر آموزگار',        sortOrder: 50  },
    { code: 'EDUCATIONAL_DEPUTY',        label: 'معاون آموزشی',        sortOrder: 60  },
    { code: 'EXECUTIVE_DEPUTY',          label: 'معاون اجرایی',        sortOrder: 60  },
    { code: 'EDUCATIONAL_SUPERVISOR',    label: 'سرپرست آموزشی',       sortOrder: 70  },
    { code: 'COUNSELOR',                 label: 'مشاور',               sortOrder: 80  },
    { code: 'HEALTH_CARETAKER',          label: 'مراقب سلامت',         sortOrder: 90  },
    { code: 'SPEECH_THERAPIST',          label: 'گفتاردرمانگر',        sortOrder: 90  },
    { code: 'OCCUPATIONAL_THERAPIST',    label: 'کاردرمانگر',          sortOrder: 90  },
    { code: 'PHYSIOTHERAPIST',           label: 'فیزیوتراپیست',        sortOrder: 90  },
    { code: 'EDUCATIONAL_INSTRUCTOR',    label: 'مربی پرورشی',         sortOrder: 100 },
    { code: 'PRIMARY_TEACHER',           label: 'آموزگار',             sortOrder: 110 },
    { code: 'SUBJECT_TEACHER',           label: 'دبیر',                sortOrder: 110 },
    { code: 'VOCATIONAL_INSTRUCTOR',     label: 'هنرآموز',             sortOrder: 110 },
    { code: 'INCLUSION_LIAISON',         label: 'رابط تلفیقی-فراگیر',  sortOrder: 110 },
    { code: 'CARETAKER',                 label: 'سرایدار',             sortOrder: 130 },
    { code: 'SERVICE_STAFF',             label: 'نیروی خدماتی',        sortOrder: 140 },
  ]);

  // ── مدرک تحصیلی ──────────────────────────────────────────
  await upsertLookup('EDUCATION_DEGREE', [
    { code: 'ILLITERATE',     label: 'بی‌سواد',         sortOrder: 10 },
    { code: 'PRIMARY',        label: 'ابتدایی',         sortOrder: 20 },
    { code: 'GUIDANCE',       label: 'راهنمایی',        sortOrder: 30 },
    { code: 'DIPLOMA_CYCLE',  label: 'سیکل/دیپلم',      sortOrder: 40 },
    { code: 'PRE_UNIVERSITY', label: 'پیش دانشگاهی',    sortOrder: 50 },
    { code: 'ASSOCIATE',      label: 'کاردانی',         sortOrder: 60 },
    { code: 'BACHELOR',       label: 'کارشناسی',        sortOrder: 70 },
    { code: 'MASTER',         label: 'کارشناسی ارشد',   sortOrder: 80 },
    { code: 'DOCTORATE',      label: 'دکترا',           sortOrder: 90 },
  ]);

  // ── وضعیت تأهل ───────────────────────────────────────────
  await upsertLookup('MARITAL_STATUS', [
    { code: 'SINGLE',  label: 'مجرد',        sortOrder: 10 },
    { code: 'MARRIED', label: 'متأهل',       sortOrder: 20 },
    { code: 'OTHER',   label: 'سایر موارد',  sortOrder: 30 },
  ]);

  // ── رسته استخدامی ─────────────────────────────────────────
  await upsertLookup('EMPLOYMENT_CATEGORY', [
    { code: 'REGULAR',     label: 'عادی',     sortOrder: 10 },
    { code: 'EXCEPTIONAL', label: 'استثنایی', sortOrder: 20 },
  ]);

  // ── وضعیت جسمانی ─────────────────────────────────────────
  await upsertLookup('PHYSICAL_STATUS', [
    { code: 'HEALTHY',        label: 'سالم',          sortOrder: 10 },
    { code: 'HAS_DISABILITY', label: 'دارای معلولیت', sortOrder: 20 },
  ]);

  // ── نوع معلولیت ──────────────────────────────────────────
  // «چندمعلولیتی» ذخیره نمی‌شود — از COUNT > 1 محاسبه می‌شود
  await upsertLookup('DISABILITY_TYPE', [
    { code: 'PHYSICAL_MOTOR',        label: 'جسمی-حرکتی',       sortOrder: 10 },
    { code: 'VISUAL',                label: 'بینایی',            sortOrder: 20 },
    { code: 'HEARING',               label: 'شنوایی',            sortOrder: 30 },
    { code: 'INTELLECTUAL',          label: 'کم توان ذهنی',      sortOrder: 40 },
    { code: 'AUTISM',                label: 'اوتیسم',            sortOrder: 50 },
    { code: 'LEARNING_DISABILITY',   label: 'ناتوانی یادگیری',   sortOrder: 60 },
    { code: 'BEHAVIORAL_DISABILITY', label: 'اختلالات رفتاری',   sortOrder: 70 },
    { code: 'OTHER',                 label: 'سایر',              sortOrder: 80 },
  ]);

  // ── رشته تحصیلی (متوسطه دوم) ─────────────────────────────
  await upsertLookup('FIELD_OF_STUDY', [
    { code: 'HUMANITIES',            label: 'علوم انسانی', sortOrder: 10 },
    { code: 'EXPERIMENTAL_SCIENCES', label: 'علوم تجربی',  sortOrder: 20 },
    { code: 'MATH_PHYSICS',          label: 'ریاضی فیزیک', sortOrder: 30 },
    { code: 'MATH_PHYSICS',          label: 'کمک باغبانی', sortOrder: 40 },
    { code: 'MATH_PHYSICS',          label: 'کمک کار خیاط', sortOrder: 50 },
    { code: 'MATH_PHYSICS',          label: 'کمک مشبک بر', sortOrder: 60 },
  ]);

  // ── درس (تخصیص دبیر به کلاس) ────────────────────────────
  await upsertLookup('SUBJECT', [
    { code: 'PERSIAN_LITERATURE',  label: 'ادبیات فارسی',                sortOrder: 10  },
    { code: 'ARABIC',              label: 'عربی',                        sortOrder: 20  },
    { code: 'RELIGIOUS_EDUCATION', label: 'دینی',                        sortOrder: 30  },
    { code: 'MATH',                label: 'ریاضی',                       sortOrder: 40  },
    { code: 'SCIENCE',             label: 'علوم تجربی',                  sortOrder: 50  },
    { code: 'SOCIAL_STUDIES',      label: 'مطالعات اجتماعی',             sortOrder: 60  },
    { code: 'ENGLISH',             label: 'زبان انگلیسی',                sortOrder: 70  },
    { code: 'PHYSICAL_EDUCATION',  label: 'تربیت بدنی',                  sortOrder: 80  },
    { code: 'ART',                 label: 'هنر',                         sortOrder: 90  },
    { code: 'VOCATIONAL_SKILLS',   label: 'مهارت‌های حرفه‌ای / کاردانش', sortOrder: 100 },
    { code: 'LIFE_SKILLS',         label: 'مهارت‌های زندگی',              sortOrder: 110 },
  ]);

  // ── نوع کتاب ─────────────────────────────────────────────
  await upsertLookup('BOOK_TYPE', [
    { code: 'INTELLECTUALLY_DISABLED',             label: 'کم‌توان',           sortOrder: 10 },
    { code: 'NORMAL',                              label: 'عادی',             sortOrder: 20 },
    { code: 'INTELLECTUALLY_DISABLED_LARGE_PRINT', label: 'کم‌توان درشت‌خط',  sortOrder: 30 },
    { code: 'NORMAL_LARGE_PRINT',                  label: 'عادی درشت‌خط',     sortOrder: 40 },
    { code: 'BRAILLE_NORMAL',                      label: 'بریل عادی',        sortOrder: 50 },
    { code: 'BRAILLE_INTELLECTUALLY_DISABLED',     label: 'بریل کم‌توان',     sortOrder: 60 },
  ]);

  // ── وسایل کمکی ───────────────────────────────────────────
  await upsertLookup('ASSISTIVE_DEVICE', [
    { code: 'GLASSES',              label: 'عینک',                  sortOrder: 10  },
    { code: 'WALKER',               label: 'واکر',                  sortOrder: 20  },
    { code: 'WHEELCHAIR',           label: 'ویلچر',                 sortOrder: 30  },
    { code: 'ELECTRONIC_MAGNIFIER', label: 'درشت‌نمای الکترونیکی', sortOrder: 40  },
    { code: 'TABLET',               label: 'تبلت',                  sortOrder: 50  },
    { code: 'HEARING_AID',          label: 'سمعک',                  sortOrder: 60  },
    { code: 'WHITE_CANE',           label: 'عصای سفید',             sortOrder: 70  },
    { code: 'COCHLEAR',             label: 'کاشت حلزون',            sortOrder: 80  },
    { code: 'CRUTCH',               label: 'عصا',                   sortOrder: 90  },
    { code: 'PROSTHESIS',           label: 'پروتز',                 sortOrder: 100 },
    { code: 'ORTHOSIS',             label: 'اورتوز',                sortOrder: 110 },
    { code: 'OTHER',                label: 'سایر',                  sortOrder: 120 },
  ]);

  // ── مشکلات گفتاری ─────────────────────────────────────────
  await upsertLookup('SPEECH_DISORDER', [
    { code: 'STUTTERING',           label: 'لکنت زبان',        sortOrder: 10 },
    { code: 'APHASIA',              label: 'آفازی',             sortOrder: 20 },
    { code: 'DYSARTHRIA',           label: 'دیزارتری',          sortOrder: 30 },
    { code: 'ARTICULATION_DISORDER',label: 'اختلال تولید صدا',  sortOrder: 40 },
    { code: 'VOICE_DISORDER',       label: 'اختلال صدا',        sortOrder: 50 },
    { code: 'LANGUAGE_DELAY',       label: 'تأخیر زبانی',       sortOrder: 60 },
    { code: 'SELECTIVE_MUTISM',     label: 'لالی انتخابی',      sortOrder: 70 },
    { code: 'OTHER',                label: 'سایر',              sortOrder: 80 },
  ]);

  console.log('✅ مقادیر مرجع (LookupValue) — همه گروه‌ها');
}

// ─────────────────────────────────────────────────────────────
// ── ۲. پایه‌های تحصیلی (Grade)
// ─────────────────────────────────────────────────────────────
async function seedGradesForLevel(educationLevelCode: string, items: GradeSeed[]) {
  const level = await prisma.lookupValue.findUniqueOrThrow({
    where: { groupKey_code: { groupKey: 'EDUCATION_LEVEL', code: educationLevelCode } },
  });
  for (const g of items) {
    await prisma.grade.upsert({
      where:  { educationLevelId_code: { educationLevelId: level.id, code: g.code } },
      update: { label: g.label, sortOrder: g.sortOrder, track: g.track ?? 'NORMAL', branch: g.branch ?? 'NORMAL' },
      create: {
        educationLevelId: level.id,
        code: g.code,
        label: g.label,
        sortOrder: g.sortOrder,
        track: g.track ?? 'NORMAL',
        branch: g.branch ?? 'NORMAL',
      },
    });
  }
}

async function seedGrades() {
  // ── پیش‌دبستانی ─────────────────────────────────────────
  await seedGradesForLevel('PRE_SCHOOL', [
    { code: 'AGE_0_4',                label: 'بدو تولد تا ۴ سال',   sortOrder: 10 },
    { code: 'AGE_4_6',                label: '۴ تا ۶ سال',          sortOrder: 20 },
    { code: 'READINESS_BASIC',        label: 'آمادگی مقدماتی',      sortOrder: 30, track: 'INTELLECTUAL_AUTISM' },
    { code: 'READINESS_ADVANCED',     label: 'آمادگی تکمیلی',       sortOrder: 40, track: 'INTELLECTUAL_AUTISM' },
    { code: 'READINESS_SENSORY_MOTOR',label: 'آمادگی (حسی-حرکتی)', sortOrder: 50, track: 'SENSORY_MOTOR' },
  ]);

  // ── ابتدایی ─────────────────────────────────────────────
  // گروه کم‌توان ذهنی / اوتیسم: پایه‌های چندمرحله‌ای (FIRST_1 / FIRST_2 / ...)
  // گروه حسی-حرکتی (شنوایی / بینایی / جسمی): پسوند _SM
  await seedGradesForLevel('PRIMARY', [
    { code: 'FIRST_NORMAL', label: 'اول (عادی)',          sortOrder: 10  },
    { code: 'FIRST_1',      label: 'اول ۱',               sortOrder: 20,  track: 'INTELLECTUAL_AUTISM' },
    { code: 'FIRST_2',      label: 'اول ۲',               sortOrder: 30,  track: 'INTELLECTUAL_AUTISM' },
    { code: 'FIRST_3',      label: 'اول ۳',               sortOrder: 40,  track: 'INTELLECTUAL_AUTISM' },
    { code: 'SECOND_1',     label: 'دوم ۱',               sortOrder: 50,  track: 'INTELLECTUAL_AUTISM' },
    { code: 'SECOND_2',     label: 'دوم ۲',               sortOrder: 60,  track: 'INTELLECTUAL_AUTISM' },
    { code: 'THIRD_1',      label: 'سوم ۱',               sortOrder: 70,  track: 'INTELLECTUAL_AUTISM' },
    { code: 'THIRD_2',      label: 'سوم ۲',               sortOrder: 80,  track: 'INTELLECTUAL_AUTISM' },
    { code: 'FOURTH_1',     label: 'چهارم ۱',             sortOrder: 90,  track: 'INTELLECTUAL_AUTISM' },
    { code: 'FOURTH_2',     label: 'چهارم ۲',             sortOrder: 100, track: 'INTELLECTUAL_AUTISM' },
    { code: 'FIFTH_1',      label: 'پنجم ۱',              sortOrder: 110, track: 'INTELLECTUAL_AUTISM' },
    { code: 'FIFTH_2',      label: 'پنجم ۲',              sortOrder: 120, track: 'INTELLECTUAL_AUTISM' },
    { code: 'SIXTH_1',      label: 'ششم ۱',               sortOrder: 130, track: 'INTELLECTUAL_AUTISM' },
    { code: 'FIRST_SM',     label: 'اول (حسی-حرکتی)',    sortOrder: 20,  track: 'SENSORY_MOTOR' },
    { code: 'SECOND_SM',    label: 'دوم (حسی-حرکتی)',    sortOrder: 30,  track: 'SENSORY_MOTOR' },
    { code: 'THIRD_SM',     label: 'سوم (حسی-حرکتی)',    sortOrder: 40,  track: 'SENSORY_MOTOR' },
    { code: 'FOURTH_SM',    label: 'چهارم (حسی-حرکتی)',  sortOrder: 50,  track: 'SENSORY_MOTOR' },
    { code: 'FIFTH_SM',     label: 'پنجم (حسی-حرکتی)',   sortOrder: 60,  track: 'SENSORY_MOTOR' },
    { code: 'SIXTH_SM',     label: 'ششم (حسی-حرکتی)',    sortOrder: 70,  track: 'SENSORY_MOTOR' },
  ]);

  // ── متوسطه اول ───────────────────────────────────────────
  await seedGradesForLevel('FIRST_MIDDLE', [
    { code: 'SEVENTH_1',      label: 'هفتم استثنایی',             sortOrder: 10, track: 'INTELLECTUAL_AUTISM' },
    { code: 'EIGHTH_1',       label: 'هشتم استثنایی',             sortOrder: 20, track: 'INTELLECTUAL_AUTISM' },
    { code: 'NINTH_1',        label: 'نهم استثنایی',              sortOrder: 30, track: 'INTELLECTUAL_AUTISM' },
    { code: 'SEVENTH_SM',     label: 'هفتم (حسی-حرکتی)',  sortOrder: 10, track: 'SENSORY_MOTOR' },
    { code: 'EIGHTH_SM',      label: 'هشتم (حسی-حرکتی)',  sortOrder: 20, track: 'SENSORY_MOTOR' },
    { code: 'NINTH_SM',       label: 'نهم (حسی-حرکتی)',   sortOrder: 30, track: 'SENSORY_MOTOR' },
  ]);

  // ── متوسطه دوم ───────────────────────────────────────────
  await seedGradesForLevel('SECOND_MIDDLE', [
    { code: 'TENTH_1',               label: 'دهم استثنایی',            sortOrder: 10, track: 'INTELLECTUAL_AUTISM' },
    { code: 'ELEVENTH_1',            label: 'یازدهم استثنایی',         sortOrder: 20, track: 'INTELLECTUAL_AUTISM' },
    { code: 'TWELFTH_1',             label: 'دوازدهم استثنایی',        sortOrder: 30, track: 'INTELLECTUAL_AUTISM' },
    { code: 'TENTH_SM',              label: 'دهم (حسی-حرکتی)',   sortOrder: 10, track: 'SENSORY_MOTOR' },
    { code: 'ELEVENTH_SM',           label: 'یازدهم (حسی-حرکتی)',sortOrder: 20, track: 'SENSORY_MOTOR' },
    { code: 'TWELVETH_SM',           label: 'دوازدهم (حسی-حرکتی)',sortOrder: 30, track: 'SENSORY_MOTOR' },
  ]);

  console.log('✅ پایه‌های تحصیلی (Grade) — همه مقاطع و track‌ها');
}

// ─────────────────────────────────────────────────────────────
// ── ۳. وضعیت‌های سیستمی (Status Types)
// ─────────────────────────────────────────────────────────────
async function seedStatusTypes() {
  // وضعیت پرسنل (کامل‌ترین لیست)
  for (const s of [
    { code: 'ACTIVE',          label: 'مشغول به خدمت', sortOrder: 1  },
    { code: 'MATERNITY_LEAVE', label: 'مرخصی بانوان',   sortOrder: 2  },
    { code: 'UNPAID_LEAVE',    label: 'بدون حقوق',      sortOrder: 3  },
    { code: 'MEDICAL_LEAVE',   label: 'استعلاجی',       sortOrder: 4  },
    { code: 'TEMP_TRANSFER',   label: 'انتقال موقت',    sortOrder: 5  },
    { code: 'MISSION',         label: 'مأموریت',        sortOrder: 6  },
    { code: 'DECEASED',        label: 'فوت',            sortOrder: 7  },
    { code: 'RETIRED',         label: 'بازنشسته',       sortOrder: 8  },
    { code: 'DISMISSED',       label: 'اخراج',          sortOrder: 9  },
    { code: 'RESIGNED',        label: 'استعفا',         sortOrder: 10 },
  ]) {
    await prisma.personnelStatusType.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  // وضعیت دانش‌آموز
  for (const s of [
    { code: 'ENROLLED',    label: 'ثبت‌نام شده',  sortOrder: 1 },
    { code: 'TRANSFERRED', label: 'انتقالی',      sortOrder: 2 },
    { code: 'GRADUATED',   label: 'فارغ‌التحصیل', sortOrder: 3 },
    { code: 'DROPPED',     label: 'ترک تحصیل',   sortOrder: 4 },
    { code: 'SUSPENDED',   label: 'تعلیق',        sortOrder: 5 },
  ]) {
    await prisma.studentStatusType.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  // وضعیت مرکز
  for (const s of [
    { code: 'ACTIVE',    label: 'فعال',   sortOrder: 1 },
    { code: 'SUSPENDED', label: 'تعلیق',  sortOrder: 2 },
    { code: 'CLOSED',    label: 'تعطیل',  sortOrder: 3 },
    { code: 'MERGED',    label: 'ادغام',  sortOrder: 4 },
  ]) {
    await prisma.centerStatusType.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  console.log('✅ وضعیت‌های سیستمی (پرسنل / دانش‌آموز / مرکز)');
}

// ─────────────────────────────────────────────────────────────
// ── تابع ایجاد دانش‌آموز
// ─────────────────────────────────────────────────────────────
function buildStudentCreate(s: StudentDef) {
  return {
    nationalCode:              s.nc,
    firstName:                 s.fn,
    lastName:                  s.ln,
    gender:                    s.g,
    gradeId:                   s.grade.id,
    educationLevelId:          s.level.id,
    centerId:                  s.center.id,
    districtId:                s.dist.id,
    birthYearShamsi:           s.birth[0],
    birthMonth:                s.birth[1],
    birthDay:                  s.birth[2],
    attendanceType:            s.att ?? AttendanceType.SCHOOL_PRESENCE,
    guardianName:              s.guardian,
    guardianPhone:             s.guardianPhone,
    needsSpeechTherapy:        s.needsSpeech    ?? false,
    needsOccupationalTherapy:  s.needsOcc       ?? false,
    needsPhysiotherapy:        s.needsPhysio    ?? false,
    isMartyrFamily:            s.isMartyr       ?? false,
    isOrphan:                  s.isOrphan       ?? false,
    isUnderWelfare:            s.isUnderWelfare ?? false,
    isActive:                  true,
  };
}

// ─────────────────────────────────────────────────────────────
// ── Main
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seed شروع شد...\n');

  // ────────────────────────────────────────────────────────
  // ۱. سال تحصیلی ۱۴۰۴–۱۴۰۵
  // ────────────────────────────────────────────────────────
  const year = await prisma.academicYear.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      label:      '1404-1405',
      startDate:  new Date('2025-09-22'), // ۱ مهر ۱۴۰۴
      endDate:    new Date('2026-09-21'), // ۳۱ شهریور ۱۴۰۵
      isActive:   true,
      isArchived: false,
    },
  });
  console.log('✅ سال تحصیلی:', year.label);

  // ────────────────────────────────────────────────────────
  // ۲. Lookups + Grades + Status Types
  // ────────────────────────────────────────────────────────
  await seedLookups();
  await seedGrades();
  await seedStatusTypes();

  // ────────────────────────────────────────────────────────
  // ۳. Lookupهای پرکاربرد (برای ادامه seed)
  // ────────────────────────────────────────────────────────
  const distZnj0     = await getLookup('DISTRICT',         'ZNJ0');
  const distZnj1     = await getLookup('DISTRICT',         'ZNJ1');
  const distZnj2     = await getLookup('DISTRICT',         'ZNJ2');
  const typeSchool   = await getLookup('CENTER_TYPE',      'EXCEPTIONAL_SCHOOL');
  const typeOffice   = await getLookup('CENTER_TYPE',      'OFFICE');
  const typeCenter   = await getLookup('CENTER_TYPE',      'COMPREHENSIVE_CENTER');
  const jobOfficial  = await getLookup('JOB_POSITION',     'HEAD_OF_OFFICE');
  const jobManager   = await getLookup('JOB_POSITION',     'MANAGER');
  const jobTeacher   = await getLookup('JOB_POSITION',     'PRIMARY_TEACHER');
  const jobSbjTeach  = await getLookup('JOB_POSITION',     'SUBJECT_TEACHER');
  const jobTherapist = await getLookup('JOB_POSITION',     'SPEECH_THERAPIST');
  const jobOccThera  = await getLookup('JOB_POSITION',     'OCCUPATIONAL_THERAPIST');
  const empOfficial  = await getLookup('EMPLOYMENT_TYPE',  'OFFICIAL');
  const empContract  = await getLookup('EMPLOYMENT_TYPE',  'CONTRACTUAL');
  const empService   = await getLookup('EMPLOYMENT_TYPE',  'SERVICE_PURCHASE');
  const degBachelor  = await getLookup('EDUCATION_DEGREE', 'BACHELOR');
  const degMaster    = await getLookup('EDUCATION_DEGREE', 'MASTER');
  const disInt       = await getLookup('DISABILITY_TYPE',  'INTELLECTUAL');
  const disHear      = await getLookup('DISABILITY_TYPE',  'HEARING');
  const disAut       = await getLookup('DISABILITY_TYPE',  'AUTISM');
  const disVis       = await getLookup('DISABILITY_TYPE',  'VISUAL');
  const disPhys      = await getLookup('DISABILITY_TYPE',  'PHYSICAL_MOTOR');
  const disBeh       = await getLookup('DISABILITY_TYPE',  'BEHAVIORAL_DISABILITY');
  const levelPre     = await getLookup('EDUCATION_LEVEL',  'PRE_SCHOOL');
  const levelPri     = await getLookup('EDUCATION_LEVEL',  'PRIMARY');
  const levelMid1    = await getLookup('EDUCATION_LEVEL',  'FIRST_MIDDLE');
  const levelMid2    = await getLookup('EDUCATION_LEVEL',  'SECOND_MIDDLE');

  // پایه‌ها
  const gReady    = await getGrade('READINESS_BASIC');
  const gFirst1   = await getGrade('FIRST_1');
  const gFirst2   = await getGrade('FIRST_2');
  const gSecond1  = await getGrade('SECOND_1');
  const gSecond2  = await getGrade('SECOND_2');
  const gThird1   = await getGrade('THIRD_1');
  const gThird2   = await getGrade('THIRD_2');
  const gFourth1  = await getGrade('FOURTH_1');
  const gFifth1   = await getGrade('FIFTH_1');
  const gSixth1   = await getGrade('SIXTH_1');
  const gFirstSm  = await getGrade('FIRST_SM');
  const gSecSm    = await getGrade('SECOND_SM');
  const gThirdSm  = await getGrade('THIRD_SM');
  const gFourthSm = await getGrade('FOURTH_SM');
  const gSeventh1 = await getGrade('SEVENTH_1');
  const gEighth1  = await getGrade('EIGHTH_1');
  const gNinth1   = await getGrade('NINTH_1');
  const gTenth1   = await getGrade('TENTH_1');

  // ────────────────────────────────────────────────────────
  // ۴. سوپریوزرها
  // ────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where:  { nationalCode: '0000000001' },
    update: {},
    create: {
      nationalCode: '0000000001', firstName: 'مدیر', lastName: 'سیستم',
      gender: Gender.MALE, userType: UserType.SUPERUSER,
      canLogin: true, passwordHash: await bcrypt.hash('Admin@1234', 10), isActive: true,
    },
  });
  await prisma.user.upsert({
    where:  { nationalCode: '0000000002' },
    update: {},
    create: {
      nationalCode: '0000000002', firstName: 'پشتیبان', lastName: 'سیستم',
      gender: Gender.FEMALE, userType: UserType.SUPERUSER,
      canLogin: true, passwordHash: await bcrypt.hash('Admin@5678', 10), isActive: true,
    },
  });
  console.log('✅ سوپریوزرها (مدیر سیستم + پشتیبان سیستم)');

  // ────────────────────────────────────────────────────────
  // ۵. اداره آموزش و پرورش استثنایی استان زنجان
  // ────────────────────────────────────────────────────────
  const office = await prisma.center.upsert({
    where:  { organizationCode: 'ZNJ-OFFICE-001' },
    update: {},
    create: {
      name: 'اداره آموزش و پرورش استثنایی استان زنجان',
      code: 'OFFICE-001',
      organizationCode: 'ZNJ-OFFICE-001',
      province: 'زنجان',
      city: 'زنجان',
      address: 'زنجان، خیابان آزادی، اداره استثنایی استان',
      phone: '024-33445566',
      centerTypeId: typeOffice.id,
      districtId: distZnj0.id,
      isActive: true,
    },
  });

  const offMgr = await prisma.user.upsert({
    where:  { nationalCode: '3400100001' },
    update: {},
    create: {
      nationalCode: '3400100001', firstName: 'فاطمه', lastName: 'باغبانی',
      gender: Gender.FEMALE, userType: UserType.CENTER_MANAGER,
      canLogin: true, passwordHash: await bcrypt.hash('Manager@1234', 10), isActive: true,
      jobPositionId: jobOfficial.id, employmentTypeId: empOfficial.id,
      educationDegreeId: degMaster.id,
      birthYearShamsi: 1360, birthMonth: 4, birthDay: 20,
      districtId: distZnj0.id, serviceRecordYears: 29,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 1 }, update: {},
    create: { userId: offMgr.id, centerId: office.id, academicYearId: year.id, isPrimary: true },
  });
  console.log('✅ اداره استثنایی استان + رئیس اداره');

  // ────────────────────────────────────────────────────────
  // ۶. مدرسه ۱: باغچه‌بان زنجان (ناحیه یک)
  //    تخصص: کم‌توان ذهنی، اوتیسم، حسی-حرکتی، پیش‌دبستانی
  // ────────────────────────────────────────────────────────
  const sch1 = await prisma.center.upsert({
    where:  { organizationCode: 'ZNJ-SCH-001' },
    update: {},
    create: {
      name: 'رودکی',
      code: 'SCH-001',
      organizationCode: 'ZNJ-SCH-001',
      province: 'زنجان',
      city: 'زنجان',
      address: 'زنجان، اعتمادیه',
      phone: '024-33112233',
      centerTypeId: typeSchool.id,
      districtId: distZnj2.id,
      isActive: true,
    },
  });

  const mgr1 = await prisma.user.upsert({
    where: { nationalCode: '3400200001' }, update: {},
    create: {
      nationalCode: '3400200001', firstName: 'نرگس', lastName: 'آردم',
      gender: Gender.FEMALE, userType: UserType.CENTER_MANAGER,
      canLogin: true, passwordHash: await bcrypt.hash('School1@1234', 10), isActive: true,
      jobPositionId: jobManager.id, employmentTypeId: empOfficial.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1360, birthMonth: 6, birthDay: 20,
      districtId: distZnj1.id, serviceRecordYears: 32,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 2 }, update: {},
    create: { userId: mgr1.id, centerId: sch1.id, academicYearId: year.id, isPrimary: true },
  });

  // پرسنل مدرسه ۱
  const tch1a = await prisma.user.upsert({
    where: { nationalCode: '3400200010' }, update: {},
    create: {
      nationalCode: '3400200010', firstName: 'محمد', lastName: 'حسینی',
      gender: Gender.MALE, userType: UserType.TEACHER, canLogin: false, isActive: true,
      jobPositionId: jobTeacher.id, employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1370, birthMonth: 2, birthDay: 10,
      districtId: distZnj1.id, serviceRecordYears: 5,
    },
  });
  const tch1b = await prisma.user.upsert({
    where: { nationalCode: '3400200011' }, update: {},
    create: {
      nationalCode: '3400200011', firstName: 'زینب', lastName: 'علوی',
      gender: Gender.FEMALE, userType: UserType.TEACHER, canLogin: false, isActive: true,
      jobPositionId: jobTeacher.id, employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1372, birthMonth: 5, birthDay: 3,
      districtId: distZnj1.id, serviceRecordYears: 4,
    },
  });
  const tch1c = await prisma.user.upsert({
    where: { nationalCode: '3400200012' }, update: {},
    create: {
      nationalCode: '3400200012', firstName: 'حمید', lastName: 'نوروزی',
      gender: Gender.MALE, userType: UserType.TEACHER, canLogin: false, isActive: true,
      jobPositionId: jobSbjTeach.id, employmentTypeId: empService.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1368, birthMonth: 9, birthDay: 25,
      districtId: distZnj1.id, serviceRecordYears: 7,
    },
  });
  const tch1d = await prisma.user.upsert({
    where: { nationalCode: '3400200013' }, update: {},
    create: {
      nationalCode: '3400200013', firstName: 'مریم', lastName: 'قاسمی',
      gender: Gender.FEMALE, userType: UserType.TEACHER, canLogin: false, isActive: true,
      jobPositionId: jobTeacher.id, employmentTypeId: empOfficial.id,
      educationDegreeId: degMaster.id,
      birthYearShamsi: 1366, birthMonth: 1, birthDay: 18,
      districtId: distZnj1.id, serviceRecordYears: 10,
    },
  });
  const ther1 = await prisma.user.upsert({
    where: { nationalCode: '3400200014' }, update: {},
    create: {
      nationalCode: '3400200014', firstName: 'زهرا', lastName: 'کریمی',
      gender: Gender.FEMALE, userType: UserType.STAFF, canLogin: false, isActive: true,
      jobPositionId: jobTherapist.id, employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1372, birthMonth: 9, birthDay: 5,
      districtId: distZnj1.id, serviceRecordYears: 3,
    },
  });
  const occTher1 = await prisma.user.upsert({
    where: { nationalCode: '3400200015' }, update: {},
    create: {
      nationalCode: '3400200015', firstName: 'سعید', lastName: 'امیری',
      gender: Gender.MALE, userType: UserType.STAFF, canLogin: false, isActive: true,
      jobPositionId: jobOccThera.id, employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1374, birthMonth: 3, birthDay: 12,
      districtId: distZnj1.id, serviceRecordYears: 2,
    },
  });

  for (const [uid, aid] of [
    [tch1a.id, 3], [tch1b.id, 4], [tch1c.id, 5],
    [tch1d.id, 6], [ther1.id, 7], [occTher1.id, 8],
  ] as [number, number][]) {
    await prisma.userCenterAssignment.upsert({
      where: { id: aid }, update: {},
      create: { userId: uid, centerId: sch1.id, academicYearId: year.id, isPrimary: true },
    });
  }
  console.log('✅ مدرسه ۱ (باغچه‌بان) — مدیر + ۴ آموزگار + گفتاردرمانگر + کاردرمانگر');

  // ────────────────────────────────────────────────────────
  // ۷. مدرسه ۲: شهید چمران زنجان (ناحیه دو)
  //    تخصص: متوسطه اول و دوم، پیش‌حرفه‌ای، کاردانش خاص
  // ────────────────────────────────────────────────────────
  const sch2 = await prisma.center.upsert({
    where:  { organizationCode: 'ZNJ-SCH-002' },
    update: {},
    create: {
      name: 'شهید محمدی',
      code: 'SCH-002',
      organizationCode: 'ZNJ-SCH-002',
      province: 'زنجان',
      city: 'زنجان',
      address: 'زنجان، خیابان باباییان',
      phone: '024-33998877',
      centerTypeId: typeSchool.id,
      districtId: distZnj1.id,
      isActive: true,
    },
  });

  const mgr2 = await prisma.user.upsert({
    where: { nationalCode: '3400300001' }, update: {},
    create: {
      nationalCode: '3400300001', firstName: 'مریم', lastName: 'محمدی',
      gender: Gender.FEMALE, userType: UserType.CENTER_MANAGER,
      canLogin: true, passwordHash: await bcrypt.hash('School2@1234', 10), isActive: true,
      jobPositionId: jobManager.id, employmentTypeId: empOfficial.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1364, birthMonth: 11, birthDay: 3,
      districtId: distZnj2.id, serviceRecordYears: 18,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 9 }, update: {},
    create: { userId: mgr2.id, centerId: sch2.id, academicYearId: year.id, isPrimary: true },
  });

  const tch2a = await prisma.user.upsert({
    where: { nationalCode: '3400300010' }, update: {},
    create: {
      nationalCode: '3400300010', firstName: 'مریم', lastName: 'صادقی',
      gender: Gender.FEMALE, userType: UserType.TEACHER, canLogin: false, isActive: true,
      jobPositionId: jobTeacher.id, employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1368, birthMonth: 7, birthDay: 18,
      districtId: distZnj2.id, serviceRecordYears: 7,
    },
  });
  const tch2b = await prisma.user.upsert({
    where: { nationalCode: '3400300011' }, update: {},
    create: {
      nationalCode: '3400300011', firstName: 'رضا', lastName: 'موسوی',
      gender: Gender.MALE, userType: UserType.TEACHER, canLogin: false, isActive: true,
      jobPositionId: jobTeacher.id, employmentTypeId: empService.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1371, birthMonth: 4, birthDay: 7,
      districtId: distZnj2.id, serviceRecordYears: 4,
    },
  });
  const tch2c = await prisma.user.upsert({
    where: { nationalCode: '3400300012' }, update: {},
    create: {
      nationalCode: '3400300012', firstName: 'فرزانه', lastName: 'تقوی',
      gender: Gender.FEMALE, userType: UserType.TEACHER, canLogin: false, isActive: true,
      jobPositionId: jobSbjTeach.id, employmentTypeId: empOfficial.id,
      educationDegreeId: degMaster.id,
      birthYearShamsi: 1364, birthMonth: 12, birthDay: 22,
      districtId: distZnj2.id, serviceRecordYears: 12,
    },
  });
  const tch2d = await prisma.user.upsert({
    where: { nationalCode: '3400300013' }, update: {},
    create: {
      nationalCode: '3400300013', firstName: 'علی', lastName: 'کمالی',
      gender: Gender.MALE, userType: UserType.TEACHER, canLogin: false, isActive: true,
      jobPositionId: jobTeacher.id, employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1373, birthMonth: 8, birthDay: 14,
      districtId: distZnj2.id, serviceRecordYears: 3,
    },
  });

  for (const [uid, aid] of [
    [tch2a.id, 10], [tch2b.id, 11], [tch2c.id, 12], [tch2d.id, 13],
  ] as [number, number][]) {
    await prisma.userCenterAssignment.upsert({
      where: { id: aid }, update: {},
      create: { userId: uid, centerId: sch2.id, academicYearId: year.id, isPrimary: true },
    });
  }
  console.log('✅ مدرسه ۲ (شهید محمدی) — مدیر + ۴ آموزگار/دبیر');

  // ────────────────────────────────────────────────────────
  // ۸. مرکز جامع سنجش (مرکز سوم)
  // ────────────────────────────────────────────────────────
  const center3 = await prisma.center.upsert({
    where:  { organizationCode: 'ZNJ-CENTER-001' },
    update: {},
    create: {
      name: 'مرکز جامع 2 ناحیه 2',
      code: 'CENTER-002',
      organizationCode: 'ZNJ-CENTER-002',
      province: 'زنجان',
      city: 'زنجان',
      address: 'زنجان، خیابان خرمشهر',
      phone: '024-33667788',
      centerTypeId: typeCenter.id,
      districtId: distZnj2.id,
      isActive: true,
    },
  });

  const mgr3 = await prisma.user.upsert({
    where: { nationalCode: '3400400001' }, update: {},
    create: {
      nationalCode: '3400400001', firstName: 'نادیا', lastName: 'مظفری',
      gender: Gender.FEMALE, userType: UserType.CENTER_MANAGER,
      canLogin: false, passwordHash: await bcrypt.hash('School3@1234', 10), isActive: true,
      jobPositionId: jobManager.id, employmentTypeId: empOfficial.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1371, birthMonth: 11, birthDay: 3,
      districtId: distZnj2.id, serviceRecordYears: 15,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 109 }, update: {},
    create: { userId: mgr3.id, centerId: center3.id, academicYearId: year.id, isPrimary: true },
  });
  console.log('✅ مرکز جامع سنجش و آموزش');

  // ────────────────────────────────────────────────────────
  // ۹. دانش‌آموزان مدرسه ۱ (۳۵ نفر)
  // ────────────────────────────────────────────────────────
  // گروه‌بندی: کم‌توان ذهنی (۱۴)، اوتیسم (۶)، چندمعلولیتی (۵)،
  //            حسی-حرکتی/شنوایی (۵)، پیش‌دبستانی (۵)
  const sch1Students: StudentDef[] = [
    // ─ کم‌توان ذهنی - ابتدایی ────────────────────────────
    { nc:'3410000001', fn:'امیرعلی',  ln:'موسوی',    g:Gender.MALE,   grade:gFirst1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1397,3,5],   dis:[{id:disInt.id}],                           guardian:'محمد موسوی',   guardianPhone:'09121111001' },
    { nc:'3410000002', fn:'سارا',     ln:'نجفی',     g:Gender.FEMALE, grade:gFirst1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1397,7,12],  dis:[{id:disInt.id}],                           guardian:'احمد نجفی',    guardianPhone:'09121111002' },
    { nc:'3410000003', fn:'علی',      ln:'قاسمی',    g:Gender.MALE,   grade:gSecond1, level:levelPri, center:sch1, dist:distZnj1, birth:[1396,1,20],  dis:[{id:disInt.id}],                           needsSpeech:true },
    { nc:'3410000004', fn:'نازنین',   ln:'ابراهیمی', g:Gender.FEMALE, grade:gSecond1, level:levelPri, center:sch1, dist:distZnj1, birth:[1396,5,8],   dis:[{id:disInt.id,sev:DisabilitySeverity.MILD}]},
    { nc:'3410000005', fn:'پارسا',    ln:'رستمی',    g:Gender.MALE,   grade:gThird1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1395,9,15],  dis:[{id:disInt.id}],                           guardian:'رضا رستمی',    guardianPhone:'09121111005', isMartyr:true },
    { nc:'3410000006', fn:'فاطمه',    ln:'میرزایی',  g:Gender.FEMALE, grade:gThird1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1395,2,22],  dis:[{id:disInt.id}] },
    { nc:'3410000007', fn:'آرمان',    ln:'بهرامی',   g:Gender.MALE,   grade:gFourth1, level:levelPri, center:sch1, dist:distZnj1, birth:[1394,6,11],  dis:[{id:disInt.id,sev:DisabilitySeverity.SEVERE}], needsOcc:true },
    { nc:'3410000008', fn:'ریحانه',   ln:'حیدری',    g:Gender.FEMALE, grade:gFifth1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1393,8,29],  dis:[{id:disInt.id}] },
    { nc:'3410000009', fn:'کوروش',    ln:'صفری',     g:Gender.MALE,   grade:gFirst2,  level:levelPri, center:sch1, dist:distZnj1, birth:[1397,12,1],  dis:[{id:disInt.id,sev:DisabilitySeverity.MODERATE}] },
    { nc:'3410000010', fn:'شقایق',    ln:'مرادی',    g:Gender.FEMALE, grade:gSecond2, level:levelPri, center:sch1, dist:distZnj1, birth:[1396,4,17],  dis:[{id:disInt.id}] },
    { nc:'3410000011', fn:'بهزاد',    ln:'خدایاری',  g:Gender.MALE,   grade:gThird2,  level:levelPri, center:sch1, dist:distZnj1, birth:[1395,11,6],  dis:[{id:disInt.id}],                           guardian:'یوسف خدایاری', guardianPhone:'09121111011' },
    { nc:'3410000012', fn:'الهام',    ln:'باقری',    g:Gender.FEMALE, grade:gSixth1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1392,3,19],  dis:[{id:disInt.id}] },
    { nc:'3410000013', fn:'سجاد',     ln:'جعفری',    g:Gender.MALE,   grade:gFirst1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1397,6,8],   dis:[{id:disInt.id}],                           needsSpeech:true },
    { nc:'3410000014', fn:'زهرا',     ln:'اکبری',    g:Gender.FEMALE, grade:gSecond1, level:levelPri, center:sch1, dist:distZnj1, birth:[1396,9,14],  dis:[{id:disInt.id}] },
    // ─ اوتیسم - ابتدایی ──────────────────────────────────
    { nc:'3410000015', fn:'رضا',      ln:'شریفی',    g:Gender.MALE,   grade:gFirst1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1397,2,5],   dis:[{id:disAut.id}],                           needsSpeech:true, needsOcc:true },
    { nc:'3410000016', fn:'نیلوفر',   ln:'رحیمی',    g:Gender.FEMALE, grade:gSecond1, level:levelPri, center:sch1, dist:distZnj1, birth:[1396,7,21],  dis:[{id:disAut.id}],                           needsOcc:true },
    { nc:'3410000017', fn:'آریا',     ln:'ملکی',     g:Gender.MALE,   grade:gThird1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1395,4,13],  dis:[{id:disAut.id,sev:DisabilitySeverity.SEVERE}], needsSpeech:true },
    { nc:'3410000018', fn:'دینا',     ln:'حسن‌زاده', g:Gender.FEMALE, grade:gFirst2,  level:levelPri, center:sch1, dist:distZnj1, birth:[1397,10,30], dis:[{id:disAut.id}] },
    { nc:'3410000019', fn:'امیر',     ln:'طاهری',    g:Gender.MALE,   grade:gFourth1, level:levelPri, center:sch1, dist:distZnj1, birth:[1394,5,9],   dis:[{id:disAut.id}],                           isOrphan:true },
    { nc:'3410000020', fn:'مبینا',    ln:'ذبیحی',    g:Gender.FEMALE, grade:gSecond1, level:levelPri, center:sch1, dist:distZnj1, birth:[1396,8,2],   dis:[{id:disAut.id}] },
    // ─ چندمعلولیتی ───────────────────────────────────────
    { nc:'3410000021', fn:'مهسا',     ln:'جعفری',    g:Gender.FEMALE, grade:gThird1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1395,6,14],  dis:[{id:disInt.id},{id:disHear.id}],           needsSpeech:true },
    { nc:'3410000022', fn:'محمدرضا',  ln:'علیزاده',  g:Gender.MALE,   grade:gSecond1, level:levelPri, center:sch1, dist:distZnj1, birth:[1396,3,27],  dis:[{id:disAut.id},{id:disInt.id}],            needsOcc:true },
    { nc:'3410000023', fn:'غزاله',    ln:'طاهری',    g:Gender.FEMALE, grade:gFourth1, level:levelPri, center:sch1, dist:distZnj1, birth:[1394,1,19],  dis:[{id:disInt.id},{id:disPhys.id}],           needsOcc:true },
    { nc:'3410000024', fn:'داریوش',   ln:'فرهادی',   g:Gender.MALE,   grade:gFirst1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1397,9,8],   dis:[{id:disAut.id},{id:disBeh.id}] },
    { nc:'3410000025', fn:'ستاره',    ln:'صالحی',    g:Gender.FEMALE, grade:gThird1,  level:levelPri, center:sch1, dist:distZnj1, birth:[1395,7,23],  dis:[{id:disInt.id},{id:disVis.id}] },
    // ─ حسی-حرکتی (شنوایی) ───────────────────────────────
    { nc:'3410000026', fn:'زینب',     ln:'محمدی',    g:Gender.FEMALE, grade:gFirstSm, level:levelPri, center:sch1, dist:distZnj1, birth:[1397,11,3],  dis:[{id:disHear.id}] },
    { nc:'3410000027', fn:'بهنام',    ln:'نادری',    g:Gender.MALE,   grade:gSecSm,   level:levelPri, center:sch1, dist:distZnj1, birth:[1396,2,16],  dis:[{id:disHear.id,sev:DisabilitySeverity.SEVERE}] },
    { nc:'3410000028', fn:'لیلا',     ln:'یوسفی',    g:Gender.FEMALE, grade:gThirdSm, level:levelPri, center:sch1, dist:distZnj1, birth:[1395,10,4],  dis:[{id:disHear.id}],                          needsSpeech:true },
    { nc:'3410000029', fn:'سهیل',     ln:'رضایی',    g:Gender.MALE,   grade:gFirstSm, level:levelPri, center:sch1, dist:distZnj1, birth:[1397,5,20],  dis:[{id:disHear.id}] },
    { nc:'3410000030', fn:'پریسا',    ln:'کاظمی',    g:Gender.FEMALE, grade:gFourthSm,level:levelPri, center:sch1, dist:distZnj1, birth:[1394,12,11], dis:[{id:disHear.id}] },
    // ─ پیش‌دبستانی ───────────────────────────────────────
    { nc:'3410000031', fn:'پارمیدا',  ln:'ولی‌زاده', g:Gender.FEMALE, grade:gReady,   level:levelPre, center:sch1, dist:distZnj1, birth:[1399,4,5],   dis:[{id:disInt.id}] },
    { nc:'3410000032', fn:'آراد',     ln:'سلیمانی',  g:Gender.MALE,   grade:gReady,   level:levelPre, center:sch1, dist:distZnj1, birth:[1399,9,18],  dis:[{id:disAut.id}],                           needsSpeech:true },
    { nc:'3410000033', fn:'ترانه',    ln:'میرمحمدی', g:Gender.FEMALE, grade:gReady,   level:levelPre, center:sch1, dist:distZnj1, birth:[1399,2,27],  dis:[{id:disInt.id}] },
    { nc:'3410000034', fn:'کیان',     ln:'اسدی',     g:Gender.MALE,   grade:gReady,   level:levelPre, center:sch1, dist:distZnj1, birth:[1400,1,10],  dis:[{id:disAut.id}],                           needsOcc:true },
    { nc:'3410000035', fn:'ماهان',    ln:'حیدری',    g:Gender.MALE,   grade:gReady,   level:levelPre, center:sch1, dist:distZnj1, birth:[1399,7,3],   dis:[{id:disInt.id}] },
  ];

  // ────────────────────────────────────────────────────────
  // ۱۰. دانش‌آموزان مدرسه ۲ (۳۰ نفر)
  // ────────────────────────────────────────────────────────
  // گروه‌بندی: متوسطه اول کم‌توان (۱۰)، متوسطه اول اوتیسم (۵)،
  //            پیش‌حرفه‌ای (۴)، ابتدایی (۶)، چندمعلولیتی (۵)
  const sch2Students: StudentDef[] = [
    // ─ متوسطه اول - کم‌توان ذهنی ─────────────────────────
    { nc:'3420000001', fn:'آرین',    ln:'کمالی',     g:Gender.MALE,   grade:gSeventh1, level:levelMid1, center:sch2, dist:distZnj2, birth:[1390,3,8],   dis:[{id:disInt.id}],                           guardian:'علی کمالی',  guardianPhone:'09122221001' },
    { nc:'3420000002', fn:'نیلوفر',  ln:'رحیمی',     g:Gender.FEMALE, grade:gSeventh1, level:levelMid1, center:sch2, dist:distZnj2, birth:[1390,6,25],  dis:[{id:disInt.id}] },
    { nc:'3420000003', fn:'الناز',   ln:'کرمی',      g:Gender.FEMALE, grade:gSeventh1, level:levelMid1, center:sch2, dist:distZnj2, birth:[1390,9,3],   dis:[{id:disInt.id}],                           isMartyr:true },
    { nc:'3420000004', fn:'آرمان',   ln:'فرجی',      g:Gender.MALE,   grade:gEighth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1389,4,15],  dis:[{id:disInt.id}] },
    { nc:'3420000005', fn:'سبا',     ln:'رضایی',     g:Gender.FEMALE, grade:gEighth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1389,11,29], dis:[{id:disInt.id,sev:DisabilitySeverity.MILD}] },
    { nc:'3420000006', fn:'سینا',    ln:'منصوری',    g:Gender.MALE,   grade:gNinth1,   level:levelMid1, center:sch2, dist:distZnj2, birth:[1388,1,14],  dis:[{id:disInt.id}] },
    { nc:'3420000007', fn:'یاسمن',   ln:'حجتی',      g:Gender.FEMALE, grade:gNinth1,   level:levelMid1, center:sch2, dist:distZnj2, birth:[1388,7,20],  dis:[{id:disInt.id}] },
    { nc:'3420000008', fn:'کاوه',    ln:'معینی',     g:Gender.MALE,   grade:gSeventh1, level:levelMid1, center:sch2, dist:distZnj2, birth:[1390,5,7],   dis:[{id:disInt.id}],                           needsOcc:true },
    { nc:'3420000009', fn:'نسرین',   ln:'اصغری',     g:Gender.FEMALE, grade:gEighth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1389,8,12],  dis:[{id:disInt.id}] },
    { nc:'3420000010', fn:'رامین',   ln:'ولوی',      g:Gender.MALE,   grade:gNinth1,   level:levelMid1, center:sch2, dist:distZnj2, birth:[1388,2,28],  dis:[{id:disInt.id,sev:DisabilitySeverity.MODERATE}] },
    // ─ متوسطه اول - اوتیسم ───────────────────────────────
    { nc:'3420000011', fn:'شایان',   ln:'محمودی',    g:Gender.MALE,   grade:gSeventh1, level:levelMid1, center:sch2, dist:distZnj2, birth:[1390,10,16], dis:[{id:disAut.id}],                           needsSpeech:true },
    { nc:'3420000012', fn:'روژان',   ln:'رشیدی',     g:Gender.FEMALE, grade:gEighth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1389,6,9],   dis:[{id:disAut.id}],                           needsOcc:true },
    { nc:'3420000013', fn:'پوریا',   ln:'خسروی',     g:Gender.MALE,   grade:gSeventh1, level:levelMid1, center:sch2, dist:distZnj2, birth:[1390,1,22],  dis:[{id:disAut.id,sev:DisabilitySeverity.SEVERE}] },
    { nc:'3420000014', fn:'صبا',     ln:'آقایی',     g:Gender.FEMALE, grade:gNinth1,   level:levelMid1, center:sch2, dist:distZnj2, birth:[1388,12,4],  dis:[{id:disAut.id}] },
    { nc:'3420000015', fn:'امیرحسین',ln:'ابوالحسنی', g:Gender.MALE,   grade:gEighth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1389,3,17],  dis:[{id:disAut.id}] },
    // ─ پیش‌حرفه‌ای ─────────────────────────────────────────
    { nc:'3420000016', fn:'بهرام',   ln:'نوروزی',    g:Gender.MALE,   grade:gEighth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1388,4,19],  dis:[{id:disInt.id}] },
    { nc:'3420000017', fn:'سحر',     ln:'اسماعیلی',  g:Gender.FEMALE, grade:gSeventh1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1388,7,7],   dis:[{id:disInt.id}] },
    { nc:'3420000018', fn:'علیرضا',  ln:'پورمحمد',   g:Gender.MALE,   grade:gNinth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1388,9,25],  dis:[{id:disInt.id,sev:DisabilitySeverity.MILD}] },
    { nc:'3420000019', fn:'صدف',     ln:'مظفری',     g:Gender.FEMALE, grade:gEighth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1388,11,13], dis:[{id:disInt.id}] },
    // ─ ابتدایی مدرسه ۲ ────────────────────────────────────
    { nc:'3420000020', fn:'آرمان',   ln:'بهمنی',     g:Gender.MALE,   grade:gFirst1,   level:levelPri,  center:sch2, dist:distZnj2, birth:[1397,2,23],  dis:[{id:disInt.id}],                           guardian:'مجید بهمنی', guardianPhone:'09122222020' },
    { nc:'3420000021', fn:'غزل',     ln:'قنبری',     g:Gender.FEMALE, grade:gFirst1,   level:levelPri,  center:sch2, dist:distZnj2, birth:[1397,10,11], dis:[{id:disInt.id}] },
    { nc:'3420000022', fn:'شاهین',   ln:'احمدی',     g:Gender.MALE,   grade:gSecond1,  level:levelPri,  center:sch2, dist:distZnj2, birth:[1396,6,5],   dis:[{id:disAut.id}],                           needsSpeech:true },
    { nc:'3420000023', fn:'سمیرا',   ln:'کریمی',     g:Gender.FEMALE, grade:gThird1,   level:levelPri,  center:sch2, dist:distZnj2, birth:[1395,8,16],  dis:[{id:disInt.id}] },
    { nc:'3420000024', fn:'فرهان',   ln:'یاری',      g:Gender.MALE,   grade:gFourth1,  level:levelPri,  center:sch2, dist:distZnj2, birth:[1394,3,28],  dis:[{id:disPhys.id}],                          needsOcc:true },
    { nc:'3420000025', fn:'مهتاب',   ln:'دهقانی',    g:Gender.FEMALE, grade:gFifth1,   level:levelPri,  center:sch2, dist:distZnj2, birth:[1393,1,9],   dis:[{id:disInt.id}] },
    // ─ چندمعلولیتی و سایر ─────────────────────────────────
    { nc:'3420000026', fn:'آراد',    ln:'رنجبر',     g:Gender.MALE,   grade:gSeventh1, level:levelMid1, center:sch2, dist:distZnj2, birth:[1390,5,4],   dis:[{id:disInt.id},{id:disAut.id}],            needsSpeech:true },
    { nc:'3420000027', fn:'ساینا',   ln:'صیادی',     g:Gender.FEMALE, grade:gEighth1,  level:levelMid1, center:sch2, dist:distZnj2, birth:[1389,9,17],  dis:[{id:disInt.id},{id:disPhys.id}],           needsOcc:true },
    { nc:'3420000028', fn:'مانی',    ln:'حسنی',      g:Gender.MALE,   grade:gSecond1,  level:levelPri,  center:sch2, dist:distZnj2, birth:[1396,12,6],  dis:[{id:disVis.id}] },
    { nc:'3420000029', fn:'درنا',    ln:'ولی‌پور',   g:Gender.FEMALE, grade:gThird1,   level:levelPri,  center:sch2, dist:distZnj2, birth:[1395,3,21],  dis:[{id:disBeh.id}] },
    { nc:'3420000030', fn:'کسری',    ln:'مهرابی',    g:Gender.MALE,   grade:gTenth1,   level:levelMid2, center:sch2, dist:distZnj2, birth:[1387,6,30],  dis:[{id:disInt.id}] },
  ];

  // ────────────────────────────────────────────────────────
  // ۱۱. ثبت دانش‌آموزان + معلولیت‌ها
  // ────────────────────────────────────────────────────────
  for (const s of [...sch1Students, ...sch2Students]) {
    const student = await prisma.student.upsert({
      where:  { nationalCode: s.nc },
      update: {},
      create: buildStudentCreate(s),
    });

    for (const d of s.dis) {
      await prisma.studentDisability.upsert({
        where: { studentId_disabilityTypeId: { studentId: student.id, disabilityTypeId: d.id } },
        update: {},
        create: {
          studentId:       student.id,
          disabilityTypeId: d.id,
          severity:        d.sev ?? DisabilitySeverity.MODERATE,
        },
      });
    }
  }

  const total = sch1Students.length + sch2Students.length;
  console.log(`✅ دانش‌آموزان: ${total} نفر (${sch1Students.length} مدرسه ۱ + ${sch2Students.length} مدرسه ۲)`);

  // ────────────────────────────────────────────────────────
  // پایان
  // ────────────────────────────────────────────────────────
  console.log('\n🎉 Seed با موفقیت انجام شد!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('نام کاربری / رمز ورود:');
  console.log('  سوپریوزر ۱ (مدیر سیستم):      کد ملی: 0000000001  | رمز: Admin@1234');
  console.log('  سوپریوزر ۲ (پشتیبان سیستم):   کد ملی: 0000000002  | رمز: Admin@5678');
  console.log('  رئیس اداره استثنایی:           کد ملی: 3400100001  | رمز: Manager@1234');
  console.log('  مدیر مدرسه رودکی: کد ملی: 3400200001  | رمز: School1@1234');
  console.log('  مدیر مدرسه شهید محمدی: کد ملی: 3400300001  | رمز: School2@1234');
  console.log('  مدیر مرکز جامع 2 (ناحیه ۲): کد ملی: 3400400001  | رمز: School3@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
