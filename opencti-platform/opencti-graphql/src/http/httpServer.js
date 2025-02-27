import https from 'node:https';
import http from 'node:http';
import { graphqlUploadExpress } from 'graphql-upload';
import { readFileSync } from 'node:fs';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import nconf from 'nconf';
import express from 'express';
import conf, { basePath, booleanConf, logApp } from '../config/conf';
import createApp from './httpPlatform';
import createApolloServer from '../graphql/graphql';
import { isStrategyActivated, STRATEGY_CERT } from '../config/providers';
import { applicationSession, initializeSession } from '../database/session';
import { checkSystemDependencies } from '../initialization';
import { getSettings } from '../domain/settings';

const PORT = conf.get('app:port');
const REQ_TIMEOUT = conf.get('app:request_timeout');
const CERT_KEY_PATH = conf.get('app:https_cert:key');
const CERT_KEY_CERT = conf.get('app:https_cert:crt');
const CA_CERTS = conf.get('app:https_cert:ca');
const rejectUnauthorized = booleanConf('app:https_cert:reject_unauthorized', true);

const onHealthCheck = () => checkSystemDependencies().then(() => getSettings());

const createHttpServer = async () => {
  const app = express();
  const appSessionHandler = initializeSession();
  app.use(appSessionHandler.session);
  const { schema, apolloServer } = createApolloServer();
  let httpServer;
  if (CERT_KEY_PATH && CERT_KEY_CERT) {
    const key = readFileSync(CERT_KEY_PATH);
    const cert = readFileSync(CERT_KEY_CERT);
    const ca = CA_CERTS.map((path) => readFileSync(path));
    const requestCert = isStrategyActivated(STRATEGY_CERT);
    httpServer = https.createServer({ key, cert, requestCert, rejectUnauthorized, ca }, app);
  } else {
    httpServer = http.createServer(app);
  }
  httpServer.setTimeout(REQ_TIMEOUT || 120000);
  // subscriptionServer
  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      async onConnect(connectionParams, webSocket) {
        const wsSession = await new Promise((resolve) => {
          // use same session parser as normal gql queries
          const { session } = applicationSession();
          session(webSocket.upgradeReq, {}, () => {
            if (webSocket.upgradeReq.session) {
              resolve(webSocket.upgradeReq.session);
            }
            return false;
          });
        });
        // We have a good session. attach to context
        if (wsSession.user) {
          return { user: wsSession.user };
        }
        throw new Error('User must be authenticated');
      },
    },
    {
      server: httpServer,
      path: apolloServer.graphqlPath,
    }
  );
  apolloServer.plugins.push({
    async serverWillStart() {
      return {
        async drainServer() {
          subscriptionServer.close();
        },
      };
    },
  });
  await apolloServer.start();
  const requestSizeLimit = nconf.get('app:max_payload_body_size') || '10mb';
  app.use(graphqlUploadExpress());
  apolloServer.applyMiddleware({
    app,
    cors: true,
    bodyParserConfig: {
      limit: requestSizeLimit,
    },
    onHealthCheck,
    path: `${basePath}/graphql`,
  });
  const { seeMiddleware } = await createApp(app);
  return { httpServer, seeMiddleware };
};

const listenServer = async () => {
  return new Promise((resolve, reject) => {
    try {
      const serverPromise = createHttpServer();
      serverPromise.then(({ httpServer, seeMiddleware }) => {
        httpServer.on('close', () => {
          seeMiddleware.shutdown();
        });
        httpServer.listen(PORT, () => {
          resolve(httpServer);
        });
      });
    } catch (e) {
      logApp.error(`[OPENCTI] API start fail`, { error: e });
      reject(e);
    }
  });
};

const stopServer = async (httpServer) => {
  return new Promise((resolve) => {
    httpServer.close(() => {
      resolve();
    });
    httpServer.emit('close'); // force server close
  });
};

const initHttpServer = () => {
  let server;
  return {
    start: async () => {
      server = await listenServer();
      // Handle hot module replacement resource dispose
      if (module.hot) {
        module.hot.dispose(async () => {
          await stopServer(server);
        });
      }
    },
    shutdown: async () => {
      if (server) {
        await stopServer(server);
      }
    },
  };
};
const httpServer = initHttpServer();

export default httpServer;
