import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemPromptsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; content: string }) {
    return this.prisma.systemPrompt.create({
      data,
    });
  }

  async findAll(params: { skip?: number; take?: number }) {
    const { skip, take } = params;
    const [data, total] = await Promise.all([
      this.prisma.systemPrompt.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.systemPrompt.count(),
    ]);

    return {
      data,
      meta: {
        total,
        skip,
        take,
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

  async update(id: string, data: { name?: string; content?: string }) {
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
