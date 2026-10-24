extends SceneTree

class TestClient extends NakamaClient:
	var frames: SceneTree
	var session_reply: NakamaSession
	var snapshot: Dictionary = {"display_name": "Pilot", "coins": 10, "tutorial_completed": true}
	var rpc_failure: bool = false
	var rpc_calls: int = 0

	func _init(adapter: NakamaHTTPAdapter, tree: SceneTree) -> void:
		super(adapter, "test", "http", "127.0.0.1", 7350, 15)
		frames = tree

	func authenticate_email_async(_email: String, _password: String, _username = null, _create: bool = true, _vars = null) -> NakamaSession:
		await frames.process_frame
		return session_reply

	func session_refresh_async(_session: NakamaSession, _vars = null) -> NakamaSession:
		await frames.process_frame
		return session_reply

	func rpc_async(_session: NakamaSession, _id: String, _payload = null):
		rpc_calls += 1
		await frames.process_frame
		if rpc_failure:
			return NakamaAPI.ApiRpc.new(NakamaException.new("Simulated timeout", 0))
		return NakamaAPI.ApiRpc.create(NakamaAPI, {"payload": JSON.stringify({"state": snapshot})})

var failed: bool = false

func check(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		printerr("FAIL: " + message)

func session_for(user_id: String) -> NakamaSession:
	var payload := Marshalls.utf8_to_base64(JSON.stringify({"uid": user_id, "exp": int(Time.get_unix_time_from_system()) + 3600}))
	return NakamaSession.new("test." + payload + ".signature")

func button_named(node: Node, text: String) -> Button:
	for child in node.get_children():
		if child is Button and child.text == text:
			return child
	return null

func game_in(main: Control) -> Node:
	for child in main.content.get_children():
		if child.has_signal("action_requested"):
			return child
	return null

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var backend := root.get_node("Backend")
	check(backend._client != null, "Official Nakama SDK client initialized")
	check(not backend._client.auto_retry, "SDK cannot replay uncertain mutations")
	check(not backend._client.auto_refresh, "Wrapper persists refreshed sessions")
	var original_client: NakamaClient = backend._client
	var adapter := NakamaHTTPAdapter.new()
	root.add_child(adapter)
	var client := TestClient.new(adapter, self)
	client.session_reply = session_for("first-player")

	var probe: Node = load("res://tests/backend_probe.gd").new()
	probe._client = client
	client.rpc_failure = true
	check(not await probe.authenticate("pilot@example.com", "test-password", false), "Authentication reports failed bootstrap")
	check(not probe.token.is_empty() and not probe.state_ready and probe.state.is_empty(), "A session alone does not mark player state ready")
	client.rpc_failure = false
	check(await probe.refresh_state() and probe.state_ready, "Bootstrap retry makes state ready")
	check(probe._accept(session_for("first-player")) and probe.state_ready, "Same-account token refresh preserves readiness")
	check(probe._accept(session_for("second-player")) and not probe.state_ready and probe.state.is_empty(), "Account switching discards the previous snapshot")
	check(await probe.refresh_state() and probe.state_ready, "New account can bootstrap")
	check(probe._accept(session_for("second-player"), true) and not probe.state_ready, "Fresh authentication requires another bootstrap even for the same account")
	client.snapshot = {}
	check(not await probe.refresh_state() and not probe.state_ready, "Empty snapshots cannot unlock gameplay")
	probe.free()

	# Use in-memory sessions and transport only; no live accounts or save writes.
	backend._client = client
	backend._session = session_for("first-player")
	backend.state = {}
	backend.state_ready = false
	var main: Control = load("res://client/ui/main.tscn").instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	check(main.current_screen == "auth", "First launch shows account access")
	check(not quit_on_go_back, "System Back cannot automatically quit the app")
	for destination in ["menu", "account", "game"]:
		main._show(destination)
		check(main.current_screen == "auth", "Bootstrap guard protects " + destination)
	main._show("settings")
	check(main.content.get_child_count() >= 7, "Settings controls rendered")
	button_named(main.content, "Back").pressed.emit()
	check(main.current_screen == "auth", "Settings Back cannot bypass failed bootstrap")
	main._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	check(main.current_screen == "auth", "System Back cannot bypass failed bootstrap")

	client.snapshot = {"display_name": "Pilot", "coins": 0, "tutorial_completed": false}
	await main._run(backend.refresh_state, "menu")
	check(main.current_screen == "menu" and backend.state_ready, "Successful recovery enters the menu")
	main._show("game")
	var game := game_in(main)
	var instance_id := game.get_instance_id()
	game.set_meta("run_progress", 42)
	var disabled_control := Button.new()
	disabled_control.disabled = true
	game.add_child(disabled_control)
	client.snapshot = {"display_name": "Restored Pilot", "coins": 10, "tutorial_completed": true}
	var calls_before := client.rpc_calls
	main._notification(Node.NOTIFICATION_APPLICATION_RESUMED)
	check(main.pending, "Resume locks concurrent actions while refreshing")
	main._notification(Node.NOTIFICATION_APPLICATION_RESUMED)
	main._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	check(main.current_screen == "game", "System Back is ignored during a pending request")
	for frame in range(4):
		await process_frame
	check(client.rpc_calls == calls_before + 1, "Repeated resume does not start overlapping refreshes")
	check(game_in(main).get_instance_id() == instance_id and game.get_meta("run_progress") == 42, "Resume preserves the active game and its run state")
	check(main.player_summary.text == "Restored Pilot · 10 coins", "Resume updates the player summary in place")
	check(disabled_control.disabled, "Successful resume preserves an already disabled game control")

	client.rpc_failure = true
	main._notification(Node.NOTIFICATION_APPLICATION_RESUMED)
	for frame in range(4):
		await process_frame
	check(game_in(main).get_instance_id() == instance_id and not main.pending, "Network failure keeps the run and unlocks navigation")
	check(disabled_control.disabled, "Unlocking after failure preserves a disabled control")
	check(not main.status.text.is_empty(), "Resume failure is visible")
	client.rpc_failure = false
	main._notification(Node.NOTIFICATION_APPLICATION_RESUMED)
	for frame in range(4):
		await process_frame
	check(game_in(main).get_instance_id() == instance_id and main.status.text.is_empty(), "A later resume recovers without resetting the run")
	main._notification(Node.NOTIFICATION_WM_GO_BACK_REQUEST)
	check(main.current_screen == "menu", "System Back navigates from game to menu")
	backend.state_ready = false
	backend.state = {}
	main._show("game")
	check(main.current_screen == "auth", "Invalidated bootstrap closes protected navigation")
	backend._session = null
	backend._client = original_client
	backend.last_error = ""
	main.queue_free()
	adapter.queue_free()
	print("Client navigation and lifecycle checks complete")
	quit(1 if failed else 0)
