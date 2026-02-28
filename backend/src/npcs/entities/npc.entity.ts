import { ApiProperty } from '@nestjs/swagger';
import { PaginatedMeta } from '../../common/entities/pagination.entity';
import { ToolEntity } from '../../tools/entities/tool.entity';

export class NpcToolEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  npcId: string;

  @ApiProperty()
  toolId: string;

  @ApiProperty({ type: () => ToolEntity })
  tool: ToolEntity;
}

export class NpcEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  prefab: string;

  @ApiProperty({ type: Number, format: 'float' })
  spawnX: number;

  @ApiProperty({ type: Number, format: 'float' })
  spawnY: number;

  @ApiProperty({ type: Number, format: 'float' })
  spawnZ: number;

  @ApiProperty({ type: Number, format: 'float' })
  spawnRotation: number;

  @ApiProperty()
  characterPrompt: string;

  @ApiProperty({ type: () => [NpcToolEntity], required: false })
  tools?: NpcToolEntity[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedNpcsEntity {
  @ApiProperty({ type: () => [NpcEntity] })
  data: NpcEntity[];

  @ApiProperty()
  meta: PaginatedMeta;
}
