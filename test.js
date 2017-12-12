const chai    = require('chai');
expect        = chai.expect;
const Redis   = require('ioredis');
const moment  = require('moment');
const Promise = require('bluebird');
const path    = require('path');
const fs      = require('fs');
const uuid = require('uuid');

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
    expect(counter.get()).to.eql(Counter.MAX_SAFE_VALUE - 1);
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

    const trafficShaping = new TrafficShaper({redisConfig: {host: 'localhost', port: 6379}});

    const addValue = () => trafficShaping.getDelay(moment().valueOf() * 1000).then((delay) => console.log(delay));

    return addValue()
    .delay(80)
    .then(() => addValue())
    .delay(50)
    .then(() => addValue())
    .delay(10)
    .then(() => addValue())
    .delay(15)
    .then(() => addValue())
    .delay(5)
    .then(() => addValue())
  });
});

describe('shaping tests', () => {
  it('test', () => {
    const redis = new Redis({host: 'localhost', port: 6379});

    redis.script('flush').then(() => {
      redis.defineCommand('getDelay', {
        numberOfKeys: 2,
        lua:          fs.readFileSync(path.join(__dirname, './getDelay.lua'))
      });

      return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf()).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      }).delay(100).then((result) => {
        console.log(result)
        return redis.getDelay('prevTimestamp', 'prediction', uuid.v4(), moment().valueOf());
      })
    });
  });

  it('shapes traffic', () => {
    const TrafficShaper = require('./index');

    const trafficShaper = new TrafficShaper({redisConfig: {host: 'localhost', port: 6379}});

    let prevTime = moment();

    return trafficShaper.wait()
    .then(() => Promise.resolve()
      .then(() => {
        console.log(moment().diff(prevTime))
        prevTime = moment()
      }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
    .then(() => Promise.resolve()
    .then(() => {
      console.log(moment().diff(prevTime))
      prevTime = moment()
    }).then(() => trafficShaper.wait()))
  });
});