import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

let io: SocketIOServer | null = null;

export async function initializeSocketServer(httpServer: HTTPServer): Promise<SocketIOServer> {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [env.FRONTEND_URL, 'http://159.65.154.5:3025', 'http://159.65.154.5', 'http://localhost:3025', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Setup Redis adapter for multi-instance support if available
  try {
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const Redis = (await import('ioredis')).default;
    const pubClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null,
    });
    pubClient.on('error', (err) => logger.debug('Socket.IO Redis pubClient error', { error: err.message }));

    const subClient = pubClient.duplicate();
    subClient.on('error', (err) => logger.debug('Socket.IO Redis subClient error', { error: err.message }));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter initialized');
  } catch (err) {
    logger.warn('Socket.IO Redis adapter not active, using default memory adapter', { error: (err as Error).message });
  }

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token = (socket.handshake.auth.token as string | undefined)
      ?? socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return next(new Error('Invalid or expired token'));
    }

    (socket as Socket & { userId: string; roleName: string }).userId = payload.userId;
    (socket as Socket & { userId: string; roleName: string }).roleName = payload.roleName;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as Socket & { userId: string; roleName: string };
    logger.debug('Socket connected', { socketId: socket.id, userId: authSocket.userId });

    // Join user-specific room
    socket.join(`user:${authSocket.userId}`);

    // Join role-specific room
    socket.join(`role:${authSocket.roleName}`);

    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { socketId: socket.id, userId: authSocket.userId, reason });
    });

    // Handle notification read acknowledgment
    socket.on('notification:read', (notificationId: string) => {
      logger.debug('Notification read ack', { notificationId, userId: authSocket.userId });
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}

export function getSocketServer(): SocketIOServer {
  if (!io) throw new Error('Socket.IO server not initialized');
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToRole(roleName: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`role:${roleName}`).emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  if (!io) return;
  io.emit(event, data);
}
