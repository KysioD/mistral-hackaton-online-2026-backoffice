import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';

export interface ElevenLabsSession {
  /** Push a text chunk into the TTS WebSocket; safe to call before WS is open. */
  sendText: (text: string) => void;
  /** Signal end of input and flush pending audio. */
  endText: () => void;
  /** Async iterable of mp3_44100_128 audio chunks. Ends when the WS closes. */
  audioChunks: AsyncIterable<Buffer>;
}

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);

  /**
   * Open an ElevenLabs WebSocket input-streaming TTS session.
   * Returns a session handle immediately — WS connection is established in the
   * background and text queued before the handshake completes is flushed on open.
   */
  createSession(voiceId: string): ElevenLabsSession {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    const url =
      `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input` +
      `?model_id=eleven_flash_v2_5&output_format=mp3_44100_128&optimize_streaming_latency=3`;

    const ws = new WebSocket(url) as WebSocket;

    // ── async-iterable queue ──────────────────────────────────────────────────
    // Queues chunks produced before the consumer calls next(), or holds a
    // pending resolve() when the consumer is waiting for the next chunk.
    const chunkQueue: (Buffer | null)[] = [];
    let pendingResolve: ((result: IteratorResult<Buffer>) => void) | null = null;
    let iteratorDone = false;

    const pushChunk = (chunk: Buffer | null) => {
      if (pendingResolve) {
        const resolve = pendingResolve;
        pendingResolve = null;
        if (chunk === null) {
          resolve({ value: undefined as any, done: true });
        } else {
          resolve({ value: chunk, done: false });
        }
      } else {
        chunkQueue.push(chunk);
      }
    };

    const signalEnd = () => {
      if (!iteratorDone) {
        iteratorDone = true;
        pushChunk(null);
      }
    };

    // ── text accumulation buffer ──────────────────────────────────────────────
    // ElevenLabs WS input streaming works best with full sentences rather than
    // individual tokens. We accumulate text and flush on sentence boundaries.
    const SENTENCE_END = /[.!?;:]\s*$/;
    const MIN_FLUSH_CHARS = 40; // also flush when buffer exceeds this length

    let textBuffer = '';
    let wsOpen = false;
    let endSignalled = false;

    const flushBuffer = (force = false) => {
      if (!textBuffer) return;
      if (force || SENTENCE_END.test(textBuffer) || textBuffer.length >= MIN_FLUSH_CHARS) {
        const payload = textBuffer;
        textBuffer = '';
        if (wsOpen) {
          // Trailing space is required by the ElevenLabs protocol
          ws.send(JSON.stringify({ text: payload + ' ', flush: true }));
        } else {
          preOpenTextBuffer.push(payload + ' ');
        }
      }
    };

    const preOpenTextBuffer: string[] = [];

    // ── WebSocket events ──────────────────────────────────────────────────────
    ws.on('open', () => {
      wsOpen = true;
      // Send the required init message with voice settings
      ws.send(
        JSON.stringify({
          text: ' ',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            use_speaker_boost: false,
          },
          xi_api_key: apiKey,
        }),
      );

      // Flush any text that arrived before the connection was ready
      for (const text of preOpenTextBuffer) {
        ws.send(JSON.stringify({ text, flush: true }));
      }
      preOpenTextBuffer.length = 0;

      if (endSignalled) {
        ws.send(JSON.stringify({ text: '', flush: true }));
      }
    });

    ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          audio?: string;
          isFinal?: boolean;
          is_final?: boolean;
          message?: string;
        };

        if (msg.audio) {
          pushChunk(Buffer.from(msg.audio, 'base64'));
        }

        if (msg.isFinal || msg.is_final) {
          // ElevenLabs signals no more audio; close the WS gracefully
          ws.close(1000);
          signalEnd();
        }

        if (msg.message) {
          // ElevenLabs can send informational messages (e.g. on errors)
          this.logger.warn(`ElevenLabs message: ${msg.message}`);
        }
      } catch (err) {
        this.logger.error('Failed to parse ElevenLabs WS message', err);
      }
    });

    ws.on('close', () => signalEnd());

    ws.on('error', (err) => {
      this.logger.error('ElevenLabs WS error', err);
      signalEnd();
    });

    // ── public API ────────────────────────────────────────────────────────────
    const sendText = (text: string) => {
      if (!text) return;
      textBuffer += text;
      flushBuffer(false);
    };

    const endText = () => {
      endSignalled = true;
      // Force-flush whatever is left in the buffer
      if (textBuffer) {
        const payload = textBuffer;
        textBuffer = '';
        if (wsOpen) {
          ws.send(JSON.stringify({ text: payload + ' ', flush: true }));
        } else {
          preOpenTextBuffer.push(payload + ' ');
        }
      }
      if (wsOpen) {
        ws.send(JSON.stringify({ text: '', flush: true }));
      }
    };

    const audioChunks: AsyncIterable<Buffer> = {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<Buffer>> {
            // Drain any buffered chunk immediately
            if (chunkQueue.length > 0) {
              const item = chunkQueue.shift()!;
              if (item === null) {
                return Promise.resolve({ value: undefined as any, done: true });
              }
              return Promise.resolve({ value: item, done: false });
            }

            if (iteratorDone) {
              return Promise.resolve({ value: undefined as any, done: true });
            }

            // Wait for the next chunk
            return new Promise<IteratorResult<Buffer>>((resolve) => {
              pendingResolve = resolve;
            });
          },
          return(): Promise<IteratorResult<Buffer>> {
            // Called when consumer breaks out of for-await early
            signalEnd();
            ws.terminate();
            return Promise.resolve({ value: undefined as any, done: true });
          },
        };
      },
    };

    return { sendText, endText, audioChunks };
  }
}
