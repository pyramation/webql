const { cleanEnv, str, port, url, makeValidator } = require('envalid');

const array = makeValidator((x) => x.split(','), '');

module.exports = cleanEnv(
  process.env,
  {
    GRAPHILE_SCHEMAS: array({ default: 'information_schema' }),
    SERVER_PORT: port({ default: 5555 }),
    SERVER_HOST: str({ default: 'localhost' }),
    APP_HOSTS: str({ default: 'localhost' }),
    PGUSER: str({ default: 'postgres' }),
    PGHOST: str({ default: 'localhost' }),
    PGPASSWORD: str({ default: 'password' }),
    PGPORT: port({ default: 5432 })
  },
  { dotEnvPath: null }
);
