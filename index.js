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

  // redis.defineCommand(GET_DELAY_SCRIPT, {
  //   numberOfKeys: 2,
  //   lua:          LUA_SCRIPT
  // });

  self.getDelay = (curTimeUs, id = '') => {
    const now       = microtime.now();
    const requestId = uuid.v4() + now;
    const key       = config.namespace + id;

    const clearBeforeUs = now - (defaultConfig.historyMs * 1000);

    const batch = redis.multi();
    batch.zremrangebyscore(key, 0, clearBeforeUs);
    batch.zrange(key, 0, -1, "withscores");
    batch.zadd(key, curTimeUs, requestId);
    batch.pexpire(key, defaultConfig.historyTtlMs); // convert to seconds, as used by command ttl.

    return batch.exec()
    .then((results) => {
      const errors = results.reduce((acc, result) => {
        if (result[0]) {
          acc.push(result[0]);
        }

        return acc;
      }, []);

      if (errors.length > 0) {
        console.warn(`Errors while traffic shaping`);
        return Promise.reject(`Errors while calling command: ${errors}`);
      }

      if (!results[1][1]) {
        return 0;
      }

      const timestamps = results[1][1].filter((value, key) => key % 2);

      // Return if history is empty
      if (timestamps.length < 2) {
        return 0;
      }

      const diffs = timestamps.reduce((result, timestamp) => {
        timestamp = parseInt(timestamp);

        if (!result.previous) {
          result.previous = timestamp;
          return result;
        } else {
          result.diffs.push(timestamp - result.previous);
          result.previous = timestamp;
          return result;
        }
      }, {diffs: []}).diffs.sort();

      const medianDiff = diffs[Math.floor(diffs.length / 2)];
      const curDiff = curTimeUs - _.last(timestamps);

      // console.log('curDiff ' + (curDiff / 1000) + ' medianDiff ' + (medianDiff / 1000));

      const delta = (medianDiff - curDiff > 0) ? medianDiff - curDiff : 0;
      return Math.round(delta / 1000);
    })
    .timeout(config.timeoutMs)
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