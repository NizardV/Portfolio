"""
Bakes the light of a skin: what every ceiling light of the place, and the light bouncing off walls, floors and ceilings,
puts on each surface, into one texture the game multiplies the surfaces' own textures by (a lightmap).

Why: a dozen live point lights following the player can't light an office floor: tiles burnt white around each tube,
black corners elsewhere. Baked once in Cycles, the light is soft, falls off along the walls, bounces off the carpet onto
the ceiling, and costs the game one texture read.

Used by skin.py (skip with SKIN_BAKE=0). Settings, from the environment: BAKE_SIZE (2048), BAKE_SAMPLES (256),
BAKE_WATTS (power of one 60 cm tile, 50), BAKE_SMOOTH (denoise blur, px, 1.5). Output: public/hub/models/skins/<skin>-light.jpg, read on the model's second UV
set ("lightmap", TEXCOORD_1). Stored in sRGB, divided by SCALE so values up to SCALE (light brighter than white paper
under it) survive 8 bits: the game multiplies back (archi/Skin.tsx, LIGHTMAP_SCALE).
"""
import math
import os

import bpy
import numpy as np

import lib

SCALE = 6.0  # keep in step with LIGHTMAP_SCALE in archi/Skin.tsx
SIZE = int(os.environ.get("BAKE_SIZE", "2048"))  # ~10 cm a texel over the Lobby: light is smooth
SAMPLES = int(os.environ.get("BAKE_SAMPLES", "256"))
# 50 W a tile: fewer, better spaced lights since 2026-11-23 (a tube every 3 m) need more each to light as before
WATTS = float(os.environ.get("BAKE_WATTS", "50"))
SMOOTH = float(os.environ.get("BAKE_SMOOTH", "1.5"))  # px, gaussian sigma of the denoise
# how much light each kind of surface sends back (its texture's mean colour, roughly): only the bounce depends on it
ALBEDO = {"f": 0.42, "w": 0.62, "c": 0.7, "trim": 0.12, "beam": 0.7}


def gpu(scene):
    """Cycles on the graphics card when there is one (OptiX, else CUDA), else the CPU."""
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA", "HIP", "METAL"):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
        except TypeError:
            continue
        devices = [d for d in prefs.devices if d.type == kind]
        if devices:
            for d in prefs.devices:
                d.use = d.type == kind
            scene.cycles.device = "GPU"
            return kind
    scene.cycles.device = "CPU"
    return "CPU"


def lightmap_uv(objs):
    """A second UV set where every face has its own room in one atlas, in proportion to its size."""
    for o in objs:
        layer = o.data.uv_layers.new(name="lightmap")
        o.data.uv_layers.active = layer
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    # flat islands (a wall, a floor), 8 px apart at 4096
    bpy.ops.uv.smart_project(angle_limit=math.radians(40), island_margin=8 / SIZE, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")  # the lightmap set stays active: Cycles bakes through the active UV set


def surfaces(objs, image, palette):
    """Bake materials: a plain diffuse of the surface's albedo, writing into the lightmap."""
    tint = lib.rgb(palette.get("light", "#ffe7a8"))
    for m in {s.material for o in objs for s in o.material_slots if s.material}:
        m.use_nodes = True
        nodes = m.node_tree.nodes
        bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        kind = m.name.split(":")[0]
        a = ALBEDO.get(kind, 0.6)
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (a, a * 0.95, a * 0.8, 1)
            bsdf.inputs["Roughness"].default_value = 1.0
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 0.0
        node = nodes.new("ShaderNodeTexImage")
        node.name = "lightmap"
        node.image = image
        nodes.active = node
    return tint


def lights(panels, tint):
    """An area light under every live ceiling light, facing down, sized like it."""
    made = []
    for x, y, z, angle, size, dead in panels:
        if dead:
            continue
        data = bpy.data.lights.new("tube", "AREA")
        data.shape = "SQUARE"
        data.size = size
        data.energy = WATTS * (size / 0.6) ** 2
        data.color = tint[:3]
        obj = bpy.data.objects.new("tube", data)
        obj.location = (x, -z, y - 0.01)  # game (x, height, z) -> Blender (x, -z, height)
        obj.rotation_euler = (0, 0, angle)
        bpy.context.scene.collection.objects.link(obj)
        made.append(obj)
    return made


def smooth(px, sigma):
    """Bake noise out: a gaussian blur over the baked pixels only (normalised by their coverage), so an island never
    takes the black of the empty atlas around it. Islands sit 8 px apart and bleed 6 px: a radius of 3 px stays inside."""
    w = h = int(math.sqrt(px.shape[0]))
    rgb = px[:, :3].reshape(h, w, 3)
    mask = (rgb.sum(axis=2) > 0).astype(np.float32)[..., None]
    r = 3
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()

    def blur(a):
        for axis in (0, 1):
            out = np.zeros_like(a)
            for i, wgt in enumerate(k):
                out += wgt * np.roll(a, i - r, axis=axis)
            a = out
        return a

    num = blur(rgb * mask)
    den = blur(mask)
    smoothed = np.where(mask > 0, num / np.maximum(den, 1e-6), rgb)
    px[:, :3] = smoothed.reshape(-1, 3)
    return px


def save(image, path):
    """Linear light / SCALE, to sRGB 8 bits, JPEG."""
    w, h = image.size
    px = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    px = smooth(px, SMOOTH)
    c = np.clip(px[:, :3] / SCALE, 0, 1)
    c = np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)
    out = bpy.data.images.new("lightmap-out", w, h, alpha=False, float_buffer=False)
    out.colorspace_settings.name = "sRGB"
    rgba = np.ones((w * h, 4), dtype=np.float32)
    rgba[:, :3] = c
    out.pixels.foreach_set(rgba.ravel())
    scene = bpy.context.scene
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 88
    out.save_render(path, scene=scene)
    peak = float(np.percentile(px[:, :3].max(axis=1), 99.5))
    return peak


def bake(skin, objs, panels, palette):
    scene = bpy.context.scene
    device = gpu(scene)
    lightmap_uv(objs)
    image = bpy.data.images.new("lightmap", SIZE, SIZE, alpha=False, float_buffer=True)
    image.colorspace_settings.name = "Non-Color"
    tint = surfaces(objs, image, palette)
    tubes = lights(panels, tint)
    world = scene.world or bpy.data.worlds.new("world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0  # no sky: indoors
    scene.cycles.samples = SAMPLES
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 3
    scene.cycles.use_light_tree = True
    bake_settings = scene.render.bake
    bake_settings.use_pass_direct = True
    bake_settings.use_pass_indirect = True
    bake_settings.use_pass_color = False
    bake_settings.margin = 6
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=6, use_clear=True)
    path = os.path.join(lib.OUT, "skins", f"{skin}-light.jpg")
    peak = save(image, path)
    # nothing of the bake goes into the model: no lights, and no image (packed images become blob: URLs, which the
    # site's CSP refuses)
    for o in tubes:
        bpy.data.objects.remove(o)
    for m in {s.material for o in objs for s in o.material_slots if s.material}:
        for n in [n for n in m.node_tree.nodes if n.name == "lightmap"]:
            m.node_tree.nodes.remove(n)
    bpy.data.images.remove(image)
    for o in objs:
        o.data.uv_layers.active = o.data.uv_layers[0]  # texture UVs first (TEXCOORD_0), the lightmap set second
    print(f"BAKE {skin}: {len(tubes)} lights, {SIZE} px, {SAMPLES} samples on {device}, light peak (99.5 %) {peak:.2f} of {SCALE} -> {os.path.relpath(path, lib.ROOT)}")
    return path
