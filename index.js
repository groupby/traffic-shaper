const microtime = require('microtime');
const Promise   = require('bluebird');
const uuid      = require('uuid');
const _         = require('lodash');
const Counter   = require('./counter');
const Redis = require('ioredis');

const defaultOptions = {
  namespace:       'defaultShaper',
  maxConcurrency:  null,
  maxHistoryMs:    30 * 1000,
  minDifferenceUs: null,
  timeoutMs:       2000,
  redisConfig:     null,
  command:         null,
  pub:             null,
  sub:             null
};

const TrafficShaper = function (options) {
  const self = this;

  options = Object.assign({}, defaultOptions, options);

  if (!options.redisConfig && !(options.command && options.pub && options.sub)) {
    throw new Error('must provide either redisConfig or command, pub, and sub');
  }

  if (options.redisConfig && (!_.isObject(options.redisConfig) || !_.isString(options.redisConfig.host) || !_.isInteger(options.redisConfig.port))) {
    throw new Error('if provided, redisConfig must be an object with host string and port integer');
  }

  if (!_.isInteger(options.maxConcurrency) || options.maxConcurrency <= 1) {
    throw new Error('maxConcurrency must be an integer greater than 1');
  }

  if (!_.isInteger(options.timeoutMs) || options.timeoutMs < 1) {
    throw new Error('timeoutMs must be an integer greater than 0');
  }

  if (!_.isInteger(options.maxHistoryMs) || options.maxHistoryMs < 1) {
    throw new Error('maxHistoryMs must be an integer greater than 0');
  }

  const command = options.command ? options.command : new Redis(options.commandConfig);
  const pub = options.pub ? options.pub : new Redis(options.commandConfig);
  const sub = options.sub ? options.sub : new Redis(options.commandConfig);

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
    const key         = options.namespace + id;

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
      const clearBeforeUs = now - (defaultOptions.maxHistoryMs * 1000);

      const batch = command.multi();
      batch.zremrangebyscore(key, 0, clearBeforeUs);
      batch.zrange(key, 0, -1, "withscores");
      batch.zadd(key, now, requestId);
      batch.expire(key, Math.ceil(defaultOptions.maxHistoryMs / 1000000)); // convert to seconds, as used by command ttl.

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

        if (globalInProgress >= options.maxConcurrency) {
          return new Promise((res, rej) => {
            const targetCount = ackCounter.get() + (globalInProgress - options.maxConcurrency);

            localOutstandingRequests.push({
              requestId,
              resolve: res,
              reject: rej,
              targetCount
            });
          });
        }
      })
      .timeout(options.timeoutMs)
      .tapCatch(ack);
    })
    .then(() => ({ack}));
  };

  return self;
};

module.exports = TrafficShaper;