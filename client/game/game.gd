extends VBoxContainer

signal back_requested
signal action_requested

func _ready() -> void:
	add_theme_constant_override("separation", 24)
	var title := Label.new()
	title.text = "Your first game loop"
	title.add_theme_font_size_override("font_size", 34)
	add_child(title)
	var description := Label.new()
	description.text = "Activate the beacon to complete the tutorial.\nThe server grants 10 coins once per account.\n\nReplace this scene with your game idea."
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(description)
	var beacon := Button.new()
	beacon.text = "Beacon active" if Backend.state.get("tutorial_completed", false) else "Activate beacon · +10 coins"
	beacon.custom_minimum_size.y = 160
	beacon.disabled = Backend.state.get("tutorial_completed", false)
	beacon.pressed.connect(func() -> void: action_requested.emit())
	add_child(beacon)
	var back := Button.new()
	back.text = "Back to menu"
	back.custom_minimum_size.y = 72
	back.pressed.connect(func() -> void: back_requested.emit())
	add_child(back)
