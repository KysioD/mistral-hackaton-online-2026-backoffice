import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { CreateToolDto, UpdateToolDto } from './dto/tool.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Tools')
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  create(@Body() createToolDto: CreateToolDto) {
    return this.toolsService.create(createToolDto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.toolsService.findAll({
      page: query.page,
      perPage: query.perPage,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.toolsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateToolDto: UpdateToolDto) {
    return this.toolsService.update(id, updateToolDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.toolsService.remove(id);
  }
}
