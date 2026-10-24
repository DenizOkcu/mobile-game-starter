extends RefCounted

var backend: Node
var accounts: Array[Dictionary] = []
var failed: bool = false
var report: Callable

func _init(target: Node, reporter: Callable = Callable()) -> void:
	backend = target
	report = reporter

func check(condition: bool, message: String) -> bool:
	if not condition:
		failed = true
		if report.is_valid():
			report.call(message)
		else:
			printerr("FAIL: " + message)
	return condition

func remember(email: String, password: String) -> void:
	if backend._session != null and not backend._session.is_exception():
		accounts.append({"session": backend._session, "email": email, "password": password})

func run() -> bool:
	await exercise()
	# Each prerequisite returns to this cleanup path on failure. The runner also
	# isolates user:// and enforces a process deadline for unexpected script errors.
	await cleanup()
	return not failed

func exercise() -> void:
	var unique := Crypto.new().generate_random_bytes(16).hex_encode()
	var email := "godot-" + unique + "@example.com"
	var authenticated: bool = await backend.authenticate(email, unique, true)
	remember(email, unique) # Account creation can succeed even if bootstrap fails.
	if not check(authenticated and backend.state_ready, "Email auth and bootstrap"):
		return
	if not check(await backend.call_rpc("complete_tutorial"), "RPC string-envelope decoding"):
		return
	if not check(backend.state.get("coins") == 10, "Canonical reward applied"):
		return
	if not check(await backend.call_rpc("complete_tutorial"), "Replay"):
		return
	if not check(backend.state.get("coins") == 10, "Reward granted once"):
		return
	if not check(await backend.restore(), "Refresh token persistence and restore"):
		return
	if not check(await backend.delete_account(), "Account deletion"):
		return
	accounts.clear()
	if not check(not backend.state_ready, "Account deletion invalidates readiness"):
		return
	await exercise_guest(unique)

func exercise_guest(unique: String) -> void:
	# Call the SDK directly with a disposable device ID, never installation.cfg.
	var guest: NakamaSession = await backend._client.authenticate_device_async(unique)
	if not check(backend._accept(guest), "Official SDK guest auth"):
		return
	remember("", "")
	if not check(not backend.state_ready, "A new session waits for its own snapshot"):
		return
	if not check(await backend.refresh_state(), "Guest bootstrap"):
		return
	var guest_id: String = backend._session.user_id
	var email := "linked-" + unique + "@example.com"
	if not check(await backend.link_email(email, unique), "SDK email linking"):
		return
	accounts.back().email = email
	accounts.back().password = unique
	await backend.logout()
	if not check(backend.token.is_empty() and backend.state.is_empty() and not backend.state_ready, "SDK logout clears account state"):
		return
	if not check(await backend.authenticate(email, unique, false), "SDK linked email login"):
		return
	if not check(backend._session != null and backend._session.user_id == guest_id, "Linking preserves player identity"):
		return
	if not check(await backend.delete_account(), "Guest account cleanup"):
		return
	accounts.clear()

func cleanup() -> void:
	for account in accounts:
		var session: NakamaSession = account.session
		var result: NakamaAsyncResult = await backend._client.delete_account_async(session)
		if result.is_exception() and result.get_exception().status_code in [401, 403] and not account.email.is_empty():
			# Logout revokes the saved token. Login must never recreate the account
			# or delete a different identity when recovering cleanup credentials.
			var login: NakamaSession = await backend._client.authenticate_email_async(account.email, account.password, null, false)
			if not login.is_exception() and login.user_id == session.user_id:
				result = await backend._client.delete_account_async(login)
		check(not result.is_exception(), "Disposable account cleanup failed; a temporary account may remain on the test server")
	accounts.clear()
