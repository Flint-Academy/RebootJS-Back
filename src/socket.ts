import { Server as HTTPServer } from 'http';
import socketIO, { Server as SocketServer, Socket } from 'socket.io';
import passportSocketIo from 'passport.socketio';
import { IConfig } from './config';
import { Store } from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { User } from './models/users';

const actives = new Set<Socket>();
export let io: SocketServer;

const EVENTS_TO_FORWARD = [
  'call-peering-request',
  'call-peering-accepted',
  'call-peering-offer',
  'call-peering-answer',
  'call-peering-ice-candidate',
  'call-additional-peering-required',
  'call-left',
];

export function initializeSockets(config: IConfig, httpServer: HTTPServer, sessionStore: Store): SocketServer {
  const { session_cookie_name, session_secret } = config;
  io = socketIO(httpServer);
  io.use(
    passportSocketIo.authorize({
      key: session_cookie_name,
      secret: session_secret,
      store: sessionStore,
      passport: passport,
      cookieParser: cookieParser as any,
    }),
  );
  io.on('connection', (socket) => connect(socket));
  return io;
}

async function connect(socket: Socket): Promise<void> {
  const _id: string = (socket.request.user as any)._id;
  actives.add(socket);
  const user = await User.findById(_id);
  if (!user) {
    closeSocket(socket);
    return exitUserNotFound(_id);
  }
  user.socket = socket.id;
  user.status = 'available';
  await user.save();
  socket.on('disconnect', () => disconnect(socket, _id));
  EVENTS_TO_FORWARD.forEach((event) => socket.on(event, (data) => forward(socket, _id, event, data)));
  io.emit('user-update', user.getSafeProfile());
}

async function disconnect(socket: Socket, _id: string): Promise<void> {
  closeSocket(socket);
  const user = await User.findById(_id);
  if (!user) return exitUserNotFound(_id);
  delete user.socket;
  user.status = 'offline';
  await user.save();
  io.emit('user-update', user.getSafeProfile());
}

async function forward(socket: Socket, _id: string, event: string, data: any): Promise<void> {
  const { offer, answer, candidate, ...info } = data;
  console.log(`Event forwarded: ${event}`);
  console.log(info);
  const targetUser = await User.findById(data.target);
  if (!targetUser) return exitUserNotFound(data.target);
  const target = targetUser?.socket;
  if (!target) return exitUserOffline(targetUser._id);
  socket.to(target).emit(event, { ...data, emitter: _id });
}


function closeSocket(socket: Socket): void {
  socket.disconnect();
  actives.delete(socket);
}

function exitUserNotFound(id: string): void {
  console.log(`User not found: ${id}`);
}

function exitUserOffline(id: string){
  console.log(`User ${id} offline`);
}