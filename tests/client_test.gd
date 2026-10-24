extends SceneTree

const TouchTargets = preload("res://client/core/touch_targets.gd")

class TestClient extends NakamaClient:
	var frames: SceneTree
	var session_reply: NakamaSession
	var snapshot: Dictionary = {"display_name": "Pilot", "coins": 10, "tutorial_completed": true}
	var rpc_failure: bool = false
	var rpc_calls: int = 0
	var refresh_calls: int = 0
	var refresh_failure: bool = false
	var refresh_failure_status: int = 0
	var rpc_rejections: int = 0


	func _init(adapter: NakamaHTTPAdapter, tree: SceneTree) -> void:
		super(adapter, "test", "http", "127.0.0.1", 7350, 15)
		frames = tree

	func authenticate_email_async(_email: String, _password: String, _username = null, _create: bool = true, _vars = null) -> NakamaSession:
		await frames.process_frame
		return session_reply

	func session_refresh_async(_session: NakamaSession, _vars = null) -> NakamaSession:
		refresh_calls += 1
		await frames.process_frame
		if refresh_failure:
			return NakamaSession.new(null, false, null, NakamaException.new("Simulated refresh failure", refresh_failure_status))
		return session_reply

	func rpc_async(_session: NakamaSession, _id: String, _payload = null):
		rpc_calls += 1
		await frames.process_frame
		if rpc_rejections > 0:
			rpc_rejections -= 1
			return NakamaAPI.ApiRpc.new(NakamaException.new("Simulated access rejection", 401))
		if rpc_failure:
			return NakamaAPI.ApiRpc.new(NakamaException.new("Simulated timeout", 0))
		return NakamaAPI.ApiRpc.create(NakamaAPI, {"payload": JSON.stringify({"state": snapshot})})

var failed: bool = false

func check(condition: bool, message: String) -> void:
	if not condition:
		failed = true
		printerr("FAIL: " + message)

func session_for(user_id: String, lifetime: int = 3600) -> NakamaSession:
	var payload := Marshalls.utf8_to_base64(JSON.stringify({"uid": user_id, "exp": int(Time.get_unix_time_from_system()) + lifetime}))
	var token := "test." + payload + ".signature"
	return NakamaSession.new(token, false, token)

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

