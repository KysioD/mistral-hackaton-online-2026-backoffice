import { Module } from '@nestjs/common';
import { SystemPromptsService } from './system-prompts.service';
import { SystemPromptsController } from './system-prompts.controller';

@Module({
  controllers: [SystemPromptsController],
  providers: [SystemPromptsService],
})
export class SystemPromptsModule {}
