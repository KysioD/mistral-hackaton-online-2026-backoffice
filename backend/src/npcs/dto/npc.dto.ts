import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNpcDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  prefab: string;

  @ApiProperty({ type: Number, format: 'float' })
  @Type(() => Number)
  @IsNumber()
  spawnX: number;

  @ApiProperty({ type: Number, format: 'float' })
  @Type(() => Number)
  @IsNumber()
  spawnY: number;

  @ApiProperty({ type: Number, format: 'float' })
  @Type(() => Number)
  @IsNumber()
  spawnZ: number;

  @ApiProperty({ type: Number, format: 'float' })
  @Type(() => Number)
  @IsNumber()
  spawnRotation: number;

  @IsString()
  characterPrompt: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolNames?: string[];
}

export class UpdateNpcDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  prefab?: string;

  @ApiProperty({ type: Number, format: 'float', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  spawnX?: number;

  @ApiProperty({ type: Number, format: 'float', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  spawnY?: number;

  @ApiProperty({ type: Number, format: 'float', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  spawnZ?: number;

  @ApiProperty({ type: Number, format: 'float', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  spawnRotation?: number;

  @IsString()
  @IsOptional()
  characterPrompt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolNames?: string[];
}
