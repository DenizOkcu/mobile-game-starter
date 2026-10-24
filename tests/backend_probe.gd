extends "res://client/core/backend.gd"

# Exercise session acceptance without writing the developer's session file.
func _persist() -> void:
	pass

var clear_calls: int = 0

func _clear_persisted_session() -> void:
	clear_calls += 1
