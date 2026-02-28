import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ToolParameterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean;
}

export class CreateToolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolParameterDto)
  @IsOptional()
  parameters?: ToolParameterDto[];
}

export class UpdateToolDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToolParameterDto)
  @IsOptional()
  parameters?: ToolParameterDto[];
}
