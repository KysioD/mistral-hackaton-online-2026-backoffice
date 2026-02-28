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
import { ToolsService } from './tools.service';
import { CreateToolDto, UpdateToolDto } from './dto/tool.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ToolEntity, PaginatedToolsEntity } from './entities/tool.entity';

@ApiTags('Tools')
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tool' })
  @ApiResponse({ status: 201, description: 'The tool has been successfully created.', type: ToolEntity })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Conflict. Tool name must be unique.' })
  create(@Body() createToolDto: CreateToolDto) {
    return this.toolsService.create(createToolDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tools with pagination' })
  @ApiResponse({ status: 200, description: 'Return all tools.', type: PaginatedToolsEntity })
  findAll(@Query() query: PaginationDto) {
    return this.toolsService.findAll({
      page: query.page,
      perPage: query.perPage,
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific tool by ID' })
  @ApiParam({ name: 'id', description: 'Tool ID' })
  @ApiResponse({ status: 200, description: 'Return the tool.', type: ToolEntity })
  @ApiResponse({ status: 404, description: 'Tool not found.' })
  findOne(@Param('id') id: string) {
    return this.toolsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tool by ID' })
  @ApiParam({ name: 'id', description: 'Tool ID' })
  @ApiResponse({ status: 200, description: 'The tool has been successfully updated.', type: ToolEntity })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Tool not found.' })
  @ApiResponse({ status: 409, description: 'Conflict. Tool name must be unique.' })
  update(@Param('id') id: string, @Body() updateToolDto: UpdateToolDto) {
    return this.toolsService.update(id, updateToolDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tool by ID' })
  @ApiParam({ name: 'id', description: 'Tool ID' })
  @ApiResponse({ status: 204, description: 'The tool has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Tool not found.' })
  remove(@Param('id') id: string) {
    return this.toolsService.remove(id);
  }
}

