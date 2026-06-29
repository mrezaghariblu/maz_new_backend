/* eslint-disable prettier/prettier */
// prisma/seed.ts
import {
  PrismaClient,
  UserType,
  Gender,
  DisabilitySeverity,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type LookupSeed = { code: string; label: string; sortOrder: number };
type GradeSeed = {
  code: string;
  label: string;
  sortOrder: number;
  track?: 'NORMAL' | 'INTELLECTUAL_AUTISM' | 'SENSORY_MOTOR';
  branch?: 'NORMAL' | 'VOCATIONAL';
};

async function seedLookupGroup(groupKey: string, items: LookupSeed[]) {
  for (const item of items) {
    await prisma.lookupValue.upsert({
      where: { groupKey_code: { groupKey, code: item.code } },
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

async function seedLookups() {
  await seedLookupGroup('DISTRICT', [
    { code: 'ZNJ1', label: 'ناحیه یک زنجان', sortOrder: 10 },
    { code: 'ZNJ2', label: 'ناحیه دو زنجان', sortOrder: 20 },
    { code: 'ABHAR', label: 'ابهر', sortOrder: 30 },
    { code: 'KHORRAMDAREH', label: 'خرمدره', sortOrder: 40 },
    { code: 'TAROM', label: 'طارم', sortOrder: 50 },
    { code: 'KHODABANDEH', label: 'خدابنده', sortOrder: 60 },
    { code: 'SOLTANIEH', label: 'سلطانیه', sortOrder: 70 },
    { code: 'BAZINEH_ROOD', label: 'بزینه رود', sortOrder: 80 },
    { code: 'ZANJAN_ROOD', label: 'زنجانرود', sortOrder: 90 },
    { code: 'AFSHAR', label: 'افشار', sortOrder: 100 },
    { code: 'SOJAS_ROOD', label: 'سجاسرود', sortOrder: 110 },
    { code: 'IJROOD', label: 'ایجرود', sortOrder: 120 },
    { code: 'MAHNESHAN', label: 'ماهنشان', sortOrder: 130 },
    { code: 'ANGOORAN', label: 'انگوران', sortOrder: 140 },
  ]);

  await seedLookupGroup('CENTER_TYPE', [
    { code: 'EXCEPTIONAL_SCHOOL', label: 'مدرسه استثنایی', sortOrder: 10 },
    { code: 'OFFICE', label: 'اداره', sortOrder: 20 },
    { code: 'REGULAR_SCHOOL', label: 'مدرسه عادی', sortOrder: 30 },
    {
      code: 'COMPREHENSIVE_CENTER',
      label: 'مرکز جامع سنجش و آموزش',
      sortOrder: 40,
    },
  ]);

  await seedLookupGroup('EDUCATION_LEVEL', [
    { code: 'PRE_SCHOOL', label: 'پیش دبستانی', sortOrder: 10 },
    { code: 'PRIMARY', label: 'ابتدایی', sortOrder: 20 },
    { code: 'FIRST_MIDDLE', label: 'متوسطه اول', sortOrder: 30 },
    { code: 'SECOND_MIDDLE', label: 'متوسطه دوم', sortOrder: 40 },
  ]);

  await seedLookupGroup('EMPLOYMENT_TYPE', [
    { code: 'OFFICIAL', label: 'رسمی', sortOrder: 10 },
    { code: 'CONTRACTUAL', label: 'پیمانی', sortOrder: 20 },
    { code: 'SERVICE_PURCHASE', label: 'خرید خدمات', sortOrder: 30 },
  ]);

  await seedLookupGroup('JOB_POSITION', [
    { code: 'HEAD_OF_OFFICE', label: 'رئیس اداره استثنایی', sortOrder: 10 },
    {
      code: 'SENIOR_EXPERT_EDUCATIONAL',
      label: 'کارشناس مسئول آموزشی',
      sortOrder: 30,
    },
    {
      code: 'SENIOR_EXPERT_REHAB',
      label: 'کارشناس مسئول توانبخشی',
      sortOrder: 30,
    },
    { code: 'EXPERT_FINANCIAL', label: 'کارشناس امور مالی', sortOrder: 40 },
    {
      code: 'EXPERT_HEARING',
      label: 'کارشناس آسیب‌دیده شنوایی',
      sortOrder: 40,
    },
    { code: 'EXPERT_VISUAL', label: 'کارشناس آسیب‌دیده بینایی', sortOrder: 40 },
    {
      code: 'EXPERT_INTELLECTUAL',
      label: 'کارشناس کم‌توان ذهنی',
      sortOrder: 40,
    },
    { code: 'MANAGER', label: 'مدیر مدرسه', sortOrder: 50 },
    { code: 'EDUCATIONAL_DEPUTY', label: 'معاون آموزشی', sortOrder: 60 },
    { code: 'SPEECH_THERAPIST', label: 'گفتاردرمانگر', sortOrder: 90 },
    { code: 'OCCUPATIONAL_THERAPIST', label: 'کاردرمانگر', sortOrder: 90 },
    { code: 'PRIMARY_TEACHER', label: 'آموزگار', sortOrder: 110 },
    { code: 'SUBJECT_TEACHER', label: 'دبیر', sortOrder: 110 },
    { code: 'SERVICE_STAFF', label: 'نیروی خدماتی', sortOrder: 140 },
  ]);

  await seedLookupGroup('EDUCATION_DEGREE', [
    { code: 'DIPLOMA_CYCLE', label: 'دیپلم', sortOrder: 40 },
    { code: 'ASSOCIATE', label: 'کاردانی', sortOrder: 60 },
    { code: 'BACHELOR', label: 'کارشناسی', sortOrder: 70 },
    { code: 'MASTER', label: 'کارشناسی ارشد', sortOrder: 80 },
  ]);

  await seedLookupGroup('MARITAL_STATUS', [
    { code: 'SINGLE', label: 'مجرد', sortOrder: 10 },
    { code: 'MARRIED', label: 'متأهل', sortOrder: 20 },
    { code: 'OTHER', label: 'سایر', sortOrder: 30 },
  ]);

  await seedLookupGroup('EMPLOYMENT_CATEGORY', [
    { code: 'TEACHING', label: 'آموزشی', sortOrder: 10 },
    { code: 'ADMINISTRATIVE', label: 'اداری', sortOrder: 20 },
    { code: 'SERVICE', label: 'خدماتی', sortOrder: 30 },
  ]);

  await seedLookupGroup('PHYSICAL_STATUS', [
    { code: 'HEALTHY', label: 'سالم', sortOrder: 10 },
    { code: 'DISABLED', label: 'معلول', sortOrder: 20 },
  ]);

  await seedLookupGroup('DISABILITY_TYPE', [
    { code: 'INTELLECTUAL', label: 'کم‌توان ذهنی', sortOrder: 10 },
    { code: 'HEARING', label: 'آسیب شنوایی', sortOrder: 20 },
    { code: 'VISUAL', label: 'آسیب بینایی', sortOrder: 30 },
    { code: 'PHYSICAL_MOTOR', label: 'جسمی-حرکتی', sortOrder: 40 },
    { code: 'AUTISM', label: 'اتیسم', sortOrder: 50 },
    { code: 'EMOTIONAL_BEHAVIORAL', label: 'هیجانی-رفتاری', sortOrder: 60 },
  ]);

  await seedLookupGroup('ASSISTIVE_DEVICE', [
    { code: 'HEARING_AID', label: 'سمعک', sortOrder: 10 },
    { code: 'WHEELCHAIR', label: 'ویلچر', sortOrder: 20 },
    { code: 'WALKER', label: 'واکر', sortOrder: 30 },
    { code: 'WHITE_CANE', label: 'عصای سفید', sortOrder: 40 },
    { code: 'COCHLEAR', label: 'کاشت حلزون', sortOrder: 50 },
  ]);

  await seedLookupGroup('SPEECH_DISORDER', [
    { code: 'STUTTERING', label: 'لکنت', sortOrder: 10 },
    { code: 'LISPING', label: 'نقص تلفظ', sortOrder: 20 },
    { code: 'APHASIA', label: 'آفازی', sortOrder: 30 },
  ]);

  await seedLookupGroup('FIELD_OF_STUDY', [
    { code: 'GENERAL', label: 'عمومی', sortOrder: 10 },
    { code: 'VOCATIONAL', label: 'حرفه‌ای', sortOrder: 20 },
  ]);

  await seedLookupGroup('BOOK_TYPE', [
    { code: 'STANDARD', label: 'استاندارد', sortOrder: 10 },
    { code: 'LARGE_PRINT', label: 'درشت‌خط', sortOrder: 20 },
    { code: 'BRAILLE', label: 'بریل', sortOrder: 30 },
  ]);
}

async function seedGradesForLevel(
  educationLevelCode: string,
  items: GradeSeed[],
) {
  const level = await prisma.lookupValue.findUniqueOrThrow({
    where: {
      groupKey_code: { groupKey: 'EDUCATION_LEVEL', code: educationLevelCode },
    },
  });
  for (const g of items) {
    await prisma.grade.upsert({
      where: {
        educationLevelId_code: { educationLevelId: level.id, code: g.code },
      },
      update: {
        label: g.label,
        sortOrder: g.sortOrder,
        track: g.track ?? 'NORMAL',
        branch: g.branch ?? 'NORMAL',
      },
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
  await seedGradesForLevel('PRE_SCHOOL', [
    { code: 'AGE_0_4', label: 'بدو تولد تا ۴ سال', sortOrder: 10 },
    { code: 'AGE_4_6', label: '۴ تا ۶ سال', sortOrder: 20 },
    {
      code: 'READINESS_BASIC',
      label: 'آمادگی مقدماتی',
      sortOrder: 30,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'READINESS_ADVANCED',
      label: 'آمادگی تکمیلی',
      sortOrder: 40,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'READINESS_SENSORY_MOTOR',
      label: 'آمادگی (حسی-حرکتی)',
      sortOrder: 50,
      track: 'SENSORY_MOTOR',
    },
  ]);

  await seedGradesForLevel('PRIMARY', [
    { code: 'FIRST_NORMAL', label: 'اول', sortOrder: 10 },
    {
      code: 'FIRST_1',
      label: 'اول ۱',
      sortOrder: 20,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'FIRST_2',
      label: 'اول ۲',
      sortOrder: 30,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'FIRST_3',
      label: 'اول ۳',
      sortOrder: 40,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'SECOND_1',
      label: 'دوم ۱',
      sortOrder: 50,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'SECOND_2',
      label: 'دوم ۲',
      sortOrder: 60,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'THIRD_1',
      label: 'سوم ۱',
      sortOrder: 70,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'THIRD_2',
      label: 'سوم ۲',
      sortOrder: 80,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'FOURTH_1',
      label: 'چهارم ۱',
      sortOrder: 90,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'FOURTH_2',
      label: 'چهارم ۲',
      sortOrder: 100,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'FIFTH_1',
      label: 'پنجم ۱',
      sortOrder: 110,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'FIFTH_2',
      label: 'پنجم ۲',
      sortOrder: 120,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'SIXTH_1',
      label: 'ششم ۱',
      sortOrder: 130,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'FIRST_SM',
      label: 'اول (حسی-حرکتی)',
      sortOrder: 20,
      track: 'SENSORY_MOTOR',
    },
    {
      code: 'SECOND_SM',
      label: 'دوم (حسی-حرکتی)',
      sortOrder: 30,
      track: 'SENSORY_MOTOR',
    },
    {
      code: 'THIRD_SM',
      label: 'سوم (حسی-حرکتی)',
      sortOrder: 40,
      track: 'SENSORY_MOTOR',
    },
    {
      code: 'FOURTH_SM',
      label: 'چهارم (حسی-حرکتی)',
      sortOrder: 50,
      track: 'SENSORY_MOTOR',
    },
    {
      code: 'FIFTH_SM',
      label: 'پنجم (حسی-حرکتی)',
      sortOrder: 60,
      track: 'SENSORY_MOTOR',
    },
    {
      code: 'SIXTH_SM',
      label: 'ششم (حسی-حرکتی)',
      sortOrder: 70,
      track: 'SENSORY_MOTOR',
    },
  ]);

  await seedGradesForLevel('FIRST_MIDDLE', [
    {
      code: 'SEVENTH_1',
      label: 'هفتم ۱',
      sortOrder: 10,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'SEVENTH_2',
      label: 'هفتم ۲',
      sortOrder: 20,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'EIGHTH_1',
      label: 'هشتم ۱',
      sortOrder: 30,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'NINTH_1',
      label: 'نهم ۱',
      sortOrder: 40,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'PRE_VOCATIONAL_1',
      label: 'پیش‌حرفه‌ای ۱',
      sortOrder: 50,
      branch: 'VOCATIONAL',
    },
    {
      code: 'PRE_VOCATIONAL_2',
      label: 'پیش‌حرفه‌ای ۲',
      sortOrder: 60,
      branch: 'VOCATIONAL',
    },
    {
      code: 'PRE_VOCATIONAL_3',
      label: 'پیش‌حرفه‌ای ۳',
      sortOrder: 70,
      branch: 'VOCATIONAL',
    },
    {
      code: 'SEVENTH_SM',
      label: 'هفتم (حسی-حرکتی)',
      sortOrder: 10,
      track: 'SENSORY_MOTOR',
    },
    {
      code: 'EIGHTH_SM',
      label: 'هشتم (حسی-حرکتی)',
      sortOrder: 20,
      track: 'SENSORY_MOTOR',
    },
    {
      code: 'NINTH_SM',
      label: 'نهم (حسی-حرکتی)',
      sortOrder: 30,
      track: 'SENSORY_MOTOR',
    },
  ]);

  await seedGradesForLevel('SECOND_MIDDLE', [
    {
      code: 'TENTH_1',
      label: 'دهم ۱',
      sortOrder: 10,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'ELEVENTH_1',
      label: 'یازدهم ۱',
      sortOrder: 20,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'TWELFTH_1',
      label: 'دوازدهم ۱',
      sortOrder: 30,
      track: 'INTELLECTUAL_AUTISM',
    },
    {
      code: 'VOCATIONAL_SPECIAL_1',
      label: 'کاردانش خاص ۱',
      sortOrder: 40,
      branch: 'VOCATIONAL',
    },
    {
      code: 'VOCATIONAL_SPECIAL_2',
      label: 'کاردانش خاص ۲',
      sortOrder: 50,
      branch: 'VOCATIONAL',
    },
    {
      code: 'VOCATIONAL_SPECIAL_3',
      label: 'کاردانش خاص ۳',
      sortOrder: 60,
      branch: 'VOCATIONAL',
    },
    {
      code: 'TENTH_SM',
      label: 'دهم (حسی-حرکتی)',
      sortOrder: 10,
      track: 'SENSORY_MOTOR',
    },
    {
      code: 'ELEVENTH_SM',
      label: 'یازدهم (حسی-حرکتی)',
      sortOrder: 20,
      track: 'SENSORY_MOTOR',
    },
  ]);
}

async function main() {
  console.log('🌱 شروع seed...\n');

  // ── سال تحصیلی ──────────────────────────────────────────
  const year = await prisma.academicYear.upsert({
    where: { id: 1 },
    update: {},
    create: {
      label: '1404-1405',
      startDate: new Date('2025-09-22'),
      endDate: new Date('2026-09-21'),
      isActive: true,
      isArchived: false,
    },
  });
  console.log('✅ سال تحصیلی:', year.label);

  // ── Lookups + Grades ────────────────────────────────────
  await seedLookups();
  await seedGrades();
  console.log('✅ مقادیر مرجع و پایه‌ها');

  // ── وضعیت‌ها ─────────────────────────────────────────────
  for (const s of [
    { code: 'ACTIVE', label: 'مشغول به خدمت', sortOrder: 1 },
    { code: 'MATERNITY_LEAVE', label: 'مرخصی بانوان', sortOrder: 2 },
    { code: 'RETIRED', label: 'بازنشسته', sortOrder: 8 },
  ]) {
    await prisma.personnelStatusType.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  for (const s of [
    { code: 'ENROLLED', label: 'ثبت‌نام شده', sortOrder: 1 },
    { code: 'TRANSFERRED', label: 'انتقالی', sortOrder: 2 },
    { code: 'GRADUATED', label: 'فارغ‌التحصیل', sortOrder: 3 },
    { code: 'DROPPED', label: 'ترک تحصیل', sortOrder: 4 },
  ]) {
    await prisma.studentStatusType.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  for (const s of [
    { code: 'ACTIVE', label: 'فعال', sortOrder: 1 },
    { code: 'CLOSED', label: 'تعطیل', sortOrder: 2 },
  ]) {
    await prisma.centerStatusType.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  console.log('✅ وضعیت‌ها');

  // ── lookupها که بعداً لازم داریم ────────────────────────
  const distZnj1 = await getLookup('DISTRICT', 'ZNJ1');
  const distZnj2 = await getLookup('DISTRICT', 'ZNJ2');
  const typeSchool = await getLookup('CENTER_TYPE', 'EXCEPTIONAL_SCHOOL');
  const typeOffice = await getLookup('CENTER_TYPE', 'OFFICE');
  const jobManager = await getLookup('JOB_POSITION', 'MANAGER');
  const jobTeacher = await getLookup('JOB_POSITION', 'PRIMARY_TEACHER');
  const jobTherapist = await getLookup('JOB_POSITION', 'SPEECH_THERAPIST');
  const jobOfficial = await getLookup('JOB_POSITION', 'HEAD_OF_OFFICE');
  const empOfficial = await getLookup('EMPLOYMENT_TYPE', 'OFFICIAL');
  const empContract = await getLookup('EMPLOYMENT_TYPE', 'CONTRACTUAL');
  const degBachelor = await getLookup('EDUCATION_DEGREE', 'BACHELOR');
  const disIntellect = await getLookup('DISABILITY_TYPE', 'INTELLECTUAL');
  const disHearing = await getLookup('DISABILITY_TYPE', 'HEARING');
  const disAutism = await getLookup('DISABILITY_TYPE', 'AUTISM');
  const disVisual = await getLookup('DISABILITY_TYPE', 'VISUAL');
  const disPhysical = await getLookup('DISABILITY_TYPE', 'PHYSICAL_MOTOR');
  const levelPrimary = await getLookup('EDUCATION_LEVEL', 'PRIMARY');
  const levelMiddle1 = await getLookup('EDUCATION_LEVEL', 'FIRST_MIDDLE');

  // پایه‌ها
  const grade1 = await prisma.grade.findFirstOrThrow({
    where: { code: 'FIRST_1' },
  });
  const grade2 = await prisma.grade.findFirstOrThrow({
    where: { code: 'SECOND_1' },
  });
  const grade3 = await prisma.grade.findFirstOrThrow({
    where: { code: 'THIRD_1' },
  });
  const grade1sm = await prisma.grade.findFirstOrThrow({
    where: { code: 'FIRST_SM' },
  });
  const grade7 = await prisma.grade.findFirstOrThrow({
    where: { code: 'SEVENTH_1' },
  });

  // ── سوپریوزرها ───────────────────────────────────────────
  const su1 = await prisma.user.upsert({
    where: { nationalCode: '0000000001' },
    update: {},
    create: {
      nationalCode: '0000000001',
      firstName: 'مدیر',
      lastName: 'سیستم',
      gender: Gender.MALE,
      userType: UserType.SUPERUSER,
      canLogin: true,
      passwordHash: await bcrypt.hash('Admin@1234', 10),
      isActive: true,
    },
  });
  const su2 = await prisma.user.upsert({
    where: { nationalCode: '0000000002' },
    update: {},
    create: {
      nationalCode: '0000000002',
      firstName: 'پشتیبان',
      lastName: 'سیستم',
      gender: Gender.FEMALE,
      userType: UserType.SUPERUSER,
      canLogin: true,
      passwordHash: await bcrypt.hash('Admin@5678', 10),
      isActive: true,
    },
  });
  console.log('✅ سوپریوزرها:', su1.firstName, '،', su2.firstName);

  // ────────────────────────────────────────────────────────
  // ── اداره استثنایی استان زنجان ───────────────────────────
  // ────────────────────────────────────────────────────────
  const office = await prisma.center.upsert({
    where: { organizationCode: 'ZNJ-OFFICE-001' },
    update: {},
    create: {
      name: 'اداره آموزش و پرورش استثنایی استان زنجان',
      code: 'OFFICE-001', // ← اضافه شد
      organizationCode: 'ZNJ-OFFICE-001',
      province: 'زنجان', // ← اضافه شد
      city: 'زنجان',
      address: 'زنجان، خیابان آزادی، اداره استثنایی استان',
      phone: '024-33445566',
      centerTypeId: typeOffice.id,
      districtId: distZnj1.id,
      isActive: true,
    },
  });
  console.log('✅ اداره:', office.name);

  // ── رئیس اداره (CENTER_MANAGER اداره) ───────────────────
  const officeManager = await prisma.user.upsert({
    where: { nationalCode: '3400100001' },
    update: {},
    create: {
      nationalCode: '3400100001',
      firstName: 'علیرضا',
      lastName: 'محمدی',
      gender: Gender.MALE,
      userType: UserType.CENTER_MANAGER,
      canLogin: true,
      passwordHash: await bcrypt.hash('Manager@1234', 10),
      isActive: true,
      jobPositionId: jobOfficial.id,
      employmentTypeId: empOfficial.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1358,
      birthMonth: 4,
      birthDay: 15,
      districtId: distZnj1.id,
      serviceRecordYears: 22,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      userId: officeManager.id,
      centerId: office.id,
      academicYearId: year.id,
      isPrimary: true,
    },
  });

  // ────────────────────────────────────────────────────────
  // ── مدرسه ۱: باغچه‌بان زنجان ─────────────────────────────
  // ────────────────────────────────────────────────────────
  const school1 = await prisma.center.upsert({
    where: { organizationCode: 'ZNJ-SCH-002' },
    update: {},
    create: {
      name: 'اتیسم طوبی',
      code: 'SCH-001', // ← اضافه شد
      organizationCode: 'ZNJ-SCH-001',
      province: 'زنجان', // ← اضافه شد
      city: 'زنجان',
      address: 'زنجان، خیابان امام خمینی، کوچه گلستان',
      phone: '024-33112233',
      centerTypeId: typeSchool.id,
      districtId: distZnj1.id,
      isActive: true,
    },
  });
  console.log('✅ مدرسه ۱:', school1.name);

  // مدیر مدرسه ۱
  const manager1 = await prisma.user.upsert({
    where: { nationalCode: '3400200001' },
    update: {},
    create: {
      nationalCode: '3400200001',
      firstName: 'فاطمه',
      lastName: 'رضایی',
      gender: Gender.FEMALE,
      userType: UserType.CENTER_MANAGER,
      canLogin: true,
      passwordHash: await bcrypt.hash('School1@1234', 10),
      isActive: true,
      jobPositionId: jobManager.id,
      employmentTypeId: empOfficial.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1365,
      birthMonth: 6,
      birthDay: 20,
      districtId: distZnj1.id,
      serviceRecordYears: 14,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 2 },
    update: {},
    create: {
      userId: manager1.id,
      centerId: school1.id,
      academicYearId: year.id,
      isPrimary: true,
    },
  });

  // آموزگار مدرسه ۱
  const teacher1 = await prisma.user.upsert({
    where: { nationalCode: '3400200002' },
    update: {},
    create: {
      nationalCode: '3400200002',
      firstName: 'محمد',
      lastName: 'حسینی',
      gender: Gender.MALE,
      userType: UserType.TEACHER,
      canLogin: false,
      isActive: true,
      jobPositionId: jobTeacher.id,
      employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1370,
      birthMonth: 2,
      birthDay: 10,
      districtId: distZnj1.id,
      serviceRecordYears: 5,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 3 },
    update: {},
    create: {
      userId: teacher1.id,
      centerId: school1.id,
      academicYearId: year.id,
      isPrimary: true,
    },
  });

  // گفتاردرمانگر مدرسه ۱
  const therapist1 = await prisma.user.upsert({
    where: { nationalCode: '3400200003' },
    update: {},
    create: {
      nationalCode: '3400200003',
      firstName: 'زهرا',
      lastName: 'کریمی',
      gender: Gender.FEMALE,
      userType: UserType.STAFF,
      canLogin: false,
      isActive: true,
      jobPositionId: jobTherapist.id,
      employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1372,
      birthMonth: 9,
      birthDay: 5,
      districtId: distZnj1.id,
      serviceRecordYears: 3,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 4 },
    update: {},
    create: {
      userId: therapist1.id,
      centerId: school1.id,
      academicYearId: year.id,
      isPrimary: true,
    },
  });

  console.log('✅ پرسنل مدرسه ۱: مدیر، آموزگار، گفتاردرمانگر');

  // ────────────────────────────────────────────────────────
  // ── مدرسه ۲: شهید چمران زنجان ────────────────────────────
  // ────────────────────────────────────────────────────────
  const school2 = await prisma.center.upsert({
    where: { organizationCode: 'ZNJ-SCH-002' },
    update: {},
    create: {
      name: 'رودکی',
      code: 'SCH-002', // ← اضافه شد
      organizationCode: 'ZNJ-SCH-002',
      province: 'زنجان', // ← اضافه شد
      city: 'زنجان',
      address: 'زنجان، ناحیه دو، بلوار شهید بهشتی',
      phone: '024-33998877',
      centerTypeId: typeSchool.id,
      districtId: distZnj2.id,
      isActive: true,
    },
  });
  console.log('✅ مدرسه ۲:', school2.name);

  // مدیر مدرسه ۲
  const manager2 = await prisma.user.upsert({
    where: { nationalCode: '3400300001' },
    update: {},
    create: {
      nationalCode: '3400300001',
      firstName: 'حسن',
      lastName: 'احمدی',
      gender: Gender.MALE,
      userType: UserType.CENTER_MANAGER,
      canLogin: true,
      passwordHash: await bcrypt.hash('School2@1234', 10),
      isActive: true,
      jobPositionId: jobManager.id,
      employmentTypeId: empOfficial.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1360,
      birthMonth: 11,
      birthDay: 3,
      districtId: distZnj2.id,
      serviceRecordYears: 18,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 5 },
    update: {},
    create: {
      userId: manager2.id,
      centerId: school2.id,
      academicYearId: year.id,
      isPrimary: true,
    },
  });

  // آموزگار مدرسه ۲
  const teacher2 = await prisma.user.upsert({
    where: { nationalCode: '3400300002' },
    update: {},
    create: {
      nationalCode: '3400300002',
      firstName: 'مریم',
      lastName: 'صادقی',
      gender: Gender.FEMALE,
      userType: UserType.TEACHER,
      canLogin: false,
      isActive: true,
      jobPositionId: jobTeacher.id,
      employmentTypeId: empContract.id,
      educationDegreeId: degBachelor.id,
      birthYearShamsi: 1368,
      birthMonth: 7,
      birthDay: 18,
      districtId: distZnj2.id,
      serviceRecordYears: 7,
    },
  });
  await prisma.userCenterAssignment.upsert({
    where: { id: 6 },
    update: {},
    create: {
      userId: teacher2.id,
      centerId: school2.id,
      academicYearId: year.id,
      isPrimary: true,
    },
  });

  console.log('✅ پرسنل مدرسه ۲: مدیر، آموزگار');

  // ────────────────────────────────────────────────────────
  // ── دانش‌آموزان مدرسه ۱ (۱۲ نفر) ────────────────────────
  // ────────────────────────────────────────────────────────
  const students1 = [
    {
      nc: '3410000001',
      fn: 'امیرعلی',
      ln: 'موسوی',
      g: Gender.MALE,
      grade: grade1,
      dis: [disIntellect.id],
      birth: [1397, 3, 5],
    },
    {
      nc: '3410000002',
      fn: 'سارا',
      ln: 'نجفی',
      g: Gender.FEMALE,
      grade: grade1,
      dis: [disIntellect.id],
      birth: [1397, 7, 12],
    },
    {
      nc: '3410000003',
      fn: 'علی',
      ln: 'قاسمی',
      g: Gender.MALE,
      grade: grade2,
      dis: [disIntellect.id],
      birth: [1396, 1, 20],
    },
    {
      nc: '3410000004',
      fn: 'نازنین',
      ln: 'ابراهیمی',
      g: Gender.FEMALE,
      grade: grade2,
      dis: [disIntellect.id, disAutism.id],
      birth: [1396, 5, 8],
    },
    {
      nc: '3410000005',
      fn: 'رضا',
      ln: 'شریفی',
      g: Gender.MALE,
      grade: grade3,
      dis: [disAutism.id],
      birth: [1395, 9, 15],
    },
    {
      nc: '3410000006',
      fn: 'فاطمه',
      ln: 'میرزایی',
      g: Gender.FEMALE,
      grade: grade3,
      dis: [disAutism.id],
      birth: [1395, 2, 22],
    },
    {
      nc: '3410000007',
      fn: 'محمدرضا',
      ln: 'علیزاده',
      g: Gender.MALE,
      grade: grade1sm,
      dis: [disHearing.id],
      birth: [1397, 6, 10],
    },
    {
      nc: '3410000008',
      fn: 'زینب',
      ln: 'محمدی',
      g: Gender.FEMALE,
      grade: grade1sm,
      dis: [disHearing.id],
      birth: [1397, 11, 3],
    },
    {
      nc: '3410000009',
      fn: 'پارسا',
      ln: 'رستمی',
      g: Gender.MALE,
      grade: grade1,
      dis: [disIntellect.id],
      birth: [1397, 4, 17],
    },
    {
      nc: '3410000010',
      fn: 'ریحانه',
      ln: 'حیدری',
      g: Gender.FEMALE,
      grade: grade2,
      dis: [disAutism.id],
      birth: [1396, 8, 29],
    },
    {
      nc: '3410000011',
      fn: 'کوروش',
      ln: 'صفری',
      g: Gender.MALE,
      grade: grade1sm,
      dis: [disPhysical.id],
      birth: [1397, 12, 1],
    },
    {
      nc: '3410000012',
      fn: 'مهسا',
      ln: 'جعفری',
      g: Gender.FEMALE,
      grade: grade3,
      dis: [disIntellect.id, disHearing.id],
      birth: [1395, 6, 14],
    },
  ];

  for (const s of students1) {
    const student = await prisma.student.upsert({
      where: { nationalCode: s.nc },
      update: {},
      create: {
        nationalCode: s.nc,
        firstName: s.fn,
        lastName: s.ln,
        gender: s.g,
        gradeId: s.grade.id,
        educationLevelId: levelPrimary.id,
        centerId: school1.id,
        districtId: distZnj1.id,
        birthYearShamsi: s.birth[0],
        birthMonth: s.birth[1],
        birthDay: s.birth[2],
        isActive: true,
      },
    });
    for (const disId of s.dis) {
      await prisma.studentDisability.upsert({
        where: {
          studentId_disabilityTypeId: {
            studentId: student.id,
            disabilityTypeId: disId,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          disabilityTypeId: disId,
          severity: DisabilitySeverity.MODERATE,
        },
      });
    }
  }
  console.log('✅ دانش‌آموزان مدرسه ۱: ۱۲ نفر');

  // ────────────────────────────────────────────────────────
  // ── دانش‌آموزان مدرسه ۲ (۱۰ نفر) ────────────────────────
  // ────────────────────────────────────────────────────────
  const students2 = [
    {
      nc: '3420000001',
      fn: 'آرین',
      ln: 'کمالی',
      g: Gender.MALE,
      grade: grade7,
      dis: [disIntellect.id],
      birth: [1390, 3, 8],
    },
    {
      nc: '3420000002',
      fn: 'نیلوفر',
      ln: 'رحیمی',
      g: Gender.FEMALE,
      grade: grade7,
      dis: [disIntellect.id],
      birth: [1390, 6, 25],
    },
    {
      nc: '3420000003',
      fn: 'سینا',
      ln: 'منصوری',
      g: Gender.MALE,
      grade: grade7,
      dis: [disAutism.id],
      birth: [1390, 1, 14],
    },
    {
      nc: '3420000004',
      fn: 'الناز',
      ln: 'کرمی',
      g: Gender.FEMALE,
      grade: grade7,
      dis: [disIntellect.id, disAutism.id],
      birth: [1390, 9, 3],
    },
    {
      nc: '3420000005',
      fn: 'بهرام',
      ln: 'نوروزی',
      g: Gender.MALE,
      grade: grade2,
      dis: [disHearing.id],
      birth: [1396, 4, 19],
    },
    {
      nc: '3420000006',
      fn: 'سحر',
      ln: 'اسماعیلی',
      g: Gender.FEMALE,
      grade: grade2,
      dis: [disVisual.id],
      birth: [1396, 7, 7],
    },
    {
      nc: '3420000007',
      fn: 'آرمان',
      ln: 'بهرامی',
      g: Gender.MALE,
      grade: grade1,
      dis: [disIntellect.id],
      birth: [1397, 2, 23],
    },
    {
      nc: '3420000008',
      fn: 'غزاله',
      ln: 'طاهری',
      g: Gender.FEMALE,
      grade: grade1,
      dis: [disIntellect.id],
      birth: [1397, 10, 11],
    },
    {
      nc: '3420000009',
      fn: 'داریوش',
      ln: 'فرهادی',
      g: Gender.MALE,
      grade: grade3,
      dis: [disPhysical.id],
      birth: [1395, 5, 30],
    },
    {
      nc: '3420000010',
      fn: 'شقایق',
      ln: 'مرادی',
      g: Gender.FEMALE,
      grade: grade3,
      dis: [disIntellect.id],
      birth: [1395, 8, 16],
    },
  ];

  for (const s of students2) {
    const student = await prisma.student.upsert({
      where: { nationalCode: s.nc },
      update: {},
      create: {
        nationalCode: s.nc,
        firstName: s.fn,
        lastName: s.ln,
        gender: s.g,
        gradeId: s.grade.id,
        educationLevelId: s.grade.code.startsWith('SEVENTH')
          ? levelMiddle1.id
          : levelPrimary.id,
        centerId: school2.id,
        districtId: distZnj2.id,
        birthYearShamsi: s.birth[0],
        birthMonth: s.birth[1],
        birthDay: s.birth[2],
        isActive: true,
      },
    });
    for (const disId of s.dis) {
      await prisma.studentDisability.upsert({
        where: {
          studentId_disabilityTypeId: {
            studentId: student.id,
            disabilityTypeId: disId,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          disabilityTypeId: disId,
          severity: DisabilitySeverity.MODERATE,
        },
      });
    }
  }
  console.log('✅ دانش‌آموزان مدرسه ۲: ۱۰ نفر');

  console.log('\n🎉 Seed با موفقیت انجام شد!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('سوپریوزر ۱:        کد ملی 0000000001 | رمز: Admin@1234');
  console.log('سوپریوزر ۲:        کد ملی 0000000002 | رمز: Admin@5678');
  console.log('رئیس اداره:        کد ملی 3400100001 | رمز: Manager@1234');
  console.log('مدیر مدرسه باغچه‌بان: کد ملی 3400200001 | رمز: School1@1234');
  console.log('مدیر مدرسه چمران:  کد ملی 3400300001 | رمز: School2@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
