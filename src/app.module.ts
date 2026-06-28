import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CentersModule } from './centers/centers.module';
import { ClassesModule } from './classes/classes.module';
import { CommonModule } from './common/common.module';
import { GradesModule } from './grades/grades.module';
import { ImportModule } from './import/import.module';
import { LookupsModule } from './lookups/lookups.module';
import { PrismaModule } from './prisma/prisma.module';
import { StatusModule } from './status/status.module';
import { StudentsModule } from './students/students.module';
import { UsersModule } from './users/users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SmartClassModule } from './smart-class/smart-class.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    AcademicYearsModule,
    AuditModule,
    CentersModule,
    ClassesModule,
    GradesModule,
    ImportModule,
    LookupsModule,
    StatusModule,
    StudentsModule,
    UsersModule,
    AnalyticsModule,
    SmartClassModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
