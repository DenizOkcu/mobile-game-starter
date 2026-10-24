extends SceneTree

static func require_isolation() -> bool:
	var args := OS.get_cmdline_user_args()
	var index := args.find("--expected-user-data")
	if index < 0 or index + 1 >= args.size():
		printerr("FAIL: Run Godot tests through tools/manage.mjs to isolate user data")
		return false
	var expected: String = args[index + 1].simplify_path()
	var actual := OS.get_user_data_dir().simplify_path()
	if actual != expected or not actual.get_file().begins_with("mobile-starter-godot-") or FileAccess.get_file_as_string("user://.test-isolation") != actual.get_file():
		printerr("FAIL: Godot test user-data isolation mismatch")
		return false
	return true

func _initialize() -> void:
	quit(0 if require_isolation() else 1)
