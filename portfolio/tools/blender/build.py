"""
Builds the hub's models. Usage (from portfolio/):
    "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe" --background --python tools/blender/build.py -- carousel house
Each model: a function below, registered in MODELS. Shared helpers in lib.py.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
import lib  # noqa: E402
from lib import blob, box, cyl, group, mat, sphere, tube  # noqa: E402

TAU = math.tau


def stripes(obj, mats, axis_angle=True):
    """Alternate materials face by face around the vertical axis (canopies, awnings)."""
    obj.data.materials.clear()
    for m in mats:
        obj.data.materials.append(m)
    for p in obj.data.polygons:
        c = p.center
        a = math.atan2(c.y, c.x) % TAU
        p.material_index = int(a / TAU * 16) % len(mats)
    return obj


# ---------------------------------------------------------------- carousel
def horse(name, color, loc, heading):
    """A carousel horse: a smooth body, neck, head, legs mid-gallop, saddle; on its golden pole."""
    body_m = mat(f"horse_{color}", color, 0.45)
    saddle = mat("saddle", "#b8352d", 0.5)
    gold = mat("gold", "#d9b45a", 0.3, 0.8)
    mane = mat("mane", "#7a5a3a", 0.8)
    parts = [
        sphere(f"{name}_body", 0.3, (0, 0, 0), body_m, scale=(0.75, 1.75, 0.9)),
        cyl(f"{name}_neck", 0.11, 0.55, (0, 0.42, 0.28), body_m, rot=(math.radians(-35), 0, 0), r2=0.08),
        sphere(f"{name}_head", 0.13, (0, 0.62, 0.52), body_m, scale=(0.75, 1.5, 0.85)),
        tube(f"{name}_mane", [(0, 0.3, 0.38), (0, 0.42, 0.52), (0, 0.55, 0.66)], 0.05, mane),
        tube(f"{name}_tail", [(0, -0.5, 0.08), (0, -0.66, 0.0), (0, -0.72, -0.25)], 0.045, mane),
        sphere(f"{name}_saddle", 0.2, (0, -0.05, 0.22), saddle, scale=(1.05, 1.2, 0.35)),
        cyl(f"{name}_ear", 0.025, 0.1, (0, 0.6, 0.66), body_m, r2=0.0),
    ]
    for i, (lx, ly, swing) in enumerate([(-0.11, 0.3, -30), (0.11, 0.3, -45), (-0.11, -0.3, 25), (0.11, -0.3, 40)]):
        a = math.radians(swing)
        parts.append(tube(f"{name}_leg{i}", [(lx, ly, -0.12), (lx, ly - math.sin(a) * 0.18, -0.36), (lx, ly - math.sin(a) * 0.1, -0.58)], 0.04, body_m))
    for p in parts:
        lib.smooth(p, 1) if "body" in p.name or "head" in p.name else None
    g = group(name, parts)
    g.location = loc
    g.rotation_euler = (0, 0, heading)
    pole = cyl(f"{name}_pole", 0.03, 2.6, (loc[0], loc[1], 1.75), gold, verts=12)
    return g, pole


def carousel():
    R = 2.2
    cream = mat("cream", "#f4ecd8", 0.6)
    red = mat("red", "#c8463c", 0.55)
    gold = mat("gold", "#d9b45a", 0.3, 0.8)
    wood = mat("deck", "#b88a5a", 0.7)
    bulb = mat("bulb", "#fff1c0", 0.4, emit="#ffe2a0", emit_strength=4)
    spin = []
    spin.append(cyl("base", R, 0.32, (0, 0, 0.16), cream, verts=48))
    spin.append(cyl("trim", R + 0.02, 0.08, (0, 0, 0.26), red, verts=48))
    spin.append(cyl("deck", R - 0.05, 0.03, (0, 0, 0.335), wood, verts=48))
    spin.append(cyl("column", 0.34, 3.0, (0, 0, 1.85), cream, verts=24))
    for k in range(8):
        a = k / 8 * TAU
        spin.append(box(f"panel{k}", (0.05, 0.22, 2.4), (math.cos(a) * 0.36, math.sin(a) * 0.36, 1.85), gold, rot=(0, 0, a)))
    valance = cyl("valance", R + 0.3, 0.38, (0, 0, 3.32), cream, verts=32)
    bpy.ops.object.select_all(action="DESELECT")
    stripes(valance, [cream, red])
    spin.append(valance)
    bpy.ops.mesh.primitive_cone_add(radius1=R + 0.35, radius2=0.12, depth=1.1, location=(0, 0, 4.05), vertices=32)
    canopy = bpy.context.active_object
    canopy.name = "canopy"
    lib.shade_smooth(canopy)
    stripes(canopy, [red, cream])
    spin.append(canopy)
    spin.append(sphere("finial", 0.16, (0, 0, 4.7), gold))
    spin.append(cyl("spire", 0.06, 0.4, (0, 0, 4.95), gold, r2=0.0))
    for k in range(28):
        a = k / 28 * TAU
        spin.append(sphere(f"bulb{k}", 0.05, (math.cos(a) * (R + 0.31), math.sin(a) * (R + 0.31), 3.12), bulb, segs=8))
    horses = []
    for k in range(6):
        a = k / 6 * TAU
        hx, hy = math.cos(a) * R * 0.68, math.sin(a) * R * 0.68
        g, pole = horse(f"horse{k}", "#f6f2ea" if k % 2 else "#e8c547", (hx, hy, 1.05), a + math.pi / 2)
        horses.append(g)
        spin.append(pole)
    root = group("spin", spin + horses)
    root.name = "spin"
    lib.finish("carousel", height=2.2)


# ---------------------------------------------------------------- house
def house(name="house", w=6.0, d=7.0, h=2.9, floors=2, color="#efd27a", trim="#f8f6ef", roof="#5a4a48", base="#8a7058", open_front=False, chimney=True):
    """A weatherboarded house: walls, white corner boards and window frames, gable roof, stone base."""
    walls = mat(f"walls_{color}", color, 0.85)
    white = mat("trim_white", trim, 0.6)
    rmat = mat(f"roof_{roof}", roof, 0.8)
    stone = mat("stone", base, 0.95)
    glass = mat("glass", "#2b3646", 0.15, 0.2)
    H = h * floors
    t = 0.18
    parts = []
    parts.append(box("base", (w + 0.1, d + 0.1, 0.45), (0, 0, 0.22), stone, bev=0.02))
    if open_front:
        parts += [
            box("back", (w, t, H), (0, d / 2 - t / 2, 0.45 + H / 2), walls),
            box("left", (t, d, H), (-w / 2 + t / 2, 0, 0.45 + H / 2), walls),
            box("right", (t, d, H), (w / 2 - t / 2, 0, 0.45 + H / 2), walls),
            box("front_l", (w / 2 - 0.65, t, H), (-(w / 2 + 0.65) / 2, -d / 2 + t / 2, 0.45 + H / 2), walls),
            box("front_r", (w / 2 - 0.65, t, H), ((w / 2 + 0.65) / 2, -d / 2 + t / 2, 0.45 + H / 2), walls),
            box("lintel", (1.3, t, H - 2.3), (0, -d / 2 + t / 2, 0.45 + 2.3 + (H - 2.3) / 2), walls),
            box("floor", (w - 2 * t, d - 2 * t, 0.04), (0, 0, 0.47), mat("planks", "#8a6a4a", 0.8)),
            box("ceiling", (w - 2 * t, d - 2 * t, 0.04), (0, 0, 0.45 + min(H, 3.0)), mat("ceiling_w", "#f2efe6", 1.0)),
        ]
    else:
        parts.append(box("body", (w, d, H), (0, 0, 0.45 + H / 2), walls))
    # weatherboards: shallow horizontal ribs
    for zz in [0.45 + 0.22 * i for i in range(int(H / 0.22))]:
        for sx, sy, lx, ly in [(w + 0.02, 0.02, 0, -d / 2 - 0.01), (w + 0.02, 0.02, 0, d / 2 + 0.01), (0.02, d + 0.02, -w / 2 - 0.01, 0), (0.02, d + 0.02, w / 2 + 0.01, 0)]:
            if open_front and ly < 0 and abs(lx) < 0.01 and zz < 2.75:
                for half in (-1, 1):
                    parts.append(box("rib", ((w / 2 - 0.65), 0.02, 0.03), (half * (w / 2 + 0.65) / 2, ly, zz), walls))
                continue
            parts.append(box("rib", (sx, sy, 0.03), (lx, ly, zz), walls))
    # corner boards and a band between the floors
    for cx in (-w / 2, w / 2):
        for cy in (-d / 2, d / 2):
            parts.append(box("corner", (0.16, 0.16, H), (cx, cy, 0.45 + H / 2), white))
    if floors > 1:
        for sx, sy, lx, ly in [(w + 0.06, 0.06, 0, -d / 2), (w + 0.06, 0.06, 0, d / 2), (0.06, d + 0.06, -w / 2, 0), (0.06, d + 0.06, w / 2, 0)]:
            parts.append(box("band", (sx, sy, 0.14), (lx, ly, 0.45 + h), white))

    def window(x, y, z, facing_x=False):
        ww, wh = 0.95, 1.25
        size = (0.04, ww, wh) if facing_x else (ww, 0.04, wh)
        parts.append(box("glass", size, (x, y, z), glass))
        fr = (0.07, ww + 0.16, 0.1) if facing_x else (ww + 0.16, 0.07, 0.1)
        sd = (0.07, 0.1, wh + 0.16) if facing_x else (0.1, 0.07, wh + 0.16)
        for dz in (-wh / 2 - 0.03, wh / 2 + 0.03):
            parts.append(box("frame", fr, (x, y, z + dz), white))
        for dd in (-ww / 2 - 0.03, ww / 2 + 0.03):
            parts.append(box("frame", sd, (x + (0 if not facing_x else 0), y + (dd if facing_x else 0), z) if facing_x else (x + dd, y, z), white))
        # muntins: a cross
        parts.append(box("muntin", (0.05, 0.03, wh) if facing_x else (0.03, 0.05, wh), (x, y, z), white))
        parts.append(box("muntin", (0.05, ww, 0.03) if facing_x else (ww, 0.05, 0.03), (x, y, z), white))

    for f in range(floors):
        zc = 0.45 + f * h + h * 0.55
        xs = [-w / 4 - 0.3, w / 4 + 0.3] if open_front and f == 0 else ([-w / 4, w / 4] if w < 7 else [-w / 3, 0, w / 3])
        for x in xs:
            window(x, -d / 2 - 0.03, zc)
            window(x, d / 2 + 0.03, zc)
        for y in ([-d / 4, d / 4] if d > 5 else [0]):
            window(-w / 2 - 0.03, y, zc, True)
            window(w / 2 + 0.03, y, zc, True)
    if not open_front:
        parts.append(box("door_frame", (1.2, 0.04, 2.25), (w * 0.18, -d / 2 - 0.02, 0.45 + 1.12), white))
        parts.append(box("door", (0.98, 0.03, 2.1), (w * 0.18, -d / 2 - 0.055, 0.45 + 1.05), mat("door_wood", "#6d5a48", 0.6)))
        parts.append(sphere("knob", 0.035, (w * 0.18 + 0.36, -d / 2 - 0.09, 0.45 + 1.0), mat("brass", "#c9a24a", 0.25, 0.9), segs=8))
    # gable roof (ridge along Y), with gable walls
    rise = w * 0.42
    top = 0.45 + H
    slope = math.atan2(rise, w / 2)
    span = math.hypot(rise, w / 2) + 0.35
    for s in (-1, 1):
        parts.append(box("roof", (span, d + 0.6, 0.12), (s * w / 4, 0, top + rise / 2), rmat, rot=(0, s * slope, 0), bev=0.01))
    mesh = bpy.data.meshes.new("gable")
    vs = [(-w / 2, 0, top), (w / 2, 0, top), (0, 0, top + rise)]
    mesh.from_pydata(vs, [], [(0, 1, 2)])
    for yy in (-d / 2, d / 2):
        o = bpy.data.objects.new("gable", mesh)
        o.location = (0, yy, 0)
        bpy.context.scene.collection.objects.link(o)
        sol = o.modifiers.new("thick", "SOLIDIFY")
        sol.thickness = 0.18
        lib.assign(o, walls)
        parts.append(o)
    if chimney:
        parts.append(box("chimney", (0.45, 0.45, rise * 0.9), (w * 0.22, d * 0.2, top + rise * 0.55), mat("brick", "#8a5a48", 0.9)))
    lib.finish(name, height=None)


def house_open():
    house("house_open", w=7, d=6, h=3.0, floors=1, color="#f4f1e6", roof="#7d8794", open_front=True, chimney=False)


def house_yellow():
    house("house_yellow", w=6, d=7, floors=2, color="#efd27a")


def house_cottage():
    house("house_cottage", w=8, d=6.5, h=3.2, floors=1, color="#e9e6f0", roof="#5e6b78")


# ---------------------------------------------------------------- the lone tree and its swing
def tree_swing():
    bark = mat("bark", "#5a4632", 0.95)
    leaves = mat("leaves", "#4d7f2e", 0.85)
    leaves2 = mat("leaves2", "#5f9238", 0.85)
    rope = mat("rope", "#cbbf9a", 0.9)
    seat_m = mat("seat", "#8a6a4a", 0.7)
    parts = [cyl("trunk", 0.55, 5.5, (0, 0, 2.75), bark, r2=0.32, verts=16)]
    branches = [((0, 0, 4.2), (3.6, 0.4, 6.4)), ((0, 0, 4.6), (-2.8, 1.2, 7.0)), ((0, 0, 5.0), (0.5, -3.0, 7.2)), ((0, 0, 5.3), (-0.6, 2.6, 7.8))]
    for i, (a, b) in enumerate(branches):
        mid = ((a[0] + b[0]) / 2 + 0.3, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + 0.4)
        parts.append(tube(f"branch{i}", [a, mid, b], 0.18, bark, verts=8))
    import random
    rnd = random.Random(7)
    centres = [(0, 0, 7.6, 3.0), (3.2, 0.6, 7.0, 2.2), (-2.6, 1.2, 7.4, 2.3), (0.6, -2.8, 7.4, 2.1), (-0.6, 2.6, 8.4, 2.0)]
    i = 0
    for cx, cy, cz, cr in centres:
        for _ in range(7):
            a = rnd.uniform(0, TAU)
            el = rnd.uniform(-0.4, 1.0)
            d = cr * rnd.uniform(0.35, 0.8)
            x = cx + math.cos(a) * math.cos(el) * d
            y = cy + math.sin(a) * math.cos(el) * d
            z = cz + math.sin(el) * d * 0.7
            parts.append(blob(f"leaf{i}", cr * rnd.uniform(0.38, 0.55), (x, y, z), leaves if i % 3 else leaves2, seed=i, rough=0.45, subdiv=3))
            i += 1
    # the swing hangs from the long branch: ropes + seat in their own node, pivoting at the branch
    pivot = (2.6, 0.32, 5.85)
    ropes = [tube(f"rope{s}", [(pivot[0], pivot[1] + s * 0.35, pivot[2]), (pivot[0], pivot[1] + s * 0.35, 0.65)], 0.018, rope) for s in (-1, 1)]
    seat = box("seat", (0.32, 0.85, 0.05), (pivot[0], pivot[1], 0.62), seat_m, bev=0.01)
    swing = group("swing", ropes + [seat], loc=pivot)
    swing.name = "swing"
    lib.finish("tree_swing", height=3)


# ---------------------------------------------------------------- power pole
def power_pole():
    wood = mat("pole_wood", "#6e5640", 0.9)
    porcelain = mat("porcelain", "#e8e6df", 0.3)
    parts = [cyl("pole", 0.16, 10, (0, 0, 5), wood, r2=0.12, verts=12)]
    parts.append(box("crossarm", (2.4, 0.12, 0.12), (0, 0, 9.3), wood))
    parts.append(box("brace", (0.06, 0.06, 0.9), (0.4, 0, 8.9), wood, rot=(0, math.radians(-35), 0)))
    parts.append(box("brace2", (0.06, 0.06, 0.9), (-0.4, 0, 8.9), wood, rot=(0, math.radians(35), 0)))
    for x in (-1.05, -0.4, 0.4, 1.05):
        parts.append(cyl("insulator", 0.05, 0.16, (x, 0, 9.44), porcelain, verts=10))
    parts.append(cyl("transformer", 0.28, 0.75, (0, 0.3, 7.6), mat("steel", "#8a8f94", 0.5, 0.6), verts=16))
    lib.finish("power_pole", height=4)


# ---------------------------------------------------------------- street lamp
def street_lamp():
    steel = mat("lamp_steel", "#6a6e72", 0.45, 0.7)
    glow = mat("lamp_glow", "#fff4d0", 0.3, emit="#ffe9b0", emit_strength=8)
    parts = [cyl("post", 0.09, 6.2, (0, 0, 3.1), steel, r2=0.06, verts=12)]
    arm = [(0, 0, 6.1), (0.15, 0, 6.6), (0.6, 0, 6.85), (1.5, 0, 6.85)]
    parts.append(tube("arm", arm, 0.05, steel))
    parts.append(sphere("head", 0.32, (1.75, 0, 6.8), steel, scale=(1.6, 0.8, 0.45)))
    parts.append(sphere("bulb", 0.22, (1.75, 0, 6.68), glow, scale=(1.5, 0.75, 0.3)))
    parts.append(cyl("foot", 0.18, 0.5, (0, 0, 0.25), steel, verts=12))
    lib.finish("street_lamp", height=4)


# ---------------------------------------------------------------- bathtub
def bathtub():
    enamel = mat("enamel", "#f4f2ec", 0.15)
    brass = mat("brass", "#c9a24a", 0.25, 0.9)
    water = mat("water", "#9cc8d8", 0.05)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=32, ring_count=16, location=(0, 0, 0.62))
    tub = bpy.context.active_object
    tub.name = "tub"
    tub.scale = (0.85, 0.42, 0.45)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for v in tub.data.vertices:
        v.select = v.co.z > 0.62
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="VERT")
    bpy.ops.object.mode_set(mode="OBJECT")
    tub.modifiers.new("shell", "SOLIDIFY").thickness = 0.04
    lib.shade_smooth(tub)
    lib.assign(tub, enamel)
    tube("rim", [(math.cos(a) * 0.85, math.sin(a) * 0.42, 0.62) for a in [k / 48 * TAU for k in range(49)]], 0.035, enamel)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl("leg", 0.05, 0.2, (sx * 0.5, sy * 0.2, 0.17), brass, r2=0.035, verts=10)
            sphere("claw", 0.06, (sx * 0.5, sy * 0.2, 0.06), brass, scale=(1.2, 1.2, 0.8), segs=10)
    bpy.ops.mesh.primitive_circle_add(radius=1, vertices=48, fill_type="NGON", location=(0, 0, 0.55))
    w = bpy.context.active_object
    w.name = "water"
    w.scale = (0.8, 0.38, 1)
    bpy.ops.object.transform_apply(scale=True)
    lib.assign(w, water)
    tube("tap", [(-0.8, 0, 0.6), (-0.8, 0, 0.82), (-0.65, 0, 0.86)], 0.025, brass)
    lib.finish("bathtub", height=1)


MODELS = {
    "carousel": carousel,
    "house_open": house_open,
    "house_yellow": house_yellow,
    "house_cottage": house_cottage,
    "tree_swing": tree_swing,
    "power_pole": power_pole,
    "street_lamp": street_lamp,
    "bathtub": bathtub,
}

if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else list(MODELS)
    for name in args or list(MODELS):
        lib.reset()
        lib._mats.clear()
        MODELS[name]()
