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
  namespace:      'defaultShaper',
  maxRegulatedDelayMs:     100,
  gain: 0.00001,
  timeoutMs:      2 * 1000,
  historyMs: 10 * 1000,
  redisConfig:    null,
  command:        null,
  pub:            null,
  sub:            null
};

const GET_DELAY_SCRIPT      = `getDelay`;
const PREV_TIMESTAMP_PREFIX = 'prevTimestamp_';
const PREDICTION_PREFIX     = 'prediction_';

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

  if (!_.isInteger(config.maxRegulatedDelayMs) || config.maxRegulatedDelayMs < 1) {
    throw new Error('maxRegulatedDelayMs must be an integer greater than 0');
  }

  const redis = config.command ? config.command : new Redis(config.redisConfig);

  // redis.defineCommand(GET_DELAY_SCRIPT, {
  //   numberOfKeys: 2,
  //   lua:          LUA_SCRIPT
  // });

  self.getDelay = (curTimeUs, id = '') => {
    const now         = microtime.now();
    const requestId = uuid.v4() + now;
    const key         = config.namespace + id;

    const clearBeforeUs = now - (defaultConfig.historyMs * 1000);

    const batch = redis.multi();
    batch.zremrangebyscore(key, 0, clearBeforeUs);
    batch.zrange(key, 0, -1, "withscores");
    batch.zadd(key, curTimeUs, requestId);
    batch.expire(key, Math.ceil(defaultConfig.historyMs / 1000)); // convert to seconds, as used by command ttl.

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

      const timestamps = results[1][1].filter((value, key) => key %2);

      const averageDiff = timestamps.reduce((result, timestamp) => {
        timestamp = parseInt(timestamp);

        if (!result.previous) {
          result.previous = timestamp;
          result.avg = 0;
          return result;
        } else {
          result.avg += (timestamp - result.previous) / timestamps.length;
          result.previous = timestamp;
          return result;
        }
      }, {});

      const curDiff = curTimeUs - _.last(timestamps);

      console.log(JSON.stringify(averageDiff, null, 2));

      return 10;
    })
    .timeout(config.timeoutMs)
  };

  self.wait = (id = '') => {
    const now              = microtime.now();

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