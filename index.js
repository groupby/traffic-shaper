const microtime = require('microtime');
const Promise   = require('bluebird');
const uuid      = require('uuid');
const _         = require('lodash');
const Counter   = require('./counter');
const Redis     = require('ioredis');
const path      = require('path');
const fs        = require('fs');

const LUA_SCRIPT = fs.readFileSync(path.join(__dirname, './getDelay.lua'));

const defaultConfig = {
  namespace:    'defaultShaper',
  historyTtlMs: 300,
  timeoutMs:    2 * 1000,
  historyMs:    10 * 1000,
  redisConfig:  null
};

const GET_DELAY_SCRIPT = 'getDelay';

const TrafficShaper = function (config) {
  const self = this;

  config = Object.assign({}, defaultConfig, config);

  if (!config.redisConfig) {
    throw new Error('must provide redisConfig');
  }

  if (config.redisConfig && (!_.isObject(config.redisConfig) || !_.isString(config.redisConfig.host) || !_.isInteger(config.redisConfig.port))) {
    throw new Error('if provided, redisConfig must be an object with host string and port integer');
  }

  if (!_.isInteger(config.timeoutMs) || config.timeoutMs < 1) {
    throw new Error('timeoutMs must be an integer greater than 0');
  }

  // if (!_.isInteger(config.maxRegulatedDelayMs) || config.maxRegulatedDelayMs < 1) {
  //   throw new Error('maxRegulatedDelayMs must be an integer greater than 0');
  // }

  const redis = config.command ? config.command : new Redis(config.redisConfig);

  redis.defineCommand(GET_DELAY_SCRIPT, {
    numberOfKeys: 1,
    lua:          LUA_SCRIPT
  });

  self.getDelay = (curTimeUs, id = '') => {
    const now       = curTimeUs;
    const requestId = uuid.v4() + now;
    const key       = config.namespace + id;

    const clearBeforeUs = now - (defaultConfig.historyMs * 1000);

    return redis[GET_DELAY_SCRIPT](key, requestId, clearBeforeUs, config.historyTtlMs, now);
  };

  self.wait = (id = '') => {
    const now = microtime.now();

    return Promise.resolve()
    .then(() => self.getDelay(now, id))
    .then((delayUs = 0) => {
      console.log('got delay of: ' + (delayUs / 1000));

      return Promise.resolve()
      .delay(Math.round(delayUs / 1000))
      .timeout(config.timeoutMs);
    });
  };

  return self;
};

module.exports = TrafficShaper;