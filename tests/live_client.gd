extends SceneTree

func _initialize() -> void:
	if not load("res://tests/test_storage.gd").require_isolation():
		quit(1)
		return
	call_deferred("_run")

func _run() -> void:
	var flow: RefCounted = load("res://tests/live_flow.gd").new(root.get_node("Backend"))
	var success: bool = await flow.run()
	print("Live Godot transport checks complete")
	quit(0 if success else 1)
