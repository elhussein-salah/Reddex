import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProfileLookupModule } from 'src/common/services/profile-lookup.module';

@Module({
  imports: [PrismaModule, ProfileLookupModule],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
