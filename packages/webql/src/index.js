import express from 'express';
import { getGraphileSettings } from './settings';
import { postgraphile } from 'postgraphile';
import pg from 'pg';
import cors from 'cors';
import env from './env';
import LRU from 'lru-cache';

const cache = new LRU({
  max: 5,
  dispose: function (key, obj) {
    console.log(`closing ${key}`);
    console.log('closing connection...');
    obj.pgPool.end();
  },
  maxAge: 1000 * 60 * 60
});

const pgCache = new LRU({
  max: 3,
  dispose: function (key, pgPool) {
    console.log(`closing ${key}`);
    console.log('closing connection...');
    pgPool.end();
  },
  maxAge: 1000 * 60 * 60
});

const getDbString = (db) =>
  `postgres://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${db}`;

const getRootPgPool = (dbName) => {
  let pgPool;
  if (cache.has(dbName)) {
    pgPool = cache.get(dbName);
  } else {
    pgPool = new pg.Pool({
      connectionString: getDbString(dbName)
    });
    cache.set(dbName, pgPool);
  }
  return pgPool;
};

const getGraphileInstanceObj = (dbName, schemaName) => {
  const key = [dbName, schemaName].join('');

  if (cache.has(key)) {
    return cache.get(key);
  }
  const opts = {
    ...getGraphileSettings({
      connection: getDbString(dbName),
      port: env.SERVER_PORT,
      host: env.SERVER_HOST,
      schema: schemaName
    }),
    graphqlRoute: '/graphql',
    graphiqlRoute: '/graphiql'
  };

  const pgPool = new pg.Pool({
    connectionString: getDbString(dbName)
  });

  const obj = {
    pgPool,
    handler: postgraphile(pgPool, opts.schema, opts)
  };

  cache.set(key, obj);
  return obj;
};

export default () => {
  const app = express();

  const rootPgPool = new pg.Pool({
    connectionString: getDbString('postgres')
  });

  if (env.SERVER_HOST === 'localhost') {
    app.set('subdomain offset', 1);
  }

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

  process.on('SIGTERM', () => {
    console.log("SIGTERM rec'd");
    cache.reset();
    pgCache.reset();
    rootPgPool.end();
  });

  app.use(async (req, res, next) => {
    if (req.subdomains.length == 1) {
      const [dbName] = req.subdomains;
      const pgPool = getRootPgPool(dbName);

      const results = await pgPool.query(`
      SELECT s.nspname AS table_schema
      FROM pg_catalog.pg_namespace s;
      `);
      return res.send(
        `<style>html { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" }</style><h1>Schemas in ${dbName}</h1><hr />` +
          results.rows
            .map((d) => [
              d,
              `${req.protocol}://${d.table_schema}.${req.hostname}:${env.SERVER_PORT}/graphiql`
            ])
            .map(([d, url]) => {
              return `<a href="${url}" />${d.table_schema}</a><br />`;
            })
            .join('\n')
      );
    }
    return next();
  });

  app.use(async (req, res, next) => {
    if (req.subdomains.length == 2) {
      const [dbName, schemaName] = req.subdomains;
      const { handler } = getGraphileInstanceObj(dbName, schemaName);
      return handler(req, res, next);
    }
    return next();
  });

  app.use(async (req, res, next) => {
    if (req.subdomains.length == 2) {
      if (req.url === '/flush') {
        const key = req.subdomains.join('');
        cache.del(key);
        return res.send(200);
      }
    }
    return next();
  });

  app.get('/', async (req, res, next) => {
    const results = await rootPgPool.query(`
  SELECT
    *
  FROM
    pg_catalog.pg_database;
  `);
    return res.send(
      '<style>html { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" }</style><h1>Databases</h1><hr />' +
        results.rows
          .map((d) => [
            d,
            `${req.protocol}://${d.datname}.${req.hostname}:${env.SERVER_PORT}`
          ])
          .map(([d, url]) => {
            return `<a href="${url}" />${d.datname}</a><br />`;
          })
          .join('\n')
    );
  });

  app.listen(env.SERVER_PORT, env.SERVER_HOST);
};
