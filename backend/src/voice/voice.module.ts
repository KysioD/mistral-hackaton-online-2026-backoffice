import { Module } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { NpcAudioGateway } from './npc-audio.gateway';

@Module({
  providers: [ElevenLabsService, NpcAudioGateway],
  exports: [ElevenLabsService, NpcAudioGateway],
})
export class VoiceModule {}
