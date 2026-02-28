import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSystemPromptDto,
  UpdateSystemPromptDto,
} from './dto/system-prompt.dto';

@Injectable()
export class SystemPromptsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSystemPromptDto) {
    if (data.active) {
      return this.prisma.$transaction(async (tx) => {
        await tx.systemPrompt.updateMany({
          where: { active: true },
          data: { active: false },
        });
        return tx.systemPrompt.create({ data });
      });
    }

    return this.prisma.systemPrompt.create({
      data,
    });
  }

  async findAll(params: { page?: number; perPage?: number }) {
    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      this.prisma.systemPrompt.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.systemPrompt.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        lastPage: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string) {
    const prompt = await this.prisma.systemPrompt.findUnique({
      where: { id },
    });
    if (!prompt) throw new NotFoundException('System prompt not found');
    return prompt;
  }

  async update(id: string, data: UpdateSystemPromptDto) {
    if (data.active === false) {
      const current = await this.prisma.systemPrompt.findUnique({
        where: { id },
      });
      if (current?.active) {
        throw new BadRequestException(
          'Cannot deactivate the active system prompt. Please activate another one instead.',
        );
      }
    }

    if (data.active === true) {
      return this.prisma.$transaction(async (tx) => {
        await tx.systemPrompt.updateMany({
          where: { active: true, id: { not: id } },
          data: { active: false },
        });
        return tx.systemPrompt.update({
          where: { id },
          data,
        });
      });
    }

    return this.prisma.systemPrompt.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.systemPrompt.delete({
      where: { id },
    });
  }
}
