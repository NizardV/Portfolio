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


def export(name, subdir="", extras=False):
    """extras: also write the objects' custom properties (glTF extras, userData in three.js)."""
    path = os.path.join(OUT, subdir, f"{name}.glb")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_apply=True, export_cameras=False, export_lights=False, export_yup=True, export_extras=extras)
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


# ---------------------------------------------------------------- props (tools/blender/props/, skill hub-props)
# Parts are modelled at their final place in world coordinates, modifiers applied right away, then joined into one
# node per object (origin at the centre of the base, z = 0, front towards -Y).
PROP_PREVIEWS = os.path.join(PREVIEWS, "props")


def apply_mods(obj):
    """Bake the modifiers (bevel…) into the mesh, so the parts can be joined without losing them."""
    if obj.modifiers:
        ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = bpy.data.meshes.new_from_object(ev)
        old = obj.data
        obj.modifiers.clear()
        obj.data = mesh
        bpy.data.meshes.remove(old)
    return obj


def _bevel(obj, width, seg, angle=30):
    if width:
        m = bevel(obj, width, seg).modifiers[-1]
        m.angle_limit = math.radians(angle)
    return apply_mods(obj)


def rbox(name, size, loc, material, bev=0.004, seg=2, rot=(0, 0, 0)):
    """A box with real bevelled edges (2–10 mm: what catches the light)."""
    return _bevel(box(name, size, loc, material, rot=rot), bev, seg)


def rcyl(name, r, depth, loc, material, rot=(0, 0, 0), verts=16, bev=0.0, seg=1, r2=None):
    """A cylinder whose caps (not its sides) are bevelled."""
    return _bevel(cyl(name, r, depth, loc, material, rot=rot, verts=verts, r2=r2), bev, seg, angle=360 / verts + 10)


def block(name, end_a, end_b, material, bev=0.004, seg=2):
    """A hexahedron from two end quads (same winding): tapered legs, slanted panels."""
    bm = bmesh.new()
    a = [bm.verts.new(p) for p in end_a]
    b = [bm.verts.new(p) for p in end_b]
    bm.faces.new(a)
    bm.faces.new(b[::-1])
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    assign(o, material)
    return _bevel(o, bev, seg)


def bar_handle(name, length, loc, material, standoff=0.028, r=0.0055, rot_z=0.0):
    """A bar pull (drawer, cabinet): two standoffs and a grip, facing -Y, centred on its fixing points."""
    c, s = math.cos(rot_z), math.sin(rot_z)
    pts = [(-length / 2, 0, 0), (-length / 2, -standoff, 0), (length / 2, -standoff, 0), (length / 2, 0, 0)]
    pts = [(loc[0] + x * c - y * s, loc[1] + x * s + y * c, loc[2] + z) for x, y, z in pts]
    return tube(name, pts, r, material, verts=8)


def wear(obj, worn, where, edges_only=True):
    """Localised wear: faces (by default only the bevel faces: edges, corners) whose world centre passes `where`
    take the worn material. Never uniform: corners, bottoms, handles, front edges."""
    names = [m.name for m in obj.data.materials]
    if worn.name not in names:
        obj.data.materials.append(worn)
        names.append(worn.name)
    idx = names.index(worn.name)
    mw = obj.matrix_world
    for p in obj.data.polygons:
        n = p.normal
        if edges_only and max(abs(n.x), abs(n.y), abs(n.z)) > 0.985:
            continue
        if where(mw @ p.center):
            p.material_index = idx
    return obj


