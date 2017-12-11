local PREV_TIME_KEY = KEYS[1]
local PREDICTION_KEY = KEYS[2]

local gain = ARGV[1]
local curTimestamp = ARGV[2]
local MAX_DELAY_MS = ARGV[3]

redis.log(redis.LOG_WARNING, 'gain ' .. tostring(gain) .. ' curTimestamp ' .. tostring(curTimestamp) .. ' MAX_DELAY_MS ' .. tostring(MAX_DELAY_MS))

local prevTimestamp = redis.call('get', PREV_TIME_KEY)
local prevPrediction = redis.call('get', PREDICTION_KEY)

if not prevTimestamp then
    prevTimestamp = curTimestamp
end

redis.log(redis.LOG_WARNING, 'prevTimestamp ' .. prevTimestamp)

local diff = math.abs(curTimestamp - prevTimestamp)

redis.log(redis.LOG_WARNING, 'diff ' .. diff)

if not prevPrediction then
    prevPrediction = 0
end

local nextPrediction = (gain * diff) + ((1 - gain) * prevPrediction)

redis.log(redis.LOG_WARNING, 'prediction ' .. nextPrediction)

redis.call('psetex', PREV_TIME_KEY, MAX_DELAY_MS, curTimestamp)
redis.call('psetex', PREDICTION_KEY, MAX_DELAY_MS, nextPrediction)

return diff - nextPrediction