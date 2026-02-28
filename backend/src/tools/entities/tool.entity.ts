import { ApiProperty } from '@nestjs/swagger';
import { PaginatedMeta } from '../../common/entities/pagination.entity';

export class ToolParameterEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  toolId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  required: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ToolEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [ToolParameterEntity], required: false })
  parameters?: ToolParameterEntity[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedToolsEntity {
  @ApiProperty({ type: [ToolEntity] })
  data: ToolEntity[];

  @ApiProperty()
  meta: PaginatedMeta;
}
