import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ToolsModule } from './tools/tools.module';
import { SystemPromptsModule } from './system-prompts/system-prompts.module';
import { NpcsModule } from './npcs/npcs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ToolsModule,
    SystemPromptsModule,
    NpcsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
