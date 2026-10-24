extends Control

const TouchTargets = preload("res://client/core/touch_targets.gd")

var margin: MarginContainer
var content: VBoxContainer
var status: Label
var player_summary: Label
var current_screen: String = "auth"
var pending: bool = false

func _ready() -> void:
	get_tree().quit_on_go_back = false
	var theme_resource := Theme.new()
	theme_resource.default_font_size = 26
	theme = theme_resource
	margin = MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 32)
	add_child(margin)
	get_viewport().size_changed.connect(_layout_changed)
	_safe_area()
	var scroll := ScrollContainer.new()
	scroll.follow_focus = true
	margin.add_child(scroll)
	content = VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 20)
	scroll.add_child(content)
	Backend.state_changed.connect(_update_player_summary)
	_show("auth")
	if not "--test" in OS.get_cmdline_user_args():
		await _run(Backend.restore, "menu")

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_RESUMED and is_node_ready() and not pending and Backend.has_recoverable_session():
		_run(Backend.recover_session, "menu" if current_screen == "auth" else "")
	if what == NOTIFICATION_WM_GO_BACK_REQUEST and not pending:
		_show("menu")

func _label(text: String, size: int = 26) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", size)
	content.add_child(label)
	return label

func _button(text: String, callback: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 96
	button.pressed.connect(callback)
	content.add_child(button)
	return button

func _field(placeholder: String, secret: bool = false) -> LineEdit:
	var field := LineEdit.new()
	field.placeholder_text = placeholder
	field.secret = secret
	field.custom_minimum_size.y = 96
	content.add_child(field)
	return field

func _show(screen: String) -> void:
	if screen in ["menu", "account", "game"] and (Backend.token.is_empty() or not Backend.state_ready):
		screen = "auth"
	current_screen = screen
	for child in content.get_children():
		content.remove_child(child)
		child.queue_free()
	_label(AppConfig.game_title, 44)
	player_summary = _label("", 24)
	_update_player_summary()
	match screen:
		"auth": _auth()
		"menu": _menu()
		"settings": _settings()
		"account": _account()
		"game":
			var game := preload("res://client/game/game.tscn").instantiate()
			game.back_requested.connect(func() -> void: _show("menu"))
			game.action_requested.connect(_complete_tutorial)
			content.add_child(game)
	status = _label(AppConfig.error_message if not AppConfig.error_message.is_empty() else "", 24)
	_update_touch_targets.call_deferred()

func _update_player_summary() -> void:
	if not is_instance_valid(player_summary):
		return
	player_summary.visible = Backend.state_ready and not Backend.token.is_empty()
	player_summary.text = "%s · %d coins" % [Backend.state.get("display_name", "Player"), Backend.state.get("coins", 0)]

func _auth() -> void:
	_label("Start a prototype", 32)
	if Backend.has_recoverable_session():
		_button("Retry connection", func() -> void: _run(Backend.recover_session, "menu"))
	_button("Play as guest", func() -> void: _run(Backend.authenticate, "menu"))
	_label("Or use an email account")
	var email := _field("Email")
	email.virtual_keyboard_type = LineEdit.KEYBOARD_TYPE_EMAIL_ADDRESS
	var password := _field("Password · at least 8 characters", true)
	_button("Log in", func() -> void: _email_login(email.text, password.text, false))
	_button("Create account", func() -> void:
		_email_login(email.text, password.text, true))
	_button("Settings", func() -> void: _show("settings"))

func _menu() -> void:
	_label("Ready to build", 32)
	_button("Play", func() -> void: _show("game"))
	_button("Refresh player state", func() -> void: _run(Backend.refresh_state, "menu"))
	_button("Account", func() -> void: _show("account"))
	_button("Settings", func() -> void: _show("settings"))
	_button("Log out", _logout)

func _settings() -> void:
	_label("Settings", 32)
	_label("Master volume")
	var volume := HSlider.new()
	volume.min_value = 0
	volume.max_value = 1
	volume.step = 0.05
	volume.value = Preferences.volume
	volume.custom_minimum_size.y = 96
	volume.value_changed.connect(func(value: float) -> void:
		Preferences.volume = value
		Preferences.save())
	content.add_child(volume)
	for setting in ["haptics", "reduced_motion"]:
		var toggle := CheckButton.new()
		toggle.text = setting.replace("_", " ").capitalize()
		toggle.button_pressed = Preferences.get(setting)
		toggle.custom_minimum_size.y = 96
		toggle.toggled.connect(func(value: bool) -> void:
			Preferences.set(setting, value)
			Preferences.save())
		content.add_child(toggle)
	_button("Back", func() -> void: _show("menu"))

func _account() -> void:
	_label("Account", 32)
	var display_name := _field("Display name · ASCII, up to 24 characters")
	display_name.text = Backend.state.get("display_name", "Player")
	display_name.max_length = 24
	_button("Save name", func() -> void: _run(Backend.call_rpc.bind("update_profile", {"display_name": display_name.text}), "account"))
	_label("Link email to keep your guest progress on other devices.")
	var email := _field("Email")
	var password := _field("Password · at least 8 characters", true)
	_button("Link email", func() -> void: _run(Backend.link_email.bind(email.text, password.text), "account", "Email linked. You can now log in on another device."))
	_button("Delete account…", func() -> void:
		var dialog := ConfirmationDialog.new()
		dialog.dialog_text = "Permanently delete this account and all progress?"
		dialog.confirmed.connect(func() -> void: _run(Backend.delete_account, "auth"))
		dialog.canceled.connect(dialog.queue_free)
		dialog.confirmed.connect(dialog.queue_free)
		add_child(dialog)
		dialog.popup_centered()
		_update_touch_targets.call_deferred())
	_button("Back", func() -> void: _show("menu"))

func _lock(node: Node, locked: bool) -> void:
	if node is BaseButton:
		if locked:
			node.set_meta("request_disabled", node.disabled)
			node.disabled = true
		elif node.has_meta("request_disabled"):
			node.disabled = bool(node.get_meta("request_disabled"))
			node.remove_meta("request_disabled")
	if node is LineEdit:
		if locked:
			node.set_meta("request_editable", node.editable)
			node.editable = false
		elif node.has_meta("request_editable"):
			node.editable = bool(node.get_meta("request_editable"))
			node.remove_meta("request_editable")
	for child in node.get_children():
		_lock(child, locked)

func _run(action: Callable, destination: String, success_message: String = "") -> void:
	if pending:
		return
	pending = true
	_lock(content, true)
	status.text = "Connecting…"
	var success: bool = await action.call()
	pending = false
	if success:
		if not destination.is_empty():
			_show(destination)
		_lock(content, false)
		status.text = success_message
	else:
		if not Backend.state_ready:
			_show("auth")
		_lock(content, false)
		status.text = Backend.last_error

func _complete_tutorial() -> void:
	Preferences.vibrate()
	await _run(Backend.call_rpc.bind("complete_tutorial"), "game")
	# Refresh after refusal/timeout; do not replay an uncertain write.
	if not Backend.last_error.is_empty() and not Backend.token.is_empty():
		await _run(Backend.refresh_state, "game", "State refreshed. Check whether the beacon is active.")

func _logout() -> void:
	if pending:
		return
	pending = true
	_lock(content, true)
	await Backend.logout()
	pending = false
	_show("auth")

func _email_login(email: String, password: String, create: bool) -> void:
	if password.length() < 8 or not "@" in email:
		status.text = "Enter an email and at least 8 password characters."
		return
	await _run(Backend.authenticate.bind(email, password, create), "menu")

func _update_touch_targets() -> void:
	if is_inside_tree():
		TouchTargets.apply_tree(self)

func _layout_changed() -> void:
	_safe_area()
	_update_touch_targets.call_deferred()

func _safe_area() -> void:
	if not OS.has_feature("mobile"):
		return
	var safe := DisplayServer.get_display_safe_area()
	var screen := DisplayServer.screen_get_size()
	if safe.size.x <= 0 or safe.size.y <= 0 or screen.x <= 0 or screen.y <= 0:
		return
	var scale_factor := get_viewport_rect().size / Vector2(screen)
	margin.add_theme_constant_override("margin_left", 32 + int(safe.position.x * scale_factor.x))
	margin.add_theme_constant_override("margin_top", 32 + int(safe.position.y * scale_factor.y))
	margin.add_theme_constant_override("margin_right", 32 + int((screen.x - safe.end.x) * scale_factor.x))
	margin.add_theme_constant_override("margin_bottom", 32 + int((screen.y - safe.end.y) * scale_factor.y))
