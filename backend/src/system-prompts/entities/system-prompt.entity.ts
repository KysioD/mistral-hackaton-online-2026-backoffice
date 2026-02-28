import { ApiProperty } from '@nestjs/swagger';
import { PaginatedMeta } from '../../common/entities/pagination.entity';

export class SystemPromptEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedSystemPromptsEntity {
  @ApiProperty({ type: [SystemPromptEntity] })
  data: SystemPromptEntity[];

  @ApiProperty()
  meta: PaginatedMeta;
}
