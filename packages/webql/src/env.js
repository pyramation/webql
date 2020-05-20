const { cleanEnv, str, port, url, makeValidator } = require('envalid');

const array = makeValidator((x) => x.split(','), '');

module.exports = cleanEnv(
  process.env,
  {
    GRAPHQL_SERVER_SCHEMAS: array(),
    GRAPHQL_SERVER_PORT: port(),
    GRAPHQL_SERVER_HOST: str(),
    DATABASE_URL: url()
  },
  { dotEnvPath: null }
);
