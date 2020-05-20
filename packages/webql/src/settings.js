const env = require('./env');
const { NodePlugin } = require('graphile-build');

export const getGraphileSettings = ({ connection, host, port, schema }) => ({
  skipPlugins: [NodePlugin],
  dynamicJson: true,
  disableGraphiql: env.isProd,
  enhanceGraphiql: true,
  graphiql: !env.isProd,
  watch: !env.isProd,
  connection,
  port,
  host,
  schema,
  ignoreRBAC: false,
  showErrorStack: false,
  extendedErrors: false,
  disableQueryLog: false,
  includeExtensionResources: true,
  setofFunctionsContainNulls: false,
  additionalGraphQLContextFromRequest(req, res) {
    return { req, res, env };
  },
  async pgSettings(req) {
    // TODO use real roles
    return { role: 'postgres' };
  }
});
