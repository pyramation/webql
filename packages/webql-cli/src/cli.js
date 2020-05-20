#!/usr/bin/env node

import { prompt } from '@pyramation/prompt';
import webql from '@pyramation/webql';

const argv = process.argv.slice(2);

const go = async () => {
  const results = await prompt(
    [
      {
        name: 'schemas',
        message: 'Enter your schemas',
        required: true
      }
    ],
    argv
  );
  webql();
  //   console.log({ results });
};

go();
