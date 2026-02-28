import { ApiProperty } from '@nestjs/swagger';

export class PaginatedMeta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  perPage: number;

  @ApiProperty()
  lastPage: number;
}
