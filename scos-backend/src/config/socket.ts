import type { Server } from 'socket.io';

let socketServer: Server | null = null;

export function setSocketServer(io: Server): void {
  socketServer = io;
}

export function getSocketServer(): Server | null {
  return socketServer;
}
