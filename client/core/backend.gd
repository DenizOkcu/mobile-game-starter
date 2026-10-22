extends Node

signal state_changed
var state: Dictionary = {}
var last_error: String = ""
var _client: NakamaClient
var _session: NakamaSession
var token: String:
	get:
		return _session.token if _session != null else ""
const SESSION_PATH := "user://session.cfg"

func _ready() -> void:
	if not AppConfig.error_message.is_empty():
		last_error = AppConfig.error_message
		return
	var url := AppConfig.api_url
	var scheme := url.get_slice("://", 0)
	var authority := url.get_slice("://", 1)
	var host := authority
	var port := 443 if scheme == "https" else 80
	# Support bracketed IPv6 as well as DNS/IPv4 origins.
	if authority.begins_with("["):
		var end := authority.find("]")
		host = authority.substr(0, end + 1)
		if authority.substr(end + 1).begins_with(":"):
			port = authority.substr(end + 2).to_int()
	elif ":" in authority:
		host = authority.get_slice(":", 0)
		port = authority.get_slice(":", 1).to_int()
	_client = Nakama.create_client(AppConfig.server_key, host, port, scheme, 15, NakamaLogger.LOG_LEVEL.ERROR)
	_client.auto_retry = false
	# Refresh explicitly so newly issued tokens are always persisted.
	_client.auto_refresh = false

func _persist() -> void:
	var config := ConfigFile.new()
	config.set_value("session", "refresh_token", _session.refresh_token)
	config.set_value("session", "api_url", AppConfig.api_url)
	config.save(SESSION_PATH)

func _check(reply: NakamaAsyncResult) -> bool:
	if reply.is_exception():
		var exception := reply.get_exception()
		last_error = exception.message
		if exception.status_code <= 0:
			last_error = "Connection lost or timed out. Refresh before trying again."
		return false
	last_error = ""
	return true

func _accept(reply: NakamaSession) -> bool:
	if not _check(reply):
		return false
	_session = reply
	_persist()
	return true

func _refresh_session() -> bool:
	var reply := await _client.session_refresh_async(_session)
	if not _accept(reply):
		if reply.get_exception().status_code in [401, 403, 404]:
			clear_session()
		return false
	return true

func restore() -> bool:
	if _client == null:
		return false
	var config := ConfigFile.new()
	if config.load(SESSION_PATH) != OK or config.get_value("session", "api_url", "") != AppConfig.api_url:
		return false
	var refresh_token: String = config.get_value("session", "refresh_token", "")
	if refresh_token.is_empty():
		return false
	_session = NakamaSession.new(null, false, refresh_token)
	if not await _refresh_session():
		return false
	return await refresh_state()

func authenticate(email: String = "", password: String = "", create: bool = false) -> bool:
	if _client == null:
		return false
	var reply: NakamaSession
	if email.is_empty():
		var config := ConfigFile.new()
		config.load("user://installation.cfg")
		var identity: String = config.get_value("device", "id", "")
		if identity.is_empty():
			identity = Crypto.new().generate_random_bytes(24).hex_encode()
			config.set_value("device", "id", identity)
			config.save("user://installation.cfg")
		reply = await _client.authenticate_device_async(identity)
	else:
		reply = await _client.authenticate_email_async(email.strip_edges(), password, null, create)
	if not _accept(reply):
		return false
	return await refresh_state()

func _authorized(action: Callable) -> NakamaAsyncResult:
	if _client == null or _session == null:
		return NakamaAsyncResult.new(NakamaException.new("Log in to continue.", 401))
	if _session.would_expire_in(60) and not await _refresh_session():
		return NakamaAsyncResult.new(NakamaException.new(last_error, 401))
	var reply: NakamaAsyncResult = await action.call()
	if reply.is_exception() and reply.get_exception().status_code == 401:
		# A definite rejection may be retried once after refresh, never a timeout.
		if await _refresh_session():
			reply = await action.call()
		if reply.is_exception() and reply.get_exception().status_code == 401:
			clear_session()
	return reply

func call_rpc(id: String, payload: Dictionary = {}) -> bool:
	var reply: NakamaAsyncResult = await _authorized(func() -> NakamaAsyncResult:
		return await _client.rpc_async(_session, id, JSON.stringify(payload)))
	if not _check(reply):
		return false
	var decoded: Variant = JSON.parse_string(reply.get("payload"))
	if not decoded is Dictionary or not decoded.get("state") is Dictionary:
		last_error = "Invalid server snapshot."
		return false
	state = decoded.state
	state_changed.emit()
	return true

func refresh_state() -> bool:
	return await call_rpc("get_state")

func link_email(email: String, password: String) -> bool:
	return _check(await _authorized(func() -> NakamaAsyncResult:
		return await _client.link_email_async(_session, email.strip_edges(), password)))

func logout() -> void:
	await _authorized(func() -> NakamaAsyncResult:
		return await _client.session_logout_async(_session))
	clear_session()

func delete_account() -> bool:
	var reply := await _authorized(func() -> NakamaAsyncResult:
		return await _client.delete_account_async(_session))
	if not _check(reply):
		return false
	clear_session()
	return true

func clear_session() -> void:
	_session = null
	state = {}
	DirAccess.remove_absolute(SESSION_PATH)
	state_changed.emit()
