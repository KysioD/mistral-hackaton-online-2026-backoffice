import { Module } from '@nestjs/common';
import { NpcsService } from './npcs.service';
import { NpcsController } from './npcs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VoiceModule } from '../voice/voice.module';

@Module({
  imports: [PrismaModule, VoiceModule],
  controllers: [NpcsController],
  providers: [NpcsService],
})
export class NpcsModule {}
