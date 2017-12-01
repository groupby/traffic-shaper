const MAX_SAFE_VALUE = Math.floor(Number.MAX_SAFE_INTEGER/2);

const Counter = function(counter) {
  const self = this;

  let value = 0;

  if (counter) {
    if (counter instanceof Counter) {
      value = counter.get();
    } else {
      throw new Error('if provided, counter must be instance of Counter');
    }
  }

  self.diff = (counter) => {
    if (!(counter instanceof Counter)) {
      throw new Error('counter must be instance of Counter');
    }

    const naiveDiff = value - counter.get();

    if (naiveDiff > MAX_SAFE_VALUE) {
      return naiveDiff - (2 * MAX_SAFE_VALUE);
    } else if (naiveDiff < MAX_SAFE_VALUE) {
      return naiveDiff + (2 * MAX_SAFE_VALUE);
    }

    return value - counter.get();
  };

  self.set = (val) => {
    if (val >= MAX_SAFE_VALUE || val <= -MAX_SAFE_VALUE) {
      throw new Error('must be between -MAX_SAFE_VALUE and MAX_SAFE_VALUE');
    }

    value = val;
  };

  self.inc = (by = 1) => {
    if (by < 1 || by >= MAX_SAFE_VALUE) {
      throw new Error('by must be a value between 1 and MAX_SAFE_VALUE')
    }

    if (value > 0 && (MAX_SAFE_VALUE - value) <= by) {
      value = -MAX_SAFE_VALUE + (MAX_SAFE_VALUE - value - by);
    } else {
      value += by;
    }
  };

  self.dec = (by = -1) => {
    if (by > -1 || by <= -MAX_SAFE_VALUE) {
      throw new Error('by must be a value between -1 and -MAX_SAFE_VALUE')
    }

    if (value < 0 && (-MAX_SAFE_VALUE - value) >= by) {
      value = MAX_SAFE_VALUE + (-MAX_SAFE_VALUE - value - by);
    } else {
      value -= by;
    }
  };

  self.get = () => value;

  return self;
};

Counter.MAX_SAFE_VALUE = MAX_SAFE_VALUE;
module.exports = Counter;