func check_touch_targets(node: Node, width: int) -> void:
	if node is BaseButton or node is LineEdit or node is Slider:
		var control := node as Control
		var transform := control.get_viewport().get_screen_transform() * control.get_global_transform_with_canvas()
		var screen_size: Vector2 = (transform * Rect2(Vector2.ZERO, control.size)).size
		check(screen_size.x >= 47.99 and screen_size.y >= 47.99, "Native touch target meets 48 units at width %d: %s" % [width, control.get_class()])
	for child in node.get_children():
		check_touch_targets(child, width)

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
	var recovering_session := session_for("recovering-player")
	probe._session = NakamaSession.new(null, false, recovering_session.refresh_token)
	probe.state = {}
	probe.state_ready = false
	client.session_reply = recovering_session
	client.snapshot = {"display_name": "Recovered", "coins": 0, "tutorial_completed": false}
	client.refresh_failure = true
	var refresh_before := client.refresh_calls
	var rpc_before := client.rpc_calls
	check(probe.has_recoverable_session(), "A refresh-only session is recoverable")
	check(not await probe.recover_session(), "Refresh-only recovery reports a network failure")
	check(probe.token.is_empty() and probe.has_recoverable_session() and not probe.state_ready, "A transient restore failure retains refresh credentials without unlocking the game")
	check(client.rpc_calls == rpc_before, "Failed credential refresh does not fetch or replay game actions")
	client.refresh_failure = false
	check(await probe.recover_session() and probe.state_ready, "Refresh-only recovery succeeds when connectivity returns")
	check(client.refresh_calls == refresh_before + 2 and probe._session.user_id == "recovering-player", "Recovery retries the existing account instead of creating a guest")
	# A rejected access token followed by a refresh outage must not delete
	# credentials or replay the original action. The probe suppresses file IO.
	probe._session = session_for("recovering-player")
	client.rpc_rejections = 1
	client.refresh_failure = true
	var clears_before: int = probe.clear_calls
	rpc_before = client.rpc_calls
	check(not await probe.refresh_state(), "A 401 followed by a refresh outage fails the request")
	check(probe.clear_calls == clears_before and probe.has_recoverable_session(), "Refresh network failure retains recoverable credentials")
	check(client.rpc_calls == rpc_before + 1, "An action is not replayed after a failed refresh")
	check(probe.last_error == "Connection lost or timed out. Refresh before trying again.", "The refresh network error replaces the original 401")
	client.refresh_failure = false
	check(await probe.recover_session(), "Connectivity recovery still uses the saved account")

	probe._session = session_for("recovering-player", -1)
	client.refresh_failure = true
	rpc_before = client.rpc_calls
	check(not await probe.refresh_state(), "Expired access token reports a refresh outage")
	check(probe.clear_calls == clears_before and client.rpc_calls == rpc_before, "Proactive refresh failure neither clears credentials nor sends the action")
	client.refresh_failure_status = 401
	check(not await probe.recover_session() and probe._session == null and not probe.state_ready, "Definitively rejected refresh credentials clear the session")
	check(probe.clear_calls == clears_before + 1, "Definitive refresh rejection clears persisted credentials once")

	client.refresh_failure = false
	client.refresh_failure_status = 0
	probe._session = session_for("recovering-player")
	client.rpc_rejections = 1
	rpc_before = client.rpc_calls
	check(await probe.refresh_state(), "Successful refresh permits one retry of a definitively rejected action")
	check(client.rpc_calls == rpc_before + 2, "401 recovery retries the action exactly once")
	client.rpc_rejections = 2
	check(not await probe.refresh_state() and probe._session == null, "A second 401 after successful refresh ends the session")
	probe.free()
	client.session_reply = session_for("first-player")

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
	button_named(main.content, "Retry connection").pressed.emit()
	check(main.pending, "Retry connection enters the serialized request flow")
	for frame in range(4):
		await process_frame
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
	# Reproduce initial restore timing: credentials remain, but there is no
	# access token yet. Keep the failure path in memory (no session-file writes).
	backend._session = NakamaSession.new(null, false, session_for("first-player").refresh_token)
	client.refresh_failure = true
	var before_resume_refresh := client.refresh_calls
	main._show("auth")
	main._notification(Node.NOTIFICATION_APPLICATION_RESUMED)
	main._notification(Node.NOTIFICATION_APPLICATION_RESUMED)
	for frame in range(4):
		await process_frame
	check(client.refresh_calls == before_resume_refresh + 1, "Resume retries refresh-only credentials exactly once")
	check(main.current_screen == "auth" and not main.pending and button_named(main.content, "Retry connection") != null, "Failed resume keeps an explicit recovery action")
	button_named(main.content, "Retry connection").pressed.emit()
	for frame in range(4):
		await process_frame
	check(client.refresh_calls == before_resume_refresh + 2, "Explicit retry also works with refresh-only credentials")
	client.refresh_failure = false
	backend._session = session_for("first-player")
	check(TouchTargets.minimum_for_scale(Vector2(0.5, 0.5)) == Vector2(96, 96), "360-wide previews require 96 design-unit targets")
	check(TouchTargets.minimum_for_scale(Vector2(1.5, 1.5), 3.0) == Vector2(96, 96), "3x mobile displays retain 48 logical-unit targets")
	check(TouchTargets.minimum_for_scale(Vector2(2.0, 2.0), 2.0) == Vector2(48, 48), "2x displays convert pixel scale back to logical target size")
	var original_size := root.size
	var original_scale_size := root.content_scale_size
	var original_scale_mode := root.content_scale_mode
	root.content_scale_size = Vector2i(720, 1280)
	root.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
	for width in [320, 360, 430]:
		root.size = Vector2i(width, int(width * 1280.0 / 720.0))
		for screen in ["auth", "settings", "game"]:
			backend.state_ready = true
			backend.state = client.snapshot
			main._show(screen)
			for frame in range(3):
				await process_frame
			check_touch_targets(main, width)
	main._show("account")
	button_named(main.content, "Delete account…").pressed.emit()
	for frame in range(3):
		await process_frame
	for child in main.get_children():
		if child is ConfirmationDialog:
			check_touch_targets(child, 430)
			child.queue_free()
	root.size = original_size
	root.content_scale_size = original_scale_size
	root.content_scale_mode = original_scale_mode
	backend.state_ready = false
	backend.state = {}
	backend._session = null
	backend._client = original_client
	backend.last_error = ""
	main.queue_free()
	adapter.queue_free()
	print("Client navigation and lifecycle checks complete")
	quit(1 if failed else 0)
