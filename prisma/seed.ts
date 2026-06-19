// prisma/seed.ts
// ============================================================
// Seed اولیه: سوپریوزرها + انواع وضعیت + سال تحصیلی جاری
// اجرا: npm run db:seed
// ============================================================

import { PrismaClient, UserType, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 شروع seed...');

  // ─── سال تحصیلی ۱۴۰۳–۱۴۰۴ ────────────────────────────
  const currentYear = await prisma.academicYear.upsert({
    where: { id: 1 },
    update: {},
    create: {
      label: '1403-1404',
      startDate: new Date('2024-09-22'), // 1 مهر 1403
      endDate: new Date('2025-09-21'), // 31 شهریور 1404
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
