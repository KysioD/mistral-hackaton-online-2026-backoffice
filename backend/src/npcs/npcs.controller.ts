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
import { ApiTags } from '@nestjs/swagger';
import { NpcsService } from './npcs.service';
import { CreateNpcDto, UpdateNpcDto } from './dto/npc.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('NPCs')
@Controller('npcs')
export class NpcsController {
  constructor(private readonly npcsService: NpcsService) {}

  @Post()
  create(@Body() createNpcDto: CreateNpcDto) {
    return this.npcsService.create(createNpcDto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.npcsService.findAll(query.page, query.perPage, query.search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.npcsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNpcDto: UpdateNpcDto) {
    return this.npcsService.update(id, updateNpcDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.npcsService.remove(id);
  }
}
