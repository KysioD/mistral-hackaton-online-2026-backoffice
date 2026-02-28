import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SystemPromptsService } from './system-prompts.service';

@Controller('system-prompts')
export class SystemPromptsController {
  constructor(private readonly systemPromptsService: SystemPromptsService) {}

  @Post()
  create(@Body() createSystemPromptDto: { name: string; content: string }) {
    return this.systemPromptsService.create(createSystemPromptDto);
  }

  @Get()
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.systemPromptsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.systemPromptsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSystemPromptDto: { name?: string; content?: string }) {
    return this.systemPromptsService.update(id, updateSystemPromptDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.systemPromptsService.remove(id);
  }
}
