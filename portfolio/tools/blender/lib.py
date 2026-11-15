"""
Shared helpers for the hub's model generators (run inside Blender, without its window):

    blender --background --python tools/blender/build.py -- <model> [<model> ...]

Every model is built from code (reusable, parametric), exported as a plain .glb (no Draco: the site's CSP has no
'wasm-unsafe-eval') to public/hub/models/, and rendered once to a preview PNG in tools/blender/previews/ to be
looked at before it goes in the game.
Units: metres, Y up in the game (Blender is Z up; the glTF exporter converts).
"""
import math
import os

import bmesh
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "hub", "models")
PREVIEWS = os.path.join(os.path.dirname(__file__), "previews")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"


def rgb(hexcode):
    h = hexcode.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, 1.0)


_mats = {}


def mat(name, color="#ffffff", rough=0.8, metal=0.0, emit=None, emit_strength=1.0, image=None):
    """A Principled BSDF material (the only kind glTF keeps), optionally with an image or an emission."""
    key = (name, color, rough, metal, emit, image.name if image else None)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgb(color)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit:
        bsdf.inputs["Emission Color"].default_value = rgb(emit)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    if image is not None:
        tex = m.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    _mats[key] = m
    return m


def image(name, w, h, fill):
    """An image drawn pixel by pixel: fill(x, y) -> (r, g, b) in 0..1 (sRGB). Packed into the .glb."""
    img = bpy.data.images.new(name, w, h)
    px = [0.0] * (w * h * 4)
    for y in range(h):
        for x in range(w):
            r, g, b = fill(x, y)
            i = (y * w + x) * 4
            px[i : i + 4] = (r, g, b, 1.0)
    img.pixels = px
    img.pack()
    return img


def assign(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)
    return obj


def bevel(obj, width=0.02, segments=2):
    m = obj.modifiers.new("bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "ANGLE"
    return obj


def smooth(obj, level=1):
    m = obj.modifiers.new("subsurf", "SUBSURF")
    m.levels = level
    m.render_levels = level
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def shade_smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def box(name, size, loc, material, rot=(0, 0, 0), bev=0.0):
    """A box from its size (x, y, z) and its centre, in Blender axes (Z up)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bev:
        bevel(o, bev)
    return assign(o, material)


def cyl(name, r, depth, loc, material, rot=(0, 0, 0), verts=24, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object
    o.name = name
    shade_smooth(o)
    return assign(o, material)


def sphere(name, r, loc, material, segs=16, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=segs, ring_count=max(6, segs // 2))
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    shade_smooth(o)
    return assign(o, material)


def blob(name, r, loc, material, seed=0, rough=0.25, subdiv=2):
    """A lumpy round mass (foliage, bushes): an icosphere pushed in and out by noise."""
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, location=loc, subdivisions=subdiv)
    o = bpy.context.active_object
    o.name = name
    tex = bpy.data.textures.new(f"{name}_noise", "CLOUDS")
    tex.noise_scale = max(0.25, r * 0.35)
    d = o.modifiers.new("lumps", "DISPLACE")
    d.texture = tex
    d.strength = r * rough
    d.texture_coords = "GLOBAL"
    tex.noise_basis = "VORONOI_F1" if seed % 2 else "BLENDER_ORIGINAL"
    shade_smooth(o)
    return assign(o, material)


def tube(name, points, r, material, verts=8):
    """A tube along a polyline (ropes, cables, rails, bent pipes)."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = r
    curve.bevel_resolution = max(1, verts // 4)
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for p, (x, y, z) in zip(spline.points, points):
        p.co = (x, y, z, 1)
    o = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.active_object
    shade_smooth(o)
    return assign(o, material)


def group(name, children, loc=(0, 0, 0)):
    """An empty that parents objects (exported as one node: the game can move it, e.g. a swing's seat)."""
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    for c in children:
        c.parent = e
        c.location = (c.location[0] - loc[0], c.location[1] - loc[1], c.location[2] - loc[2])
    return e


def tris():
    deps = bpy.context.evaluated_depsgraph_get()
    n = 0
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            ev = o.evaluated_get(deps)
            m = ev.to_mesh()
            n += sum(len(p.vertices) - 2 for p in m.polygons)
            ev.to_mesh_clear()
    return n


def export(name, subdir=""):
    path = os.path.join(OUT, subdir, f"{name}.glb")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_apply=True, export_cameras=False, export_lights=False, export_yup=True)
    return path


def preview(name, distance=None, height=None, target=(0, 0, None)):
    """A quick EEVEE render from three-quarters, soft daylight, to check the model by eye."""
    scene = bpy.context.scene
    objs = [o for o in scene.objects if o.type == "MESH"]
    lo = [min(v[i] for o in objs for v in [o.matrix_world @ c.co for c in o.data.vertices]) for i in range(3)]
    hi = [max(v[i] for o in objs for v in [o.matrix_world @ c.co for c in o.data.vertices]) for i in range(3)]
    size = max(hi[i] - lo[i] for i in range(3))
    cx, cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
    cz = target[2] if target[2] is not None else (lo[2] + hi[2]) / 2
    d = distance or size * 1.6
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    cam.location = (cx + d * 0.75, cy - d * 0.95, cz + (height if height is not None else d * 0.45))
    direction = (cx - cam.location[0], cy - cam.location[1], cz - cam.location[2])
    cam.rotation_mode = "XYZ"
    cam.rotation_euler = (math.atan2(math.hypot(direction[0], direction[1]), -direction[2]), 0, math.atan2(direction[1], direction[0]) - math.pi / 2)
    scene.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3
    sun.rotation_euler = (0.7, 0.2, 0.6)
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.62, 0.72, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    os.makedirs(PREVIEWS, exist_ok=True)
    scene.render.filepath = os.path.join(PREVIEWS, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    # leave the scene as it was for the export
    bpy.data.objects.remove(cam)
    bpy.data.objects.remove(sun)


def finish(name, subdir="", **view):
    """Export first (without camera and light), then render the preview."""
    path = export(name, subdir)
    n = tris()
    preview(name, **view)
    print(f"MODEL {name}: {n} triangles, {os.path.getsize(path) // 1024} KB -> {os.path.relpath(path, ROOT)}")
