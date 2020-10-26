import express, { Request, Response, ErrorRequestHandler } from "express";
import session from "express-session";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import { configuration, IConfig } from "./config";

import { connect } from "./database";
import usersRoutes from "./routes/users";
import loginRoute from "./routes/login";
import registerRoute from "./routes/register";
import logoutRoute from "./routes/logout";
import messagesRoute from "./routes/messages";

import connectMongo from 'connect-mongo';
import mongoose from "mongoose";
import { authenticationInitialize, authenticationSession } from "./controllers/authentication";
import { initializeSockets } from "./socket";
import { authenticationRequired } from "./middlewares/authenticationRequired";
import { getIceServersFactory } from "./routes/webrtc";
const MongoStore = connectMongo(session);
const sessionStore = new MongoStore({mongooseConnection: mongoose.connection});

export function createExpressApp(config: IConfig): express.Express {
  const { express_debug, session_cookie_name, session_secret } = config;

  const app = express();

  app.use(morgan("combined"));
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(session({
    name: session_cookie_name,
    secret: session_secret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore
  }));
  app.use(authenticationInitialize());
  app.use(authenticationSession());

  app.use(((err, _req, res, _next) => {
    console.error(err.stack);
    res.status?.(500).send(!express_debug ? "Oups" : err);
  }) as ErrorRequestHandler);

  app.get("/", (req: Request, res: Response) => {
    res.send("This is the boilerplate for Flint Messenger app, via CodeSpace");
  });
  app.use("/users", usersRoutes);
  app.use("/login", loginRoute);
  app.use("/register", registerRoute);
  app.use('/logout', logoutRoute);
  app.use('/messages', messagesRoute);
  app.use('/webrtc/ice-servers', authenticationRequired, getIceServersFactory(config));

  return app;
}

const config = configuration();
const { PORT } = config;
const app = createExpressApp(config);
connect(config).then(
  () => {
    const server = app.listen(PORT, () => console.log(`Flint messenger listening at ${PORT}`));
    initializeSockets(config, server, sessionStore);
  },
  (err) => console.error(`Was not able to connect to DB ${err}`)
);
