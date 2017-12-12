-- Keys
local HISTORY_KEY = KEYS[1]

-- Arguments
local requestId = ARGV[1]
local OLDEST_US = ARGV[2]
local TTL_MS = ARGV[3]
local curTimestampUs = ARGV[4]

-- Clear old history, get history, add to history, set expire on history
redis.call('zremrangebyscore', HISTORY_KEY, 0, OLDEST_US)
local range = redis.call('zrange', HISTORY_KEY, 0, -1, 'withscores')
redis.call('zadd', HISTORY_KEY, curTimestampUs, requestId)
redis.call('pexpire', HISTORY_KEY, TTL_MS)

-- The return from zrange has the timestamp in every other entry
local previousTimestamps = {}
for i, rangePair in ipairs(range) do
    if i % 2 == 0 then
        table.insert(previousTimestamps, tonumber(rangePair))
    end
end

-- not enough history to calculate a delay
if #previousTimestamps < 2 then
    return 0
end

local prevTimestamp = nil
local diffs = {}

-- Calcuate difference in timestamps
for i, timestamp in ipairs(previousTimestamps) do
    if not prevTimestamp then
        prevTimestamp = timestamp
    else
        table.insert(diffs, (timestamp - prevTimestamp))
        prevTimestamp = timestamp
    end
end

-- Sort differences and pull the median
table.sort(diffs)
local medianDiff = diffs[math.ceil(#diffs / 2)]

local curDiff = curTimestampUs - previousTimestamps[#previousTimestamps]

local delta = 0
if ((medianDiff - curDiff) > 0) then
    delta = (medianDiff - curDiff)
end

-- Conert to ms and round
return math.floor((delta / 1000) + 0.5)