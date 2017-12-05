const microtime = require('microtime');
const Promise   = require('bluebird');
const uuid      = require('uuid');
const _         = require('lodash');
const Counter   = require('./counter');
const Redis = require('ioredis');

const MAX_EMITTERS = 1000;

const defaultConfig = {
  namespace:       'defaultShaper',
  maxConcurrency:  null,
  maxHistoryMs:    30 * 1000,
  timeoutMs:       2 * 1000,
  redisConfig:     null,
  command:         null,
  pub:             null,
  sub:             null
};

const TrafficShaper = function (config) {
  const self = this;

  config = Object.assign({}, defaultConfig, config);

  if (!config.redisConfig && !(config.command && config.pub && config.sub)) {
    throw new Error('must provide either redisConfig or command, pub, and sub');
  }

  if (config.redisConfig && (!_.isObject(config.redisConfig) || !_.isString(config.redisConfig.host) || !_.isInteger(config.redisConfig.port))) {
    throw new Error('if provided, redisConfig must be an object with host string and port integer');
  }

  if (!_.isInteger(config.maxConcurrency) || config.maxConcurrency <= 1) {
    throw new Error('maxConcurrency must be an integer greater than 1');
  }

  if (!_.isInteger(config.timeoutMs) || config.timeoutMs < 1) {
    throw new Error('timeoutMs must be an integer greater than 0');
  }

  if (!_.isInteger(config.maxHistoryMs) || config.maxHistoryMs < 1) {
    throw new Error('maxHistoryMs must be an integer greater than 0');
  }

  const command = config.command ? config.command : new Redis(config.redisConfig);
  const pub = config.pub ? config.pub : new Redis(config.redisConfig);
  const sub = config.sub ? config.sub : new Redis(config.redisConfig);

  const subscribed = false;
  const ackCounter = new Counter();

  let localOutstandingRequests = [];

  const messageHandler = () => {
    ackCounter.inc();

    const dropIndices = [];

    localOutstandingRequests.forEach((request, index) => {
      if (request.targetCount < ackCounter.get()) {
        request.resolve();
      } else {
        dropIndices.push(index);
      }
    });

    _.pullAt(localOutstandingRequests, dropIndices);
  };

  self.wait = (id = '') => {
    const now         = microtime.now();
    const requestId = uuid.v4() + now;
    const key         = config.namespace + id;

    const subscribedPromise = subscribed ? Promise.resolve() : sub.subscribe(key).then(() => {
      sub.on('message', messageHandler);
    });

    const ack = () => command.zrem(key, requestId).then((removed) => {
      if (removed > 0) {
        return pub.publish(key, requestId);
      }
    });

    return Promise.resolve()
    .then(() => subscribedPromise)
    .then(() => {
      const clearBeforeUs = now - (defaultConfig.maxHistoryMs * 1000);

      const batch = command.multi();
      batch.zremrangebyscore(key, 0, clearBeforeUs);
      batch.zrange(key, 0, -1, "withscores");
      batch.zadd(key, now, requestId);
      batch.expire(key, Math.ceil(defaultConfig.maxHistoryMs / 1000000)); // convert to seconds, as used by command ttl.

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

        const globalInProgress = results[1][1].length / 2;

        if (globalInProgress >= config.maxConcurrency) {
          return new Promise((res, rej) => {
            const targetCount = ackCounter.get() + (globalInProgress - config.maxConcurrency);

            localOutstandingRequests.push({
              requestId,
              resolve: res,
              reject: rej,
              targetCount
            });
          });
        } else {
          return Promise.resolve();
        }
      })
      .timeout(config.timeoutMs)
      .tapCatch(ack);
    })
    .then(() => ({ack}));
  };

  return self;
};

module.exports = TrafficShaper;