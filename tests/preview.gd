# Optional visual inspection: Godot --path . --script res://tests/preview.gd -- --test
extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var main: Control = load("res://client/ui/main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("/tmp/mobile-starter-auth.png")
	main._show("settings")
	await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("/tmp/mobile-starter-settings.png")
	main.queue_free()
	quit()
