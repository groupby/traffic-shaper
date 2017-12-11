const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');

const TrafficShaper = require('./index');

const trafficShaper = new TrafficShaper({redisConfig: {host: 'localhost', port: 6379}});

const log1 = fs.readFileSync('/home/ehacke/cvshealth.log', {encoding: 'utf8'}).split('\n').filter((logLine) => {
  return _.isString(logLine) && logLine.trim().length > 0;
}).map((logLine) => {
  try {
    return JSON.parse(logLine.replace(/,"requestBody":.*"/g, ''))
  } catch (err) {
    console.log('line below')
    console.log(logLine);
    throw err;
  }
})
.map((log) => parseFloat(log.time));

const log2 = fs.readFileSync('/home/ehacke/cvshealth-7w0r.log', {encoding: 'utf8'}).split('\n').filter((logLine) => {
  return _.isString(logLine) && logLine.trim().length > 0;
}).map((logLine) => {
  try {
    return JSON.parse(logLine.replace(/,"requestBody":.*"/g, ''))
  } catch (err) {
    console.log('line below')
    console.log(logLine);
    throw err;
  }
})
.map((log) => parseFloat(log.time));

const log3 = fs.readFileSync('/home/ehacke/cvshealth-xz73.log', {encoding: 'utf8'}).split('\n').filter((logLine) => {
  return _.isString(logLine) && logLine.trim().length > 0;
}).map((logLine) => {
  try {
    return JSON.parse(logLine.replace(/,"requestBody":.*"/g, ''))
  } catch (err) {
    console.log('line below')
    console.log(logLine);
    throw err;
  }
})
.map((log) => parseFloat(log.time));

const logs = log1.concat(log2).concat(log3).sort();

let counter = 0;

const interval = setInterval(() => console.log('Count: ' + counter), 2000);

console.log('Starting');
Promise.mapSeries(logs, (time) => {
  time = time * 1000;
  counter++;
  return trafficShaper.getDelay(time).then((delay) => [time, time + delay].join(','));
}).then((results) => {
  fs.writeFileSync('values.csv', results.join('\n'));
  clearInterval(interval);
  console.log('Done!')
});