const chai = require('chai');
expect = chai.expect;
const Redis = require('ioredis');

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

    const trafficShaping = new TrafficShaper()

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