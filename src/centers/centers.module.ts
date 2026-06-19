import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { CentersController } from './centers.controller';
import { CentersService } from './centers.service';

@Module({
  imports: [CommonModule],
  controllers: [CentersController],
  providers: [CentersService],
  exports: [CentersService],
})
export class CentersModule {}
