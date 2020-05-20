module.exports.printDatabases = (databases, req, env) => {
  return (
    '<style>html { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" }</style>' +
    '<h1>Databases</h1>' +
    '<hr />' +
    databases
      .map((d) => [
        d,
        `${req.protocol}://${d.datname}.${req.hostname}:${env.SERVER_PORT}`
      ])
      .map(([d, url]) => {
        return `<a href="${url}" />${d.datname}</a><br />`;
      })
      .join('\n')
  );
};

module.exports.printSchemas = (dbName, schemas, req, env) => {
  return (
    `<style>html { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" }</style>` +
    `<h1>Schemas in ${dbName}</h1>` +
    `<a href="${req.protocol}://${env.SERVER_HOST}:${env.SERVER_PORT}">back to root</a>` +
    `<hr />` +
    schemas
      .map((d) => [
        d,
        `${req.protocol}://${d.table_schema}.${req.hostname}:${env.SERVER_PORT}/graphiql`
      ])
      .map(([d, url]) => {
        return `<a href="${url}" />${d.table_schema}</a><br />`;
      })
      .join('\n')
  );
};
