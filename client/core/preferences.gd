extends Node

var volume: float = 0.8
var haptics: bool = true
var reduced_motion: bool = false
const PATH := "user://preferences.cfg"

func _ready() -> void:
	var config := ConfigFile.new()
	if config.load(PATH) == OK:
		volume = clampf(float(config.get_value("audio", "volume", 0.8)), 0.0, 1.0)
		haptics = bool(config.get_value("accessibility", "haptics", true))
		reduced_motion = bool(config.get_value("accessibility", "reduced_motion", false))
	apply()

func apply() -> void:
	AudioServer.set_bus_volume_db(0, linear_to_db(maxf(volume, 0.0001)))
	AudioServer.set_bus_mute(0, volume == 0.0)

func save() -> void:
	apply()
	var config := ConfigFile.new()
	config.set_value("audio", "volume", volume)
	config.set_value("accessibility", "haptics", haptics)
	config.set_value("accessibility", "reduced_motion", reduced_motion)
	config.save(PATH)

func vibrate() -> void:
	if haptics and OS.has_feature("mobile"):
		Input.vibrate_handheld(35)
