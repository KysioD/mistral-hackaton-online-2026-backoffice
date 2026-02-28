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
import { SystemPromptsService } from './system-prompts.service';
import {
  CreateSystemPromptDto,
  UpdateSystemPromptDto,
} from './dto/system-prompt.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('System Prompts')
@Controller('system-prompts')
export class SystemPromptsController {
  constructor(private readonly systemPromptsService: SystemPromptsService) {}

  @Post()
  create(@Body() createSystemPromptDto: CreateSystemPromptDto) {
    return this.systemPromptsService.create(createSystemPromptDto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.systemPromptsService.findAll({
      page: query.page,
      perPage: query.perPage,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.systemPromptsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSystemPromptDto: UpdateSystemPromptDto,
  ) {
    return this.systemPromptsService.update(id, updateSystemPromptDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.systemPromptsService.remove(id);
  }
}
