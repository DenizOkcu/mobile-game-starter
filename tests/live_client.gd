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
	if not backend.token.is_empty():
		check(await backend.call_rpc("complete_tutorial"), "RPC string-envelope decoding")
		check(backend.state.get("coins") == 10, "Canonical reward applied")
		check(await backend.call_rpc("complete_tutorial"), "Replay")
		check(backend.state.get("coins") == 10, "Reward granted once")
		check(await backend.restore(), "Refresh token persistence and restore")
		check(await backend.delete_account(), "Account deletion")
	if existed:
		var file := FileAccess.open(path, FileAccess.WRITE)
		file.store_buffer(previous)
	else:
		DirAccess.remove_absolute(path)
	print("Live Godot transport checks complete")
	quit(1 if failed else 0)
