import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ToolsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; description: string }) {
    return this.prisma.tool.create({
      data,
    });
  }

  async findAll(params: { skip?: number; take?: number }) {
    const { skip, take } = params;
    const [data, total] = await Promise.all([
      this.prisma.tool.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tool.count(),
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
    const tool = await this.prisma.tool.findUnique({
      where: { id },
    });
    if (!tool) throw new NotFoundException('Tool not found');
    return tool;
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.tool.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.tool.delete({
      where: { id },
    });
  }
}
