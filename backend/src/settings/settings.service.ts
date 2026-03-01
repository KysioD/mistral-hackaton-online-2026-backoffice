import { Injectable, Logger } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export interface AppSettings {
  MISTRAL_API_KEY: string;
  LLM_MODEL: string;
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_VOICE_ID: string;
  VOXTRAL_MODEL: string;
}

export class UpdateSettingsDto implements Partial<AppSettings> {
  @IsOptional()
  @IsString()
  MISTRAL_API_KEY?: string;

  @IsOptional()
  @IsString()
  LLM_MODEL?: string;

  @IsOptional()
  @IsString()
  ELEVENLABS_API_KEY?: string;

  @IsOptional()
  @IsString()
  ELEVENLABS_VOICE_ID?: string;

  @IsOptional()
  @IsString()
  VOXTRAL_MODEL?: string;
}

const MANAGED_KEYS: (keyof AppSettings)[] = [
  'MISTRAL_API_KEY',
  'LLM_MODEL',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID',
  'VOXTRAL_MODEL',
];

const SECRET_KEYS: (keyof AppSettings)[] = ['MISTRAL_API_KEY', 'ELEVENLABS_API_KEY'];
export const MASK = '••••••••';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<AppSettings> {
    const rows = await this.prisma.setting.findMany();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = Object.fromEntries(rows.map((r: any) => [r.key, r.value])) as Partial<AppSettings>;
    const result = {} as AppSettings;
    for (const key of MANAGED_KEYS) {
      const value = db[key] ?? process.env[key] ?? '';
      if (SECRET_KEYS.includes(key)) {
        result[key] = value ? MASK : '';
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<AppSettings> {
    for (const key of MANAGED_KEYS) {
      const incoming = dto[key];
      if (incoming === undefined) continue;
      if (SECRET_KEYS.includes(key) && incoming === MASK) continue;
      await this.prisma.setting.upsert({
        where: { key },
        create: { key, value: incoming },
        update: { value: incoming },
      });
      process.env[key] = incoming;
      this.logger.log('Setting updated: ' + key);
    }
    return this.getSettings();
  }
}
