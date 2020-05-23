import express from 'express';
import { getGraphileSettings } from './settings';
import { postgraphile } from 'postgraphile';
import pg from 'pg';
import cors from 'cors';
import env from './env';
import LRU from 'lru-cache';
import { printSchemas, printDatabases } from './render';

const cache = new LRU({
  max: 5,
  dispose: function (key, obj) {
    console.log(`closing ${key}`);
    obj?.pgPool?.end?.(); // eslint-disable-line 
  },
  maxAge: 1000 * 60 * 60
});

const pgCache = new LRU({
  max: 3,
  dispose: function (key, pgPool) {
    console.log(`closing ${key}`);
    pgPool?.end?.(); // eslint-disable-line 
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

  app.use(cors());

  process.on('SIGTERM', () => {
    cache.reset();
    pgCache.reset();
    rootPgPool?.end?.(); // eslint-disable-line 
  });

  app.use(async (req, res, next) => {
    if (req.subdomains.length == 1) {
      const [dbName] = req.subdomains;
      const pgPool = getRootPgPool(dbName);

      const results = await pgPool.query(`
      SELECT s.nspname AS table_schema
      FROM pg_catalog.pg_namespace s;
      `);
      return res.send(printSchemas(dbName, results.rows, req, env));
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

  app.use(async (req, res, next) => {
    if (req.subdomains.length === 0) {
      const results = await rootPgPool.query(`
      SELECT
        *
      FROM
        pg_catalog.pg_database;
      `);
      return res.send(printDatabases(results.rows, req, env));
    }
    return next();
  });

  app.listen(env.SERVER_PORT, env.SERVER_HOST, () =>
    console.log(`app listening at http://${env.SERVER_HOST}:${env.SERVER_PORT}`)
  );
};
