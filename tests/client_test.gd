extends SceneTree

var failed: bool = false

func check(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		printerr("FAIL: " + message)

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var main: Control = load("res://client/ui/main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	check(main.current_screen == "auth", "First launch shows account access")
	main._show("settings")
	check(main.content.get_child_count() >= 7, "Settings controls rendered")
	main._show("menu")
	check(main.current_screen == "menu", "Menu navigation")
	main._show("game")
	check(main.content.get_child_count() >= 3, "Game scene mounted")
	main.queue_free()
	print("Client navigation checks complete")
	quit(1 if failed else 0)
