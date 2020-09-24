import { Router, Request, Response } from 'express';
import * as messageController from '../controllers/messages';
import { authenticationRequired } from '../middlewares/authenticationRequired';
import { User } from '../models/users';
import { io } from '../socket';

export const router = Router();

router.post('/', authenticationRequired, async (req: Request, res: Response) => {
  const { conversationId, targets, content } = req.body
  if (!conversationId || !targets || !content) res.sendStatus(400);

  const message = await messageController.createMessage(
    req.user as any,
    conversationId,
    targets,
    content
  );

  res.send(message);

  await Promise.all(
    message.targets.map(async (target) => {
      const user = await User.findById(target);
      const socketId = user?.socket;
      if (socketId) {
        io.to(socketId).emit('chat-message', message.toJSON());
      }
    }),
  );
});

router.get('/:conversationId', authenticationRequired, async (req: Request, res: Response) => {
  if(!req.params['conversationId']) res.sendStatus(400);
  const conversationId = req.params['conversationId'];
  res.send(await messageController.getAllMessages(req.user as any, conversationId));
});

router.get('/', authenticationRequired, async (req: Request, res: Response) => {
  res.send(await messageController.getAllMessages(req.user as any))
})

export default router;