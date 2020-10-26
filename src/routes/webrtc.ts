import { Request, Response, NextFunction, Handler } from 'express';
import twilio from 'twilio';
import { IConfig } from '../config';

export function getIceServersFactory(config: IConfig): Handler {
  const { twilio_auth_sid, twilio_auth_token } = config;
  const client = twilio(twilio_auth_sid, twilio_auth_token);

  return async (_: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const iceServersConfig = await client.tokens.create();
      res.json(iceServersConfig);
    } catch (error) {
      next(error);
    }
  };
}
