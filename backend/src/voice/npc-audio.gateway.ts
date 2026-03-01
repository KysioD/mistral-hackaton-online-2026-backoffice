import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

@WebSocketGateway(8080, { path: '/npc-audio' })
export class NpcAudioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NpcAudioGateway.name);

  /** clientId → WebSocket */
  private clients = new Map<string, WebSocket>();

  handleConnection(client: WebSocket) {
    const clientId = randomUUID();
    (client as any).__clientId = clientId;
    this.clients.set(clientId, client);
    this.logger.log(`NPC audio client connected: ${clientId}`);
    client.send(JSON.stringify({ event: 'connected', clientId }));
  }

  handleDisconnect(client: WebSocket) {
    const clientId = (client as any).__clientId as string | undefined;
    if (clientId) {
      this.clients.delete(clientId);
      this.logger.log(`NPC audio client disconnected: ${clientId}`);
    }
  }

  /** Returns true if the frame was sent, false if the client is gone. */
  sendAudio(clientId: string, chunk: Buffer): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.readyState !== WebSocket.OPEN) {
      this.logger.warn(`sendAudio: client ${clientId} not found or closed (map size: ${this.clients.size})`);
      return false;
    }
    client.send(
      JSON.stringify({
        type: 'audio',
        content: chunk.toString('base64'),
        format: 'mp3',
      }),
    );
    this.logger.debug(`sendAudio: sent ${chunk.byteLength}b to ${clientId}`);
    return true;
  }

  hasClient(clientId: string): boolean {
    const c = this.clients.get(clientId);
    const ok = !!c && c.readyState === WebSocket.OPEN;
    this.logger.debug(`hasClient(${clientId}): ${ok}  (map size: ${this.clients.size})`);
    return ok;
  }
}
