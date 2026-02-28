import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ToolsService } from './tools.service';

@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  create(@Body() createToolDto: { name: string; description: string }) {
    return this.toolsService.create(createToolDto);
  }

  @Get()
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.toolsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.toolsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateToolDto: { name?: string; description?: string }) {
    return this.toolsService.update(id, updateToolDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.toolsService.remove(id);
  }
}
