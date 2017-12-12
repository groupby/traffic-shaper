-- Keys
local HISTORY_KEY = KEYS[1]

-- Arguments
local requestId = ARGV[1]
local OLDEST_US = ARGV[2]
local TTL_MS = ARGV[3]
local curTimestampUs = ARGV[4]


local table_val_to_str = function ( v )
    if "string" == type( v ) then
        v = string.gsub( v, "\n", "\\n" )
        if string.match( string.gsub(v,"[^'\"]",""), '^"+$' ) then
            return "'" .. v .. "'"
        end
        return '"' .. string.gsub(v,'"', '\\"' ) .. '"'
    else
        return "table" == type( v ) and table_tostring( v ) or
                tostring( v )
    end
end

local table_key_to_str = function ( k )
    if "string" == type( k ) and string.match( k, "^[_%a][_%a%d]*$" ) then
        return k
    else
        return "[" .. table_val_to_str( k ) .. "]"
    end
end

local table_tostring = function ( tbl )
    local result, done = {}, {}
    for k, v in ipairs( tbl ) do
        table.insert( result, table_val_to_str( v ) )
        done[ k ] = true
    end
    for k, v in pairs( tbl ) do
        if not done[ k ] then
            table.insert( result,
                table_key_to_str( k ) .. "=" .. table_val_to_str( v ) )
        end
    end
    return "{" .. table.concat( result, "," ) .. "}"
end


--redis.log(redis.LOG_NOTICE, 'HISTORY_KEY ' .. HISTORY_KEY .. ' requestId ' .. requestId .. ' OLDEST_US ' .. OLDEST_US ..  ' TTL_MS ' .. TTL_MS .. ' curTimestampUs ' .. curTimestampUs)

-- Clear old history, get history, add to history, set expire on history
redis.call('zremrangebyscore', HISTORY_KEY, 0, OLDEST_US)
local range = redis.call('zrange', HISTORY_KEY, 0, -1, 'withscores')
redis.call('zadd', HISTORY_KEY, curTimestampUs, requestId)
redis.call('pexpire', HISTORY_KEY, TTL_MS)

--print(previousTimestamps)
local previousTimestamps = {}

for i, rangePair in ipairs(range) do
    if i % 2 == 0 then
        table.insert(previousTimestamps, tonumber(rangePair))
    end
end

--redis.log(redis.LOG_NOTICE, 'previousTimestamps ' .. table_tostring(previousTimestamps))

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

table.sort(diffs)

--redis.log(redis.LOG_NOTICE, 'diffs ' .. table_tostring(diffs) .. ' #diffs / 2 ' .. (#diffs / 2))

local medianDiff = diffs[math.ceil(#diffs / 2)]
local curDiff = curTimestampUs - previousTimestamps[#previousTimestamps]

--redis.log(redis.LOG_NOTICE, 'medianDiff ' .. tostring(medianDiff) .. ' curDiff ' .. curDiff)

local delta = 0

if ((medianDiff - curDiff) > 0) then
    delta = (medianDiff - curDiff)
end

return math.floor((delta / 1000) + 0.5)