import { Module } from '@nestjs/common';
import { NpcsService } from './npcs.service';
import { NpcsController } from './npcs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NpcsController],
  providers: [NpcsService],
})
export class NpcsModule {}
