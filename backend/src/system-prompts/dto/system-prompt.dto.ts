import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateSystemPromptDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateSystemPromptDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
