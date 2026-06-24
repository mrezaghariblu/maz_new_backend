/* eslint-disable prettier/prettier */
// prisma/seed.ts
// ============================================================
// Seed اولیه: سوپریوزرها + انواع وضعیت + سال تحصیلی جاری
// اجرا: npm run db:seed
// ============================================================

import { PrismaClient, UserType, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type LookupSeed = { code: string; label: string; sortOrder: number };

async function seedLookupGroup(groupKey: string, items: LookupSeed[]) {
  for (const item of items) {
    await prisma.lookupValue.upsert({
      where: { groupKey_code: { groupKey, code: item.code } },
      update: { label: item.label, sortOrder: item.sortOrder },
      create: { groupKey, ...item },
    });
  }
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
    {
      code: 'COMPREHENSIVE_CENTER',
      label: 'مرکز جامع سنجش، آموزش، توانبخشی و مداخله بهنگام رشدی',
      sortOrder: 10,
    },
    { code: 'EXCEPTIONAL_SCHOOL', label: 'مدرسه استثنایی', sortOrder: 20 },
    { code: 'REGULAR_SCHOOL', label: 'مدرسه عادی', sortOrder: 30 },
    { code: 'OFFICE', label: 'اداره', sortOrder: 40 },
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

  // اولویت‌بندی پست سازمانی برای مرتب‌سازی لیست پرسنل (sortOrder)
  // پست‌های تخصصی اداره بعداً با جزئیات بیشتر اضافه می‌شوند —
  // فاصله‌ی ۱۰تایی عمدی است تا بشه بینشون رکورد جدید جا داد.
  await seedLookupGroup('JOB_POSITION', [
    { code: 'HEAD_OF_OFFICE', label: 'رئیس اداره استثنایی', sortOrder: 10 },
    { code: 'OFFICE_DEPUTY', label: 'معاون رئیس اداره استثنایی', sortOrder: 20 },
    { code: 'SENIOR_EXPERT', label: 'کارشناس مسئول آموزشی', sortOrder: 30 },
    { code: 'SENIOR_EXPERT', label: 'کارشناس مسئول توانبخشی', sortOrder: 30 },
    { code: 'EXPERT', label: 'کارشناس امور مالی', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس سنجش و ارزشیابی', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس دانش آموزان آسیب دیده بینایی', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس دانش آموزان آسیب دیده جسمی و حرکتی', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس دانش آموزان آسیب دیده شنوایی', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس دانش آموزان آسیب دیده کم توان ذهنی', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس امور پرورشی و تربیت بدنی', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس امور بهداشت', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس مشاوره', sortOrder: 40 },
    { code: 'EXPERT', label: 'کارشناس اختلالات یادگیری', sortOrder: 40 },
    { code: 'MANAGER', label: 'مدیر مدرسه', sortOrder: 50 },
    { code: 'TEACHING_MANAGER', label: 'مدیر آموزگار', sortOrder: 50 },
    { code: 'EDUCATIONAL_DEPUTY', label: 'معاون آموزشی', sortOrder: 60 },
    { code: 'EXECUTIVE_DEPUTY', label: 'معاون اجرایی', sortOrder: 60 },
    { code: 'EDUCATIONAL_SUPERVISOR', label: 'سرپرست آموزشی', sortOrder: 70 },
    { code: 'COUNSELOR', label: 'مشاور', sortOrder: 80 },
    { code: 'HEALTH_CARETAKER', label: 'مراقب سلامت', sortOrder: 90 },
    { code: 'SPEECH_THERAPIST', label: 'گفتاردرمانگر', sortOrder: 90 },
    { code: 'OCCUPATIONAL_THERAPIST', label: 'کاردرمانگر', sortOrder: 90 },
    { code: 'OCCUPATIONAL_THERAPIST', label: 'فیزیوتراپیست', sortOrder: 90 },
    { code: 'EDUCATIONAL_INSTRUCTOR', label: 'مربی پرورشی', sortOrder: 100 },
    { code: 'PRIMARY_TEACHER', label: 'آموزگار', sortOrder: 110 },
    { code: 'SUBJECT_TEACHER', label: 'دبیر', sortOrder: 110 },
    { code: 'VOCATIONAL_INSTRUCTOR', label: 'هنرآموز', sortOrder: 110 },
    { code: 'INCLUSION_LIAISON', label: 'رابط تلفیقی-فراگیر', sortOrder: 110 },
    { code: 'CARETAKER', label: 'سرایدار', sortOrder: 130 },
    { code: 'SERVICE_STAFF', label: 'نیروی خدماتی', sortOrder: 140 },
  ]);

  await seedLookupGroup('EDUCATION_DEGREE', [
    { code: 'ILLITERATE', label: 'بی سواد', sortOrder: 10 },
    { code: 'PRIMARY', label: 'ابتدایی', sortOrder: 20 },
    { code: 'GUIDANCE', label: 'راهنمایی', sortOrder: 30 },
    { code: 'DIPLOMA_CYCLE', label: 'سیکل دیپلم', sortOrder: 40 },
    { code: 'PRE_UNIVERSITY', label: 'پیش دانشگاهی', sortOrder: 50 },
    { code: 'ASSOCIATE', label: 'کاردانی', sortOrder: 60 },
    { code: 'BACHELOR', label: 'کارشناسی', sortOrder: 70 },
    { code: 'MASTER', label: 'کارشناسی ارشد', sortOrder: 80 },
    { code: 'DOCTORATE', label: 'دکترا', sortOrder: 90 },
  ]);

  await seedLookupGroup('MARITAL_STATUS', [
    { code: 'SINGLE', label: 'مجرد', sortOrder: 10 },
    { code: 'MARRIED', label: 'متاهل', sortOrder: 20 },
    { code: 'OTHER', label: 'سایر موارد', sortOrder: 20 },
  ]);

  await seedLookupGroup('EMPLOYMENT_CATEGORY', [
    { code: 'REGULAR', label: 'عادی', sortOrder: 10 },
    { code: 'EXCEPTIONAL', label: 'استثنایی', sortOrder: 20 },
  ]);

  await seedLookupGroup('PHYSICAL_STATUS', [
    { code: 'HEALTHY', label: 'سالم', sortOrder: 10 },
    { code: 'HAS_DISABILITY', label: 'دارای معلولیت', sortOrder: 20 },
  ]);

  // «چندمعلولیتی» اینجا مقدار جدا ندارد: وقتی بیش از یک رکورد در
  // UserDisability/StudentDisability برای یک نفر باشد، خودکار محاسبه می‌شود.
  await seedLookupGroup('DISABILITY_TYPE', [
    { code: 'PHYSICAL_MOTOR', label: 'جسمی-حرکتی', sortOrder: 10 },
    { code: 'VISUAL', label: 'بینایی', sortOrder: 20 },
    { code: 'HEARING', label: 'شنوایی', sortOrder: 30 },
    { code: 'INTELLECTUAL', label: 'کم توان ذهنی', sortOrder: 40 },
    { code: 'AUTISM', label: 'اوتیسم', sortOrder: 50 },
    { code: 'LEARNING_DISABILITY', label: 'ناتوانی یادگیری', sortOrder: 60 },
    { code: 'BEHAVIORAL_DISABILITY', label: 'اختلالات رفتاری', sortOrder: 70 },
    { code: 'OTHER', label: 'سایر', sortOrder: 80 },
  ]);

  console.log('✅ مقادیر مرجع (LookupValue) seed شدند');
}

async function main() {
  console.log('🌱 شروع seed...');

  // ─── سال تحصیلی ۱۴۰۳–۱۴۰۴ ────────────────────────────
  const currentYear = await prisma.academicYear.upsert({
    where: { id: 1 },
    update: {},
    create: {
      label: '1404-1405',
      startDate: new Date('2025-09-22'), // 1 مهر 1403
      endDate: new Date('2026-09-21'), // 31 شهریور 1404
      isActive: true,
      isArchived: false,
    },
  });
  console.log('✅ سال تحصیلی:', currentYear.label);

  // ─── سوپریوزر اول ────────────────────────────────────
  const hash1 = await bcrypt.hash('Admin@1234', 10);
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
      passwordHash: hash1,
      isActive: true,
    },
  });

  // ─── سوپریوزر دوم ────────────────────────────────────
  const hash2 = await bcrypt.hash('Admin@5678', 10);
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
      passwordHash: hash2,
      isActive: true,
    },
  });
  console.log('✅ سوپریوزرها:', su1.firstName, '،', su2.firstName);

  // ─── انواع وضعیت پرسنلی ──────────────────────────────
  const personnelStatuses = [
    { code: 'ACTIVE', label: 'مشغول به خدمت', sortOrder: 1 },
    { code: 'MATERNITY_LEAVE', label: 'مرخصی بانوان', sortOrder: 2 },
    { code: 'UNPAID_LEAVE', label: 'بدون حقوق', sortOrder: 3 },
    { code: 'MEDICAL_LEAVE', label: 'استعلاجی', sortOrder: 4 },
    { code: 'TEMP_TRANSFER', label: 'انتقال موقت', sortOrder: 5 },
    { code: 'MISSION', label: 'مأموریت', sortOrder: 6 },
    { code: 'DECEASED', label: 'فوت', sortOrder: 7 },
    { code: 'RETIRED', label: 'بازنشسته', sortOrder: 8 },
    { code: 'DISMISSED', label: 'اخراج', sortOrder: 9 },
    { code: 'RESIGNED', label: 'استعفا', sortOrder: 10 },
  ];

  for (const s of personnelStatuses) {
    await prisma.personnelStatusType.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
  console.log('✅ وضعیت‌های پرسنلی:', personnelStatuses.length, 'مورد');

  // ─── انواع وضعیت دانش‌آموزی ──────────────────────────
  const studentStatuses = [
    { code: 'ENROLLED', label: 'ثبت‌نام شده', sortOrder: 1 },
    { code: 'TRANSFERRED', label: 'انتقالی', sortOrder: 2 },
    { code: 'GRADUATED', label: 'فارغ‌التحصیل', sortOrder: 3 },
    { code: 'DROPPED', label: 'ترک تحصیل', sortOrder: 4 },
    { code: 'SUSPENDED', label: 'تعلیق', sortOrder: 5 },
  ];

  for (const s of studentStatuses) {
    await prisma.studentStatusType.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
  console.log('✅ وضعیت‌های دانش‌آموزی:', studentStatuses.length, 'مورد');

  // ─── انواع وضعیت مراکز ───────────────────────────────
  const centerStatuses = [
    { code: 'ACTIVE', label: 'فعال', sortOrder: 1 },
    { code: 'SUSPENDED', label: 'تعلیق', sortOrder: 2 },
    { code: 'CLOSED', label: 'تعطیل', sortOrder: 3 },
    { code: 'MERGED', label: 'ادغام', sortOrder: 4 },
  ];

  for (const s of centerStatuses) {
    await prisma.centerStatusType.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
  console.log('✅ وضعیت‌های مراکز:', centerStatuses.length, 'مورد');

  // ─── مقادیر مرجع (نواحی، پست‌ها، انواع معلولیت، ...) ─
  await seedLookups();

  console.log('\n🎉 Seed با موفقیت انجام شد!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('سوپریوزر ۱: کد ملی 0000000001 | رمز: Admin@1234');
  console.log('سوپریوزر ۲: کد ملی 0000000002 | رمز: Admin@5678');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
