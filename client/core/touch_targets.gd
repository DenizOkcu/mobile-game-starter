extends RefCounted

# Screen-space hit area in Android dp / iOS points. Desktop previews use
# window units. Keep the native control; no visual artwork is generated here.
const MINIMUM_LOGICAL_SIZE: float = 48.0

static func minimum_for_scale(canvas_scale: Vector2, display_scale: float = 1.0) -> Vector2:
	var pixels := MINIMUM_LOGICAL_SIZE * maxf(display_scale, 1.0)
	return Vector2(ceilf(pixels / maxf(absf(canvas_scale.x), 0.001)), ceilf(pixels / maxf(absf(canvas_scale.y), 0.001)))

static func apply_tree(node: Node) -> void:
	if node is BaseButton or node is LineEdit or node is Slider:
		var control := node as Control
		var transform := control.get_viewport().get_screen_transform() * control.get_global_transform_with_canvas()
		var display_scale := DisplayServer.screen_get_scale() if OS.has_feature("mobile") else 1.0
		var required := minimum_for_scale(Vector2(transform.x.length(), transform.y.length()), display_scale)
		control.custom_minimum_size = control.custom_minimum_size.max(required)
	for child in node.get_children():
		apply_tree(child)
