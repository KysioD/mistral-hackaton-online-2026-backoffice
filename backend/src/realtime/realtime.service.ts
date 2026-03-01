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

    const state: ClientState = { connection: null, connecting: true };
    this.clientStates.set(client, state);

    try {
      const connection = await this.realtimeClient.connect(VOXTRAL_MODEL, {
        audioFormat: {
          encoding: AudioEncoding.PcmS16le,
          sampleRate: 16000,
        },
      });

      state.connection = connection;
      state.connecting = false;

      this.logger.log('Voxtral session established');
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
    } catch (err) {
      this.logger.error('Error in Voxtral event stream', err);
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

    if (!state?.connection) {
      this.logger.warn('Audio received but Voxtral session not ready yet');
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

      await state.connection.sendAudio(audioBytes);
    } catch (err) {
      this.logger.error('Error forwarding audio to Voxtral', err);
    }
  }
}
