extends Node

signal state_changed
var state: Dictionary = {}
var token: String = ""
var refresh_token: String = ""
var last_error: String = ""
const SESSION_PATH := "user://session.cfg"

func _basic() -> String:
	return "Basic " + Marshalls.utf8_to_base64(AppConfig.server_key + ":")

func _request(path: String, body: Variant, auth: String, method: int = HTTPClient.METHOD_POST) -> Dictionary:
	if AppConfig.error_message != "":
		return {"ok": false, "status": 0, "message": AppConfig.error_message}
	var http := HTTPRequest.new()
	http.timeout = 15.0
	add_child(http)
	var headers := PackedStringArray(["Content-Type: application/json", "Authorization: " + auth])
	var error := http.request(AppConfig.api_url + path, headers, method, "" if body == null else JSON.stringify(body))
	if error != OK:
		http.queue_free()
		return {"ok": false, "status": 0, "message": "Unable to start request."}
	var response: Array = await http.request_completed
	http.queue_free()
	var data: Variant = JSON.parse_string(response[3].get_string_from_utf8())
	var status: int = response[1]
	if response[0] != HTTPRequest.RESULT_SUCCESS:
		return {"ok": false, "status": 0, "message": "Connection lost or timed out. Refresh before trying again."}
	if status < 200 or status >= 300:
		return {"ok": false, "status": status, "message": data.get("message", "Server refused request.") if data is Dictionary else "Server refused request."}
	return {"ok": true, "status": status, "data": data if data is Dictionary else {}}

func _persist() -> void:
	var config := ConfigFile.new()
	config.set_value("session", "refresh_token", refresh_token)
	config.set_value("session", "api_url", AppConfig.api_url)
	config.save(SESSION_PATH)

func _accept(reply: Dictionary) -> bool:
	if not reply.ok:
		last_error = reply.message
		return false
	token = reply.data.get("token", "")
	refresh_token = reply.data.get("refresh_token", refresh_token)
	_persist()
	return not token.is_empty()

func restore() -> bool:
	var config := ConfigFile.new()
	if config.load(SESSION_PATH) != OK or config.get_value("session", "api_url", "") != AppConfig.api_url:
		return false
	refresh_token = config.get_value("session", "refresh_token", "")
	if refresh_token.is_empty():
		return false
	var reply := await _request("/v2/account/session/refresh", {"token": refresh_token}, _basic())
	if not _accept(reply):
		if reply.status in [401, 403, 404]:
			clear_session()
		return false
	return await refresh_state()

func authenticate(email: String = "", password: String = "", create: bool = false) -> bool:
	var path := "/v2/account/authenticate/email?create=" + str(create).to_lower()
	var body := {"email": email.strip_edges(), "password": password}
	if email.is_empty():
		var config := ConfigFile.new()
		config.load("user://installation.cfg")
		var identity: String = config.get_value("device", "id", "")
		if identity.is_empty():
			identity = Crypto.new().generate_random_bytes(24).hex_encode()
			config.set_value("device", "id", identity)
			config.save("user://installation.cfg")
		path = "/v2/account/authenticate/device?create=true"
		body = {"id": identity}
	if not _accept(await _request(path, body, _basic())):
		return false
	return await refresh_state()

func _authorized(path: String, body: Variant, method: int = HTTPClient.METHOD_POST) -> Dictionary:
	var reply := await _request(path, body, "Bearer " + token, method)
	if reply.status == 401 and not refresh_token.is_empty():
		# A 401 is a definite rejection. Never retry timeouts or unknown mutation results.
		if _accept(await _request("/v2/account/session/refresh", {"token": refresh_token}, _basic())):
			reply = await _request(path, body, "Bearer " + token, method)
	if reply.status == 401:
		clear_session()
	return reply

func call_rpc(id: String, payload: Dictionary = {}) -> bool:
	var reply := await _authorized("/v2/rpc/" + id, JSON.stringify(payload))
	if not reply.ok:
		last_error = reply.message
		return false
	var decoded: Variant = JSON.parse_string(reply.data.get("payload", ""))
	if not decoded is Dictionary or not decoded.get("state") is Dictionary:
		last_error = "Invalid server snapshot."
		return false
	state = decoded.state
	state_changed.emit()
	last_error = ""
	return true

func refresh_state() -> bool:
	return await call_rpc("get_state")

func link_email(email: String, password: String) -> bool:
	var reply := await _authorized("/v2/account/link/email", {"email": email.strip_edges(), "password": password})
	last_error = "" if reply.ok else reply.message
	return reply.ok

func logout() -> void:
	await _authorized("/v2/session/logout", {"token": token, "refresh_token": refresh_token})
	clear_session()

func delete_account() -> bool:
	var reply := await _authorized("/v2/account", null, HTTPClient.METHOD_DELETE)
	if reply.ok:
		clear_session()
	else:
		last_error = reply.message
	return reply.ok

func clear_session() -> void:
	token = ""
	refresh_token = ""
	state = {}
	DirAccess.remove_absolute(SESSION_PATH)
	state_changed.emit()
