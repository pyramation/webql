const env = require('./env');
const { NodePlugin } = require('graphile-build');
import PgSimplifyInflectorPlugin from './plugins/PgSimplifyInflectorPlugin';

export const getGraphileSettings = ({
  connection,
  host,
  port,
  schema,
  simpleInflection
}) => ({
  graphileBuildOptions: simpleInflection
    ? { pgSimplifyTableNames: true }
    : undefined,
  appendPlugins: simpleInflection ? [PgSimplifyInflectorPlugin] : undefined,
  skipPlugins: [NodePlugin],
  dynamicJson: true,
  disableGraphiql: false,
  enhanceGraphiql: true,
  graphiql: true,
  watch: false,
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
