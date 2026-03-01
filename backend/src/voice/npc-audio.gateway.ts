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

  /** clientId → cleanup callbacks to invoke on disconnect */
  private disconnectCallbacks = new Map<string, Set<() => void>>();

  /** Register a callback to be called when the given client disconnects. */
  onClientDisconnect(clientId: string, callback: () => void): void {
    let cbs = this.disconnectCallbacks.get(clientId);
    if (!cbs) {
      cbs = new Set();
      this.disconnectCallbacks.set(clientId, cbs);
    }
    cbs.add(callback);
  }

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
      const cbs = this.disconnectCallbacks.get(clientId);
      if (cbs) {
        for (const cb of cbs) {
          try { cb(); } catch { /* ignore */ }
        }
        this.disconnectCallbacks.delete(clientId);
      }
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
