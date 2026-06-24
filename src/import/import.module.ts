import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { StudentsModule } from '../students/students.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    StudentsModule,
    UsersModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
