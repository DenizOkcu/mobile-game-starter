local nk = require("nakama")
local COLLECTION, KEY = "player", "state"

local function fail(message, code)
  error({message, code or 3})
end

local function intent(context, payload, allowed)
  if not context.user_id or context.user_id == "" then fail("Authentication required", 16) end
  if type(payload) ~= "string" or not payload:match("^%s*{") then fail("Expected JSON object") end
  local ok, data = pcall(nk.json_decode, payload)
  if not ok or type(data) ~= "table" then fail("Invalid JSON") end
  for k, _ in pairs(data) do
    if not allowed[k] then fail("Unknown field: " .. tostring(k)) end
  end
  return data
end

local function read(user_id)
  return nk.storage_read({{collection = COLLECTION, key = KEY, user_id = user_id}})[1]
end

local function save(user_id, state, version)
  state.updated_at = math.floor(nk.time() / 1000)
  local ok = pcall(nk.storage_write, {{collection = COLLECTION, key = KEY,
    user_id = user_id, value = state, version = version,
    permission_read = 0, permission_write = 0}})
  -- Do not retry mutations. The client must fetch canonical state on an unknown outcome.
  if not ok then fail("State changed or storage unavailable; refresh and try again", 10) end
end

local function load(user_id)
  local record = read(user_id)
  if record then
    if record.value.schema_version ~= 1 then fail("Unsupported player schema", 9) end
    return record
  end
  local state = {schema_version = 1, display_name = "Player", coins = 0,
    tutorial_completed = false, created_at = math.floor(nk.time() / 1000)}
  local ok = pcall(save, user_id, state, "*")
  record = read(user_id)
  if not ok and not record then fail("Player initialization unavailable", 14) end
  return record
end

local function snapshot(user_id)
  return nk.json_encode({state = load(user_id).value, server_time = math.floor(nk.time() / 1000)})
end

local function get_state(context, payload)
  intent(context, payload, {})
  return snapshot(context.user_id)
end

local function update_profile(context, payload)
  local data = intent(context, payload, {display_name = true})
  if type(data.display_name) ~= "string" or #data.display_name < 1 or #data.display_name > 24
    or not data.display_name:match("^[%w _%-]+$") or not data.display_name:match("%w") then
    fail("Name must be 1-24 ASCII letters, numbers, spaces, _ or -")
  end
  local record = load(context.user_id)
  record.value.display_name = data.display_name
  save(context.user_id, record.value, record.version)
  return snapshot(context.user_id)
end

local function complete_tutorial(context, payload)
  intent(context, payload, {})
  local record = load(context.user_id)
  if not record.value.tutorial_completed then
    record.value.tutorial_completed = true
    record.value.coins = record.value.coins + 10
    save(context.user_id, record.value, record.version)
  end
  return snapshot(context.user_id)
end

nk.register_rpc(get_state, "get_state")
nk.register_rpc(update_profile, "update_profile")
nk.register_rpc(complete_tutorial, "complete_tutorial")
