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

describe('shaping tests', () => {
  it('shapes traffic', () => {
    const TrafficShaper = require('./index');

    const execTime = {};

    const trafficShaping = new TrafficShaper({redisConfig: {host: 'localhost', port: 6379}, maxConcurrency: 2});

    const curTime = moment();

    const first  = trafficShaping.wait().then((shaped) => {
      execTime.first = moment().diff(curTime);
      return Promise.resolve().delay(500).then(() => shaped.ack());
    });
    const second = trafficShaping.wait().then((shaped) => {
      execTime.second = moment().diff(curTime);
      return Promise.resolve().delay(800).then(() => shaped.ack());
    });
    const third  = trafficShaping.wait().then((shaped) => {
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
});

describe.only('shaping tests', () => {
  it.only('test', () => {
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