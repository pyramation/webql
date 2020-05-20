#!/usr/bin/env node

import { prompt } from '@pyramation/prompt';
import webql, { env } from '@pyramation/webql';

const argv = process.argv.slice(2);

const main = async () => {
  const net = require('net');
  const server = net.createServer();

  server.once('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      // port is currently in use
      const results = await prompt(
        [
          {
            name: 'port',
            message: 'enter a port that is NOT is use',
            required: true
          }
        ],
        argv
      );
      webql(results.port);
    }
  });

  server.once('listening', function () {
    // close the server if listening doesn't fail
    server.close();
    webql(env.SERVER_PORT);
  });

  server.listen(env.SERVER_PORT);
};

main();
