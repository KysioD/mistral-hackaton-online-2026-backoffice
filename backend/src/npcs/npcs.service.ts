import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNpcDto, UpdateNpcDto, TalkDto } from './dto/npc.dto';

@Injectable()
export class NpcsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNpcDto: CreateNpcDto) {
    const { toolNames, ...npcData } = createNpcDto;

    let validToolIds: string[] = [];

    if (toolNames && toolNames.length > 0) {
      const existingTools = await this.prisma.tool.findMany({
        where: { name: { in: toolNames } },
        select: { id: true, name: true },
      });

      const existingToolNames = existingTools.map((t) => t.name);
      validToolIds = existingTools.map((t) => t.id);

      const invalidToolNames = toolNames.filter(
        (name) => !existingToolNames.includes(name),
      );

      if (invalidToolNames.length > 0) {
        throw new BadRequestException(
          `Tools with names [${invalidToolNames.join(', ')}] do not exist`,
        );
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
        select: { id: true, name: true },
      });

      const existingToolNames = existingTools.map((t) => t.name);
      validToolIds = existingTools.map((t) => t.id);

      const invalidToolNames = toolNames.filter(
        (t) => !existingToolNames.includes(t),
      );

      if (invalidToolNames.length > 0) {
        throw new BadRequestException(
          `Tools with names [${invalidToolNames.join(', ')}] do not exist`,
        );
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

  async talk(id: string, talkDto: TalkDto) {
    const npc = await this.prisma.npc.findUniqueOrThrow({
      where: { id },
      include: {
        tools: {
          include: {
            tool: true,
          },
        },
      },
    });

    let sessionId = talkDto.sessionId;
    let history: any[] = [];

    if (!sessionId) {
      const session = await this.prisma.session.create({
        data: {
          npcId: id,
        },
      });
      sessionId = session.id;

      // Create system prompt message
      const activeSystemPrompt = await this.prisma.systemPrompt.findFirst({
        where: { active: true },
      });

      const systemPromptContent = `${activeSystemPrompt?.content || ''}\n\nCharacter Prompt:\n${npc.characterPrompt}`.trim();

      const systemMessage = await this.prisma.message.create({
        data: {
          sessionId,
          role: 'SYSTEM',
          content: systemPromptContent,
        },
      });
      history.push(systemMessage);
    } else {
      const existingSession = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { messages: true },
      });
      if (!existingSession || existingSession.npcId !== id) {
        throw new BadRequestException('Invalid session ID for this NPC');
      }
      history = existingSession.messages;
    }

    // Save the user message
    const userMessage = await this.prisma.message.create({
      data: {
        sessionId,
        role: 'USER',
        content: talkDto.message,
      },
    });

    history.push(userMessage);

    let suggestedAction: any = null;

    // Load available tools for the llm later
    const availableTools = npc.tools.map(t => t.tool);

    // We can simulate an action happening alongside speech
    // We always mock a suggested action if the NPC has tools for testing purposes.
    if (npc.tools && npc.tools.length > 0) {
      const randomNpcTool =
        npc.tools[Math.floor(Math.random() * npc.tools.length)];
      const randomTool = randomNpcTool.tool;
      suggestedAction = {
        tool: randomTool.name,
        parameters: {},
      };
    }

    const responseContent =
      `Hello! I am ${npc.firstName}. You said: "${talkDto.message}". ` +
      (suggestedAction ? 'I am also triggering an action.' : '');

    const assistantMessage = await this.prisma.message.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: responseContent,
        suggestedAction: suggestedAction ? suggestedAction : undefined,
      },
    });

    history.push(assistantMessage);

    // Update the session's endedAt timestamp
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    return {
      message: assistantMessage,
      sessionId,
      history,
    };
  }
}
