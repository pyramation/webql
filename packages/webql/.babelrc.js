'use strict';

const useESModules = !!process.env.MODULE;

module.exports = (api) => {
  api.cache(true);
  const plugins = [
    ['@babel/transform-runtime', { useESModules }],
    '@babel/proposal-object-rest-spread',
    '@babel/proposal-class-properties',
    '@babel/proposal-export-default-from'
  ];

  const presets = useESModules ? [] : ['@babel/env'];

  return {
    plugins,
    presets
  };
};
