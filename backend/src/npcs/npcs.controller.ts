import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NpcsService } from './npcs.service';
import { CreateNpcDto, UpdateNpcDto } from './dto/npc.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { NpcEntity, PaginatedNpcsEntity } from './entities/npc.entity';

@ApiTags('NPCs')
@Controller('npcs')
export class NpcsController {
  constructor(private readonly npcsService: NpcsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new NPC' })
  @ApiResponse({ status: 201, description: 'The NPC has been successfully created.', type: NpcEntity })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createNpcDto: CreateNpcDto) {
    return this.npcsService.create(createNpcDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all NPCs with pagination' })
  @ApiResponse({ status: 200, description: 'Return all NPCs.', type: PaginatedNpcsEntity })
  findAll(@Query() query: PaginationDto) {
    return this.npcsService.findAll(query.page, query.perPage, query.search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific NPC by ID' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: 'Return the NPC.', type: NpcEntity })
  @ApiResponse({ status: 404, description: 'NPC not found.' })
  findOne(@Param('id') id: string) {
    return this.npcsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an NPC by ID' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: 'The NPC has been successfully updated.', type: NpcEntity })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'NPC not found.' })
  update(@Param('id') id: string, @Body() updateNpcDto: UpdateNpcDto) {
    return this.npcsService.update(id, updateNpcDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an NPC by ID' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 204, description: 'The NPC has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'NPC not found.' })
  remove(@Param('id') id: string) {
    return this.npcsService.remove(id);
  }
}

