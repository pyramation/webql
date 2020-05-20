const express = require('express');
const { getGraphileSettings } = require('./settings');
const { postgraphile } = require('postgraphile');
const pg = require('pg');
const cors = require('cors');
const env = require('./env');
const LRU = require('lru-cache');
const { printSchemas, printDatabases } = require('./render');

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

module.exports = () => {
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
        // if (env.isProd && !env.APP_HOSTS.includes(origin)) {
        //   return callback(true, false);
        // }
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

  app.listen(env.SERVER_PORT, env.SERVER_HOST);
};
