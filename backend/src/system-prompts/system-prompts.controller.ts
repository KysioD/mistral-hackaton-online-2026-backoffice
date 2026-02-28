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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SystemPromptsService } from './system-prompts.service';
import {
  CreateSystemPromptDto,
  UpdateSystemPromptDto,
} from './dto/system-prompt.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  SystemPromptEntity,
  PaginatedSystemPromptsEntity,
} from './entities/system-prompt.entity';

@ApiTags('System Prompts')
@Controller('system-prompts')
export class SystemPromptsController {
  constructor(private readonly systemPromptsService: SystemPromptsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new system prompt' })
  @ApiResponse({
    status: 201,
    description: 'The system prompt has been successfully created.',
    type: SystemPromptEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createSystemPromptDto: CreateSystemPromptDto) {
    return this.systemPromptsService.create(createSystemPromptDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all system prompts with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Return all system prompts.',
    type: PaginatedSystemPromptsEntity,
  })
  findAll(@Query() query: PaginationDto) {
    return this.systemPromptsService.findAll({
      page: query.page,
      perPage: query.perPage,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific system prompt by ID' })
  @ApiParam({ name: 'id', description: 'System Prompt ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the system prompt.',
    type: SystemPromptEntity,
  })
  @ApiResponse({ status: 404, description: 'System prompt not found.' })
  findOne(@Param('id') id: string) {
    return this.systemPromptsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a system prompt by ID' })
  @ApiParam({ name: 'id', description: 'System Prompt ID' })
  @ApiResponse({
    status: 200,
    description: 'The system prompt has been successfully updated.',
    type: SystemPromptEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'System prompt not found.' })
  update(
    @Param('id') id: string,
    @Body() updateSystemPromptDto: UpdateSystemPromptDto,
  ) {
    return this.systemPromptsService.update(id, updateSystemPromptDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a system prompt by ID' })
  @ApiParam({ name: 'id', description: 'System Prompt ID' })
  @ApiResponse({
    status: 204,
    description: 'The system prompt has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'System prompt not found.' })
  remove(@Param('id') id: string) {
    return this.systemPromptsService.remove(id);
  }
}
