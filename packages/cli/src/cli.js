#!/usr/bin/env node

import server from '@webql/server';
import { prompt } from '@pyramation/prompt';
const argv = process.argv.slice(2);

const questions = [
  {
    name: 'simpleInflection',
    type: 'boolean',
    alias: 's',
    default: true
  },
  {
    name: 'port',
    type: 'number',
    alias: 'p',
    default: 5555
  },
  {
    name: 'origin',
    type: 'string',
    alias: 'o',
    default: 'http://localhost:3000'
  }
];

const main = async () => {
  const results = await prompt(questions, argv);
  server(results);
};

main();
