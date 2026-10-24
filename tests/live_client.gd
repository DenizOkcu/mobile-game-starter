extends SceneTree

var failed: bool = false
var backend: Node

func check(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		printerr("FAIL: " + message + " " + backend.last_error)

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	backend = root.get_node("Backend")
	# Email auth avoids touching the developer's installation identity/session.
	# The runner saves/restores its session file and deletes its temporary account.
	var path := "user://session.cfg"
	var existed := FileAccess.file_exists(path)
	var previous := FileAccess.get_file_as_bytes(path) if existed else PackedByteArray()
	var unique := Crypto.new().generate_random_bytes(16).hex_encode()
	check(await backend.authenticate("godot-" + unique + "@example.com", unique, true), "Email auth and bootstrap")
	check(backend.state_ready, "Successful bootstrap unlocks protected screens")
	if not backend.token.is_empty():
		check(await backend.call_rpc("complete_tutorial"), "RPC string-envelope decoding")
		check(backend.state.get("coins") == 10, "Canonical reward applied")
		check(await backend.call_rpc("complete_tutorial"), "Replay")
		check(backend.state.get("coins") == 10, "Reward granted once")
		check(await backend.restore(), "Refresh token persistence and restore")
		check(await backend.delete_account(), "Account deletion")
		check(not backend.state_ready, "Account deletion invalidates readiness")
	# Exercise device auth without touching the installation identity file.
	var guest: NakamaSession = await backend._client.authenticate_device_async(unique)
	check(backend._accept(guest), "Official SDK guest auth")
	check(not backend.state_ready, "A new session waits for its own snapshot")
	if not backend.token.is_empty():
		check(await backend.refresh_state(), "Guest bootstrap")
		var guest_id: String = backend._session.user_id
		check(await backend.link_email("linked-" + unique + "@example.com", unique), "SDK email linking")
		await backend.logout()
		check(backend.token.is_empty() and backend.state.is_empty() and not backend.state_ready, "SDK logout clears account state")
		check(await backend.authenticate("linked-" + unique + "@example.com", unique, false), "SDK linked email login")
		check(backend._session.user_id == guest_id, "Linking preserves player identity")
		check(await backend.delete_account(), "Guest account cleanup")
	if existed:
		var file := FileAccess.open(path, FileAccess.WRITE)
		file.store_buffer(previous)
	else:
		DirAccess.remove_absolute(path)
	print("Live Godot transport checks complete")
	quit(1 if failed else 0)
