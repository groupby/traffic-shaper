const chai = require('chai');
expect = chai.expect;
const Redis = require('ioredis');
const moment = require('moment');
const Promise = require('bluebird');

describe('counter tests', () => {

  const Counter = require('./counter');

  it('increments by one', () => {
    const counter = new Counter();

    expect(counter.get()).to.eql(0);
    counter.inc();
    expect(counter.get()).to.eql(1);
  });

  it('decrements by one', () => {
    const counter = new Counter();

    expect(counter.get()).to.eql(0);
    counter.dec();
    expect(counter.get()).to.eql(-1);
  });

  it('wraps at positive Counter.MAX_SAFE_VALUE', () => {
    const counter = new Counter();

    expect(counter.get()).to.eql(0);
    counter.set(Counter.MAX_SAFE_VALUE - 1);
    expect(counter.get()).to.eql(Counter.MAX_SAFE_VALUE -1);
    counter.inc();
    expect(counter.get()).to.eql(-Counter.MAX_SAFE_VALUE);
  });

  it('wraps at negative Counter.MAX_SAFE_VALUE', () => {
    const counter = new Counter();

    expect(counter.get()).to.eql(0);
    counter.set(-Counter.MAX_SAFE_VALUE + 1);
    expect(counter.get()).to.eql(-Counter.MAX_SAFE_VALUE + 1);
    counter.dec();
    expect(counter.get()).to.eql(Counter.MAX_SAFE_VALUE);
  });

  it('calculates diff correctly for normal cases', () => {
    const counter1 = new Counter();

    const counter2 = new Counter();
    counter2.inc(10);

    expect(counter1.diff(counter2)).to.eql(-10);
  });

  it('calculates diff correctly for positive wrapping cases', () => {
    const counter1 = new Counter();
    counter1.set(Counter.MAX_SAFE_VALUE - 10);

    const counter2 = new Counter();
    counter2.set(-Counter.MAX_SAFE_VALUE + 10);

    expect(counter1.diff(counter2)).to.eql(-20);
  });

  it('calculates diff correctly for negative wrapping cases', () => {
    const counter1 = new Counter();
    counter1.set(-Counter.MAX_SAFE_VALUE + 10);

    const counter2 = new Counter();
    counter2.set(Counter.MAX_SAFE_VALUE - 10);

    expect(counter1.diff(counter2)).to.eql(20);
  });
});

describe.only('shaping tests', () => {
  it('shapes traffic', () => {
    const TrafficShaper = require('./index');

    const execTime = {};

    const trafficShaping = new TrafficShaper({redisConfig: {host: 'localhost', port: 6379}, maxConcurrency:2});

    const curTime = moment();

    const first = trafficShaping.wait().then((shaped) => {
      execTime.first = moment().diff(curTime);
      return Promise.resolve().delay(500).then(() => shaped.ack());
    });
    const second = trafficShaping.wait().then((shaped) => {
      execTime.second = moment().diff(curTime);
      return Promise.resolve().delay(800).then(() => shaped.ack());
    });
    const third = trafficShaping.wait().then((shaped) => {
      execTime.third = moment().diff(curTime);
      return Promise.resolve().then(() => shaped.ack());
    });

    return Promise.all([first, second, third]).then(() => {
      expect(execTime.first).to.be.lt(100);
      expect(execTime.second).to.be.lt(100);
      expect(execTime.third).to.be.lt(800);
      expect(execTime.third).to.be.gt(500);
    });
  });

  it.skip('redis', () => {
    const redis = new Redis({
      host: 'localhost',
      port: 6379
    });

    return redis.multi()
    .zadd('somekey', 100, 'setkey')
    .zadd('somekey', 300, 'setkey1')
    .zadd('somekey', 340, 'setkey3')
    .zrange('somekey', 0, -1, "withscores")
    .exec()
    .then((results) => {
      const errors = results.reduce((acc, result) => {
        if (result[0]) {
          acc.push(result[0]);
        }

        return acc;
      }, []);

      if (errors.length > 0) {
        console.warn(`Errors while traffic shaping`);
        return options.rejectOnErrors ? Promise.reject(`Errors while calling redis: ${errors}`) : Promise.resolve();
      }

      console.log(JSON.stringify(results, null, 2))
    });
  });
});