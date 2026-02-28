import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNpcDto, UpdateNpcDto } from './dto/npc.dto';

@Injectable()
export class NpcsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNpcDto: CreateNpcDto) {
    const { toolNames, ...npcData } = createNpcDto;

    let validToolIds: string[] = [];

    if (toolNames && toolNames.length > 0) {
      const existingTools = await this.prisma.tool.findMany({
        where: { name: { in: toolNames } },
        select: { id: true, name: true }
      });
      
      const existingToolNames = existingTools.map(t => t.name);
      validToolIds = existingTools.map(t => t.id);
      
      const invalidToolNames = toolNames.filter(name => !existingToolNames.includes(name));
      
      if (invalidToolNames.length > 0) {
        throw new BadRequestException(`Tools with names [${invalidToolNames.join(', ')}] do not exist`);
      }
    }

    return this.prisma.npc.create({
      data: {
        ...npcData,
        ...(toolNames &&
          toolNames.length > 0 && {
            tools: {
              create: validToolIds.map((toolId) => ({ toolId })),
            },
          }),
      },
      include: {
        tools: {
          include: {
            tool: true,
          },
        },
      },
    });
  }

  async findAll(page: number = 1, perPage: number = 10, search?: string) {
    const skip = (page - 1) * perPage;

    const searchTerms = search ? search.trim().split(/\\s+/) : [];
    const whereClause =
      searchTerms.length > 0
        ? {
            AND: searchTerms.map((term) => ({
              OR: [
                { firstName: { contains: term, mode: 'insensitive' as const } },
                { lastName: { contains: term, mode: 'insensitive' as const } },
              ],
            })),
          }
        : {};

    const [data, total] = await Promise.all([
      this.prisma.npc.findMany({
        skip,
        take: perPage,
        where: whereClause,
        include: {
          tools: {
            include: {
              tool: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.npc.count({ where: whereClause }),
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
    return this.prisma.npc.findUniqueOrThrow({
      where: { id },
      include: {
        tools: {
          include: {
            tool: true,
          },
        },
      },
    });
  }

  async update(id: string, updateNpcDto: UpdateNpcDto) {
    const { toolNames, ...npcData } = updateNpcDto;

    let validToolIds: string[] = [];

    if (toolNames !== undefined && toolNames.length > 0) {
      const existingTools = await this.prisma.tool.findMany({
        where: { name: { in: toolNames } },
        select: { id: true, name: true }
      });
      
      const existingToolNames = existingTools.map(t => t.name);
      validToolIds = existingTools.map(t => t.id);
      
      const invalidToolNames = toolNames.filter(t => !existingToolNames.includes(t));
      
      if (invalidToolNames.length > 0) {
        throw new BadRequestException(`Tools with names [${invalidToolNames.join(', ')}] do not exist`);
      }
    }

    return this.prisma.$transaction(async (prisma) => {
      if (toolNames !== undefined) {
        // If toolNames is provided, we overwrite the tools
        // First delete existing tools
        await prisma.npcTool.deleteMany({ where: { npcId: id } });
      }

      return prisma.npc.update({
        where: { id },
        data: {
          ...npcData,
          ...(toolNames !== undefined &&
            toolNames.length > 0 && {
              tools: {
                create: validToolIds.map((toolId) => ({ toolId })),
              },
            }),
        },
        include: {
          tools: {
            include: {
              tool: true,
            },
          },
        },
      });
    });
  }

  async remove(id: string) {
    return this.prisma.npc.delete({
      where: { id },
    });
  }
}
