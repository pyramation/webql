import express from 'express';
import { getGraphileSettings } from './graphile-settings';
import { postgraphile } from 'postgraphile';
import pg from 'pg';
import cors from 'cors';
import env from './env';
import LRU from 'lru-cache';

const app = express();

const rootPgPool = new pg.Pool({
  connectionString: env.DATABASE_URL
});

app.get('/healthz', (req, res) => {
  // could be checking db, etc..
  res.send('ok');
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (env.isProd && !env.APP_HOSTS.includes(origin)) {
        return callback(true, false);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

const cache = new LRU({
  max: 5,
  // dispose: function (key, postgraphileInstance) {
  //   console.log(`closing ${key}`);
  // },
  maxAge: 1000 * 60 * 60
});

app.use(async (req, res, next) => {
  if (req.subdomains.length > 0) {
    const key = req.subdomains.join('');
    // TODO get a better schemaName system
    const schemaName = key;
    if (cache.has(key)) {
      return cache.get(key)(req, res, next);
    }
    // TODO dont just join subdomain, do more auth/checking
    const opts = {
      ...getGraphileSettings({
        connection: env.DATABASE_URL,
        port: env.GRAPHQL_SERVER_PORT,
        host: env.GRAPHQL_SERVER_HOST,
        schema: schemaName
      }),
      graphqlRoute: '/graphql',
      graphiqlRoute: '/graphiql'
    };
    cache.set(key, postgraphile(rootPgPool, opts.schema, opts));
    return cache.get(key)(req, res, next);
  }
  return next();
});

app.use(async (req, res, next) => {
  if (req.subdomains.length > 0) {
    if (req.url === '/flush') {
      // TODO verify ownership and token
      const key = req.subdomains.join('');
      cache.del(key);
      return res.send(200);
    }
  }
  return next();
});

const defaultOptions = {
  ...getGraphileSettings({
    connection: env.DATABASE_URL,
    port: env.GRAPHQL_SERVER_PORT,
    host: env.GRAPHQL_SERVER_HOST,
    schema: env.GRAPHQL_SERVER_SCHEMAS
  }),
  graphqlRoute: '/graphql',
  graphiqlRoute: '/graphiql'
};

app.use(postgraphile(rootPgPool, defaultOptions.schema, defaultOptions));

export default () => {
  app.listen(env.GRAPHQL_SERVER_PORT, env.GRAPHQL_SERVER_HOST);
};
