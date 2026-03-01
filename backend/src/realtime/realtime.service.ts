import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import {
  RealtimeTranscription,
  RealtimeConnection,
  RealtimeEvent,
  AudioEncoding,
} from '@mistralai/mistralai/extra/realtime';
import { TranscriptionStreamTextDelta } from '@mistralai/mistralai/models/components/transcriptionstreamtextdelta';
import { TranscriptionStreamDone } from '@mistralai/mistralai/models/components/transcriptionstreamdone';

const VOXTRAL_MODEL = process.env.VOXTRAL_MODEL ?? 'voxtral-mini-transcribe-realtime-2602';

interface ClientState {
  connection: RealtimeConnection | null;
  connecting: boolean;
  audioChunkCount: number;
  pendingAudio: Uint8Array[];
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly realtimeClient: RealtimeTranscription;
  private clientStates: Map<WebSocket, ClientState> = new Map();

  constructor() {
    this.realtimeClient = new RealtimeTranscription({
      apiKey: process.env.MISTRAL_API_KEY || '',
    });
  }

  async handleConnection(client: WebSocket) {
    this.logger.log(`Client connected, establishing Voxtral session (model: ${VOXTRAL_MODEL})...`);

    const state: ClientState = { connection: null, connecting: true, audioChunkCount: 0, pendingAudio: [] };
    this.clientStates.set(client, state);

    // Log the WebSocket close code/reason to understand why the client disconnected
    client.once('close', (code: number, reason: Buffer) => {
      this.logger.warn(`WS client closed — code: ${code}, reason: "${reason.toString() || '(none)'}"`);
    });

    try {
      const connection = await this.realtimeClient.connect(VOXTRAL_MODEL, {
        audioFormat: {
          encoding: AudioEncoding.PcmS16le,
          sampleRate: 16000,
        },
      });

      state.connection = connection;
      state.connecting = false;

      // Flush any audio that arrived before the session was ready
      if (state.pendingAudio.length > 0) {
        this.logger.log(`Flushing ${state.pendingAudio.length} queued audio chunk(s) to Voxtral`);
        for (const chunk of state.pendingAudio) {
          await connection.sendAudio(chunk).catch((err) =>
            this.logger.error(`Error flushing queued audio: ${(err as any)?.message ?? err}`),
          );
        }
        state.pendingAudio = [];
      }

      this.logger.log('Voxtral session established. Ready for audio.');
      client.send(JSON.stringify({ event: 'session_ready', data: {} }));

      // Pump events from Mistral → client in the background
      this.pumpEvents(client, connection);
    } catch (err) {
      this.logger.error('Failed to connect to Voxtral', err);
      state.connecting = false;
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'error', data: { message: 'Failed to connect to Voxtral' } }));
      }
    }
  }

  private async pumpEvents(client: WebSocket, connection: RealtimeConnection) {
    try {
      for await (const event of connection) {
        if (client.readyState !== WebSocket.OPEN) break;
        this.handleVoxtralEvent(client, event);
      }
      this.logger.log('Voxtral event stream ended normally (connection closed)');
    } catch (err) {
      this.logger.error(`Error in Voxtral event stream: ${(err as any)?.message ?? err}`);
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event: 'error', data: { message: 'Voxtral stream error' } }));
      }
    }
  }

  private handleVoxtralEvent(client: WebSocket, event: RealtimeEvent) {
    const type = (event as any).type as string | undefined;

    if (type === 'transcription.text.delta') {
      const delta = event as TranscriptionStreamTextDelta;
      client.send(JSON.stringify({
        event: 'text_response',
        data: { text: delta.text, isFinal: false },
      }));
    } else if (type === 'transcription.done') {
      const done = event as TranscriptionStreamDone;
      client.send(JSON.stringify({
        event: 'text_response',
        data: { text: done.text, isFinal: true, language: done.language },
      }));
    } else if (type === 'transcription.language') {
      this.logger.debug(`Detected language: ${(event as any).language}`);
    }
    // session.created / session.updated are handled internally by the SDK
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Client disconnected, closing Voxtral session');
    const state = this.clientStates.get(client);
    if (state?.connection) {
      state.connection.close().catch(() => {});
    }
    this.clientStates.delete(client);
  }

  async processAudio(client: WebSocket, payload: Buffer | string | Uint8Array) {
    const state = this.clientStates.get(client);

    if (!state) return;

    if (!state.connection) {
      // Queue audio until the Voxtral session is established
      if (state.connecting) {
        state.pendingAudio.push(
          Buffer.isBuffer(payload)
            ? new Uint8Array(payload)
            : typeof payload === 'string'
            ? new Uint8Array(Buffer.from(payload, 'base64'))
            : payload,
        );
        if (state.pendingAudio.length === 1) {
          this.logger.debug('Voxtral session not ready yet — buffering audio until connected');
        }
      } else {
        this.logger.warn('Audio received but Voxtral session is gone (connection failed)');
      }
      return;
    }

    try {
      let audioBytes: Uint8Array;

      if (Buffer.isBuffer(payload)) {
        audioBytes = new Uint8Array(payload);
      } else if (typeof payload === 'string') {
        // Base64-encoded audio from JSON clients
        audioBytes = new Uint8Array(Buffer.from(payload, 'base64'));
      } else {
        audioBytes = payload;
      }

      // Log first chunk and every 100th to avoid flooding
      state.audioChunkCount++;
      if (state.audioChunkCount === 1) {
        this.logger.debug(`First audio chunk received — ${audioBytes.byteLength} bytes`);
      } else if (state.audioChunkCount % 100 === 0) {
        this.logger.debug(`Audio chunk #${state.audioChunkCount} — ${audioBytes.byteLength} bytes`);
      }

      await state.connection.sendAudio(audioBytes);
    } catch (err) {
      this.logger.error(`Error forwarding audio to Voxtral: ${(err as any)?.message ?? err}`);
    }
  }
}
