import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNpcDto, UpdateNpcDto, TalkDto } from './dto/npc.dto';
import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import * as crypto from 'crypto';
import { ElevenLabsService } from '../voice/elevenlabs.service';
import { NpcAudioGateway } from '../voice/npc-audio.gateway';

@Injectable()
export class NpcsService {
  private readonly logger = new Logger(NpcsService.name);
  private embeddings = new MistralAIEmbeddings({
    model: 'mistral-embed',
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly elevenLabs: ElevenLabsService,
    private readonly npcAudio: NpcAudioGateway,
  ) {}

  async create(createNpcDto: CreateNpcDto) {
    const { toolNames, conversationExamples, ...npcData } = createNpcDto;

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

    const createdNpc = await this.prisma.npc.create({
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

    if (conversationExamples && conversationExamples.length > 0) {
      await this._handleConversationExamples(createdNpc.id, conversationExamples);
    }

    return createdNpc;
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
        conversationExamples: {
          select: { id: true, messages: true }
        }
      },
    });
  }

  async update(id: string, updateNpcDto: UpdateNpcDto) {
    const { toolNames, conversationExamples, ...npcData } = updateNpcDto;

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

    const result = await this.prisma.$transaction(async (prisma) => {
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

    if (conversationExamples !== undefined) {
      await this._handleConversationExamples(id, conversationExamples);
    }

    return result;
  }

  private async _handleConversationExamples(npcId: string, examples: any[], replace: boolean = true) {
    if (replace) {
      await this.prisma.conversationExample.deleteMany({ where: { npcId } });
    }
    
    if (!examples || examples.length === 0) return;

    for (const example of examples) {
      // Create embedding of the whole example to capture full context
      const exampleText = typeof example === 'string' ? example : JSON.stringify(example);
      const vector = await this.embeddings.embedQuery(exampleText);
      const vectorString = `[${vector.join(',')}]`;
      const id = crypto.randomUUID();
      
      await this.prisma.$executeRaw`
        INSERT INTO "ConversationExample" ("id", "npcId", "messages", "embedding", "updatedAt")
        VALUES (${id}, ${npcId}, ${JSON.stringify(example)}::jsonb, ${vectorString}::vector, NOW())
      `;
    }
  }

  async getExamples(npcId: string, page: number = 1, perPage: number = 20) {
    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      this.prisma.conversationExample.findMany({
        where: { npcId },
        select: { id: true, messages: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.conversationExample.count({ where: { npcId } }),
    ]);
    return {
      data,
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) || 1 },
    };
  }

  async addExamples(npcId: string, examples: any[]) {
    // Verify NPC exists
    await this.prisma.npc.findUniqueOrThrow({ where: { id: npcId } });
    if (!examples || examples.length === 0) return { added: 0 };
    // Normalize: frontend sends [{messages:[...]}, ...] but storage expects [[msg,...], ...]
    const normalized = examples.map((ex: any) =>
      ex && typeof ex === 'object' && Array.isArray(ex.messages) ? ex.messages : ex
    );
    await this._handleConversationExamples(npcId, normalized, false);
    return { added: normalized.length };
  }

  async deleteExample(npcId: string, exampleId: string) {
    return this.prisma.conversationExample.delete({
      where: { id: exampleId, npcId },
    });
  }

  async clearExamples(npcId: string) {
    await this.prisma.conversationExample.deleteMany({ where: { npcId } });
  }

  async remove(id: string) {
    return this.prisma.npc.delete({
      where: { id },
    });
  }

  async talk(id: string, talkDto: TalkDto, res?: any, voice?: boolean) {
    const npc = await this.prisma.npc.findUniqueOrThrow({
      where: { id },
      include: {
        tools: {
          include: {
            tool: {
              include: {
                parameters: true,
              },
            },
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
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!existingSession || existingSession.npcId !== id) {
        throw new BadRequestException('Invalid session ID for this NPC');
      }
      if (existingSession.endedAt) {
        throw new BadRequestException('Session is already closed');
      }
      history = existingSession.messages;
    }

    let inferredToolCallId: string | undefined = undefined;

    if (talkDto.toolName) {
      // Find the last ASSISTANT message without mutating the original history
      const lastAssistantMsg = [...history].reverse().find(msg => msg.role === 'ASSISTANT');
      
      // Extract the toolCallId matching the provided toolName from toolCalls
      if (lastAssistantMsg?.toolCalls) {
        const calls = lastAssistantMsg.toolCalls as any[];
        const matchingCall = calls.find(c => c.name === talkDto.toolName);
        if (matchingCall) {
          inferredToolCallId = matchingCall.id; 
        }
      }
    }

    const messageRole = inferredToolCallId ? 'TOOL' : 'USER';
    const messageContent = typeof talkDto.message === 'string' ? talkDto.message : JSON.stringify(talkDto.message);

    // Save the user message or tool result
    const userMessage = await this.prisma.message.create({
      data: {
        sessionId,
        role: messageRole,
        content: messageContent,
        toolCallId: inferredToolCallId || undefined,
      },
    });

    history.push(userMessage);

    // Load available tools for the llm later
    const availableTools = npc.tools.map(t => t.tool);

    const mistralTools = availableTools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description || "",
        parameters: {
          type: 'object',
          properties: (t.parameters || []).reduce((acc: any, param) => {
            acc[param.name] = {
              type: 'string', // Assuming strings
              description: param.description || "",
            };
            return acc;
          }, {} as any),
          required: (t.parameters || []).filter((p) => p.required).map((p) => p.name),
        },
      },
    }));

    mistralTools.push({
      type: 'function',
      function: {
        name: 'close_conversation',
        description: 'MANDATORY: You MUST call this tool immediately whenever the user says goodbye, says thank you, indicates they are leaving, or ends the conversation. This is the ONLY way to end a conversation.',
        parameters: {
          type: 'object',
          properties: {
            farewell_message: {
              type: 'string',
              description: 'The polite goodbye message to say to the user before ending the conversation.',
            }
          },
          required: ['farewell_message'],
        },
      },
    });

    let model = new ChatMistralAI({
      model: process.env.LLM_MODEL || 'ministral-8b-latest',
      temperature: 0.7,
    });

    // Bind tools if there are any
    if (mistralTools.length > 0) {
      model = model.bindTools(mistralTools) as any;
    }

    const recentMessagesText = history.slice(-5)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    let topExamples: any[] = [];
    if (recentMessagesText.trim()) {
      const queryVector = await this.embeddings.embedQuery(recentMessagesText);
      const queryVectorString = `[${queryVector.join(',')}]`;
      
      topExamples = await this.prisma.$queryRaw`
        SELECT id, messages
        FROM "ConversationExample"
        WHERE "npcId" = ${id}
        ORDER BY "embedding" <=> ${queryVectorString}::vector
        LIMIT 3
      ` as any[];
    }

    const lcMessages: any[] = history.map((msg, index) => {
      if (msg.role === 'SYSTEM') {
        let fullSystemPrompt = msg.content;
        if (topExamples.length > 0) {
          fullSystemPrompt += '\n\n--- Past conversation examples for reference ---\n';
          topExamples.forEach((ex, i) => {
            fullSystemPrompt += `\nExample ${i + 1}:\n`;
            try {
              // try to parse or format the messages nicely
              const msgs = typeof ex.messages === 'string' ? JSON.parse(ex.messages) : ex.messages;
              fullSystemPrompt += JSON.stringify(msgs, null, 2);
            } catch (e) {
              fullSystemPrompt += JSON.stringify(ex.messages);
            }
            fullSystemPrompt += '\n';
          });
        }
        return new SystemMessage(fullSystemPrompt);
      }
      if (msg.role === 'USER') {
        let content = msg.content;
        // Inject a prompt reminder to the very last user message
        if (index === history.length - 1) {
          content += "\n\n[SYSTEM REMINDER: If this message indicates a goodbye, a thank you, or concluding the conversation, you MUST immediately call the `close_conversation` tool. Do not just reply with text.]";
        }
        return new HumanMessage(content);
      }
      if (msg.role === 'ASSISTANT') {
        const mc = new AIMessage({
          content: msg.content,
          tool_calls: (msg.toolCalls as any) || [],
        });
        return mc;
      }
      if (msg.role === 'TOOL') {
        return new ToolMessage({
          content: msg.content,
          tool_call_id: msg.toolCallId,
        });
      }
      return new HumanMessage(msg.content); // fallback
    });

    const stream = await model.stream(lcMessages);

    // ── ElevenLabs TTS setup ─────────────────────────────────────────────────
    const effectiveVoiceId: string | undefined =
      (npc as any).voiceId ?? process.env.ELEVENLABS_VOICE_ID;
    const ttsEnabled =
      voice === true &&
      !!process.env.ELEVENLABS_API_KEY &&
      !!effectiveVoiceId;

    this.logger.debug(`ttsEnabled=${ttsEnabled}  clientId=${talkDto.clientId ?? '(none)'}`);

    let ttsSession: ReturnType<ElevenLabsService['createSession']> | null = null;
    let audioListenerDone: Promise<void> = Promise.resolve();

    if (ttsEnabled) {
      try {
        ttsSession = this.elevenLabs.createSession(effectiveVoiceId!);

        // Concurrently drain audio chunks and deliver them:
        //  - over the dedicated WS connection if the caller supplied a clientId
        //  - over the HTTP response as a fallback (e.g. test_voice.py)
        const wsClientId = talkDto.clientId;
        audioListenerDone = (async () => {
          try {
            for await (const audioChunk of ttsSession!.audioChunks) {
              if (wsClientId && this.npcAudio.hasClient(wsClientId)) {
                this.npcAudio.sendAudio(wsClientId, audioChunk);
              } else if (res) {
                res.write(
                  JSON.stringify({
                    type: 'audio',
                    content: audioChunk.toString('base64'),
                    format: 'mp3',
                  }) + '\n',
                );
              }
            }
          } catch (err) {
            this.logger.error('Error draining ElevenLabs audio stream', err);
          }
        })();
      } catch (err) {
        this.logger.error('Failed to create ElevenLabs session, skipping TTS', err);
        ttsSession = null;
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    let finalMsg: any = null;
    let responseContent = "";
    let isClosing = false;

    for await (const chunk of stream) {
      if (!finalMsg) {
        finalMsg = chunk;
      } else {
        finalMsg = finalMsg.concat(chunk);
      }
      
      if (chunk.content) {
        responseContent += chunk.content;
        if (res) {
          res.write(JSON.stringify({ type: 'text', content: chunk.content }) + '\n');
        }
        // Forward text to TTS (tool call chunks have no content here)
        ttsSession?.sendText(String(chunk.content));
      }

      // Intercept tool calls in the stream using finalMsg.tool_calls to ensure we have the full name
      if (!isClosing && finalMsg && finalMsg.tool_calls && finalMsg.tool_calls.length > 0) {
        const hasClose = finalMsg.tool_calls.some((tc: any) => tc.name === 'close_conversation');
        if (hasClose) {
          isClosing = true;
          if (res) {
            res.write(JSON.stringify({ type: 'close' }) + '\n');
          }
        }
      }
    }

    let finalToolCalls = finalMsg?.tool_calls || [];
    if (finalToolCalls.length > 0) {
      finalToolCalls = finalToolCalls.filter((tc: any) => {
        if (tc.name === 'close_conversation') {
          isClosing = true;
          if (tc.args && tc.args.farewell_message) {
            responseContent += (responseContent ? "\n" : "") + tc.args.farewell_message;
            if (res) {
              res.write(JSON.stringify({ type: 'text', content: tc.args.farewell_message }) + '\n');
            }
            // Farewell message is spoken aloud
            ttsSession?.sendText(tc.args.farewell_message);
          }
          return false; // Remove this internal tool from being sent/handled
        }
        return true;
      });

      if (res && finalToolCalls.length > 0) {
        for (const tc of finalToolCalls) {
          res.write(JSON.stringify({ 
            type: 'tool_call', 
            id: tc.id,
            toolName: tc.name,
            parameters: tc.args
          }) + '\n');
        }
      }
    }

    // Signal end of text to ElevenLabs and wait for all audio to be written
    if (ttsSession) {
      ttsSession.endText();
      await audioListenerDone;
    }

    const assistantMessage = await this.prisma.message.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: responseContent,
        toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
      },
    });

    history.push(assistantMessage);

    if (isClosing) {
      // Update the session's endedAt timestamp
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { endedAt: new Date() },
      });
    }

    if (res) {
      res.write(JSON.stringify({ type: 'done', sessionId, message: assistantMessage, closed: isClosing }) + '\n');
    }

    return {
      message: assistantMessage,
      sessionId,
      history,
      closed: isClosing,
    };
  }
}
