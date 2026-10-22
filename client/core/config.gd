extends Node

var api_url: String = ""
var server_key: String = ""
var game_title: String = "Mobile Starter"
var error_message: String = ""

func _ready() -> void:
	if not FileAccess.file_exists("res://client/config.json"):
		error_message = "Run node tools/manage.mjs init, then configure."
		return
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://client/config.json"))
	if not data is Dictionary or not data.get("api_url", "").begins_with("http"):
		error_message = "Invalid client config. Run configure again."
		return
	api_url = data.api_url.trim_suffix("/")
	server_key = data.server_key
	game_title = data.game_title