def drop_floor_faces(obj, eps=0.0015):
    """Delete the faces lying on the floor (never seen once the object is placed)."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    mw = obj.matrix_world
    dead = [f for f in bm.faces if f.normal.z < -0.99 and all((mw @ v.co).z < eps for v in f.verts)]
    bmesh.ops.delete(bm, geom=dead, context="FACES_ONLY")
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def join(name, parts):
    """One node per object: join the parts, origin at the world origin, smooth by angle (35°)."""
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    o.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.shade_smooth()
    o.data.set_sharp_from_angle(angle=math.radians(35))
    return o


def mesh_tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def world_verts(objs):
    return [o.matrix_world @ v.co for o in objs for v in o.data.vertices]


def mannequin():
    """A 1.75 m reference figure (contact sheets only, never exported)."""
    m = mat("ref_silhouette", "#34465a", 0.9)
    parts = [cyl(f"ref_leg{s}", 0.065, 0.86, (s * 0.09, 0, 0.43), m, verts=12) for s in (-1, 1)]
    parts += [cyl(f"ref_arm{s}", 0.045, 0.62, (s * 0.225, 0, 1.12), m, verts=12) for s in (-1, 1)]
    parts.append(rbox("ref_torso", (0.38, 0.22, 0.6), (0, 0, 1.15), m, bev=0.06, seg=3))
    parts.append(cyl("ref_neck", 0.05, 0.1, (0, 0, 1.48), m, verts=12))
    parts.append(sphere("ref_head", 0.11, (0, 0, 1.64), m))
    return join("ref_mannequin", parts)


def _grid_floor(lo, hi, step=0.6):
    """Light floor with dark lines every 60 cm (world aligned), a little larger than the subjects."""
    x0, x1 = math.floor((lo[0] - 0.3) / step) * step, math.ceil((hi[0] + 0.3) / step) * step
    y0, y1 = math.floor((lo[1] - 0.3) / step) * step, math.ceil((hi[1] + 0.3) / step) * step
    parts = [box("ref_floor", (x1 - x0, y1 - y0, 0.01), ((x0 + x1) / 2, (y0 + y1) / 2, -0.005), mat("ref_floor", "#c9c6bd", 0.9))]
    line = mat("ref_grid", "#55524c", 0.9)
    for i in range(round((x1 - x0) / step) + 1):
        parts.append(box(f"ref_gx{i}", (0.008, y1 - y0, 0.002), (x0 + i * step, (y0 + y1) / 2, 0.0005), line))
    for j in range(round((y1 - y0) / step) + 1):
        parts.append(box(f"ref_gy{j}", (x1 - x0, 0.008, 0.002), ((x0 + x1) / 2, y0 + j * step, 0.0005), line))
    return parts


def contact_sheet(name, nodes, title, res=900, figure=True, lift=False, gap=0.25):
    """Planche de contrôle (skill hub-props): face, 3/4, profil, dessus, orthographic so the 60 cm grid and the
    1.75 m figure give the scale; the nodes side by side across each view -> previews/props/<name>.png (2 x 2)."""
    import numpy as np
    from mathutils import Euler, Vector

    scene = bpy.context.scene
    keep = {o.name: (o.location.copy(), o.hide_render) for o in scene.objects}
    for o in scene.objects:
        o.hide_render = o not in nodes
    ref = mannequin() if figure else None
    subjects = list(nodes) + ([ref] if ref else [])
    views = [
        ("FACE", Vector((0, 1, 0))),
        ("3/4", Vector((-0.62, 0.85, -0.5)).normalized()),
        ("PROFIL", Vector((-1, 0, 0))),
        ("DESSUS", Vector((0, 0, -1))),
    ]
    sun = bpy.data.objects.new("ref_sun", bpy.data.lights.new("ref_sun", "SUN"))
    sun.data.energy = 3.2
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new("ref_world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.62, 0.63, 0.64, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.9
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 32
    scene.render.resolution_x = scene.render.resolution_y = res
    tmp = []
    os.makedirs(PROP_PREVIEWS, exist_ok=True)
    for k, (label, d) in enumerate(views):
        top = abs(d.z) > 0.99
        up = Vector((0, 1, 0)) if top else Vector((0, 0, 1))
        right = d.cross(up).normalized()
        upv = right.cross(d).normalized()
        cursor = 0.0
        for o in subjects:  # side by side across the view, 25 cm apart
            o.location = (0, 0, 0)
            bpy.context.view_layer.update()
            proj = [v.dot(right) for v in world_verts([o])]
            o.location = right * (cursor - min(proj))
            if lift == "floor":  # small wall props, detail sheet: bottom on the grid
                o.location.z = -min(v.z for v in world_verts([o]))
            elif lift:  # wall props: shown at their mounting height (glTF extra)
                o.location.z = o.get("mount_height", 0.0)
            bpy.context.view_layer.update()
            cursor += max(proj) - min(proj) + gap
        pts = world_verts(subjects)
        lo = [min(p[i] for p in pts) for i in range(3)]
        hi = [max(p[i] for p in pts) for i in range(3)]
        grid = _grid_floor(lo, hi)
        centre = Vector([(lo[i] + hi[i]) / 2 for i in range(3)])
        w = max(p.dot(right) for p in pts) - min(p.dot(right) for p in pts)
        h = max(p.dot(upv) for p in pts) - min(p.dot(upv) for p in pts)
        cam = bpy.data.objects.new("ref_cam", bpy.data.cameras.new("ref_cam"))
        scene.collection.objects.link(cam)
        cam.data.type = "ORTHO"
        cam.data.ortho_scale = max(w, h) * 1.2
        cam.data.clip_end = 100
        cam.location = centre - d * 20
        cam.rotation_euler = Euler((0, 0, 0)) if top else d.to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        txt = bpy.data.objects.new("ref_label", bpy.data.curves.new("ref_label", "FONT"))
        legend = "grille 60 cm, silhouette 1,75 m" if figure else "grille 60 cm"
        txt.data.body = f"{title} - {label}" if k == 0 else f"{label}  ({legend})"
        txt.data.size = cam.data.ortho_scale * 0.03
        txt.data.materials.append(mat("ref_text", "#101010", 1.0))
        scene.collection.objects.link(txt)
        txt.parent = cam
        txt.location = (-cam.data.ortho_scale * 0.47, cam.data.ortho_scale * 0.45, -1)
        path = os.path.join(PROP_PREVIEWS, f"_{name}_{k}.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        tmp.append(path)
        for o in grid + [cam, txt]:
            bpy.data.objects.remove(o)
    tiles = []
    for p in tmp:
        img = bpy.data.images.load(p)
        a = np.empty(res * res * 4, dtype=np.float32)
        img.pixels.foreach_get(a)
        tiles.append(a.reshape(res, res, 4))
        bpy.data.images.remove(img)
        os.remove(p)
    # Blender images are stored bottom row first: the first two views go on the upper half
    sheet = np.concatenate([np.concatenate(tiles[2:], axis=1), np.concatenate(tiles[:2], axis=1)], axis=0)
    sheet[res - 2 : res + 2, :, :3] = 0.15
    sheet[:, res - 2 : res + 2, :3] = 0.15
    out_path = os.path.join(PROP_PREVIEWS, f"{name}.png")
    out = bpy.data.images.new(f"sheet_{name}", res * 2, res * 2)
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = out_path
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    if ref:
        bpy.data.objects.remove(ref)
    bpy.data.objects.remove(sun)
    for o in scene.objects:
        if o.name in keep:
            o.location, o.hide_render = keep[o.name]
    return out_path


def lathe(name, profile, material, verts=24, loc=(0, 0, 0), a0=0.0, a1=math.tau):
    """A body of revolution around Z from a profile [(r, z), ...] bottom to top (bottles, bins, pots, bodies).
    r = 0 at an end closes it with a point; a partial arc (a0..a1) gives a curved panel (labels)."""
    full = abs(a1 - a0 - math.tau) < 1e-6
    n = verts if full else verts + 1
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r <= 1e-6:
            rings.append([bm.verts.new((loc[0], loc[1], loc[2] + z))])
            continue
        ring = []
        for i in range(n):
            a = a0 + (a1 - a0) * i / verts
            ring.append(bm.verts.new((loc[0] + r * math.cos(a), loc[1] + r * math.sin(a), loc[2] + z)))
        rings.append(ring)
    for lo, hi in zip(rings, rings[1:]):
        for i in range(verts if full else n - 1):
            j = (i + 1) % n
            if len(lo) == 1:
                bm.faces.new((lo[0], hi[j], hi[i]))
            elif len(hi) == 1:
                bm.faces.new((lo[i], lo[j], hi[0]))
            else:
                bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    # winding gives outward normals along the profile direction (no recalc: open shapes would flip)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    return assign(o, material)


def ring(name, r, thickness, loc, material, segs=24, sides=4, rot=(0, 0, 0)):
    """A wire ring (torus): rims, hoops, wire baskets."""
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=thickness, major_segments=segs, minor_segments=sides, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return assign(o, material)
