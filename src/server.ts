import express, { Request, Response, ErrorRequestHandler } from 'express';
import morgan from "morgan";
import helmet from "helmet";
import { configuration, IConfig } from "./config";

import { model, Schema } from 'mongoose';
import { connect } from './database';


const userSchema = new Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true},
});

const User = model('User', userSchema);

export function createExpressApp(config: IConfig): express.Express {
  const { express_debug } = config;

  const app = express();

  app.use(morgan('combined'));
  app.use(helmet());
  app.use(express.json());

  app.use(((err, _req, res, _next) => {
    console.error(err.stack);
    res.status?.(500).send(!express_debug ? 'Oups' : err);
  }) as ErrorRequestHandler);

  app.get('/', (req: Request, res: Response) => { res.send('This is the boilerplate for Flint Messenger app') });
  app.get('/test', async (req: Request, res: Response) => {
    await new User({firstname: 'Thomas', lastname: 'Falcone'}).save();
    res.send('Done');
  })

  return app;
}

const config = configuration();
const { PORT } = config;
const app = createExpressApp(config);
connect(config).then(
  () => app.listen(PORT, () => console.log(`Flint messenger listening at ${PORT}`)),
  (err) => console.error(`Was not able to connect to DB ${err}`)
);
