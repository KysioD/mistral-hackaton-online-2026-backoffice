import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { RealtimeService } from './realtime.service';

@WebSocketGateway(8080, { path: '/voxtral' }) // Opens WS at ws://localhost:8080/voxtral
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly realtimeService: RealtimeService) {}

  handleConnection(client: WebSocket) {
    // Establish Voxtral session — fire and forget, errors handled inside the service
    this.realtimeService.handleConnection(client).catch((err) => {
      console.error('Unhandled error in handleConnection', err);
    });

    // Accept raw binary frames (e.g. from Unity native clients)
    client.on('message', (data: any) => {
      if (Buffer.isBuffer(data)) {
        this.realtimeService.processAudio(client, data);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.realtimeService.handleDisconnect(client);
  }

  // Use this if Unity sends structured JSON messages: 
  // { "event": "audio_chunk", "data": <base64_string> }
  @SubscribeMessage('audio_chunk')
  handleAudioChunk(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: any,
  ) {
    this.realtimeService.processAudio(client, payload);
  }
}
