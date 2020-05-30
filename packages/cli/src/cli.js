#!/usr/bin/env node

import server from '@webql/server';
import { prompt } from '@pyramation/prompt';
const argv = process.argv.slice(2);

const questions = [
  {
    name: 'simpleInflection',
    type: 'boolean',
    alias: 's'
  },
  {
    name: 'port',
    type: 'number',
    alias: 'p'
  },
  {
    name: 'origin',
    type: 'string',
    alias: 'o'
  }
];

const main = async () => {
  const results = await prompt(questions, argv);
  server(results);
};

main();
