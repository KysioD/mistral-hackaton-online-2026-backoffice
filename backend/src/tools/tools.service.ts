import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateToolDto, UpdateToolDto } from './dto/tool.dto';

@Injectable()
export class ToolsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateToolDto) {
    const { parameters, ...toolData } = data;

    const existing = await this.prisma.tool.findUnique({
      where: { name: toolData.name },
    });
    if (existing) throw new ConflictException('Tool name must be unique');

    return this.prisma.tool.create({
      data: {
        ...toolData,
        parameters: parameters
          ? {
              create: parameters,
            }
          : undefined,
      },
      include: { parameters: true },
    });
  }

  async findAll(params: { page?: number; perPage?: number }) {
    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const skip = (page - 1) * perPage;

    const [data, total] = await Promise.all([
      this.prisma.tool.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: { parameters: true },
      }),
      this.prisma.tool.count(),
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
    const tool = await this.prisma.tool.findUnique({
      where: { id },
      include: { parameters: true },
    });
    if (!tool) throw new NotFoundException('Tool not found');
    return tool;
  }

  async update(id: string, data: UpdateToolDto) {
    const { parameters, ...toolData } = data;

    if (toolData.name) {
      const existing = await this.prisma.tool.findUnique({
        where: { name: toolData.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Tool name must be unique');
      }
    }

    return this.prisma.tool.update({
      where: { id },
      data: {
        ...toolData,
        parameters: parameters
          ? {
              deleteMany: {},
              create: parameters,
            }
          : undefined,
      },
      include: { parameters: true },
    });
  }

  async remove(id: string) {
    return this.prisma.tool.delete({
      where: { id },
    });
  }
}
