import { Module } from '@nestjs/common';
import { SmartClassController } from './smart-class.controller';
import { SmartClassService } from './smart-class.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SmartClassController],
  providers: [SmartClassService],
})
export class SmartClassModule {}
