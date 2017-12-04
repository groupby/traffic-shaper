# traffic-shaper

The intention of this library is to focus on limiting the number of concurrent connections, rather than limiting the rate of requests.

Properly configured, this should still protect databases and other backend systems, while still allowing requests to be executed at the maximum rate possible.

```javascript
const TrafficShaper = require('traffic-shaper');

const config = {
  redicsConfig: {                // required
    host: 'localhost',
    port: 6379
  },
  maxConcurrency: 10,            // required
  // namespace:       'defaultShaper', // default - Change this value to namespace the redis lock and use multiple instances on a single redis
  // maxHistoryMs:    30 * 1000, // default - outstanding beyond this period are ignored - This has to be the same in all instances
  // timeoutMs:       2 * 1000,  // default - this is the longest that this instance will wait for slot before rejecting
};

const trafficShaper = new TrafficShaper(config);

// Used as a global concurrency limit
trafficShaper.wait().then(({ack}) => {
  
  // Perform whatever action you are limiting the concurrency of, then ack to release the slot
  return doThing().then(() => ack());
});

// Limit the concurrency of a specific customer or API call without creating a new instance in a new namespace
trafficShaper.wait('some-customerId').then(({ack}) => {
  
  // Perform whatever action you are limiting the concurrency of, then ack to release the slot
  return doCustomerThing().then(() => ack());
});
```