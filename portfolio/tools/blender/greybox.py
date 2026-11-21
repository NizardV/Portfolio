"""
Draws a skin (the rooms tagged Shape.skin in the game's plan) as a greybox model: straight walls, floors, ceilings of
60 cm tiles laid on each room's own grid, soffits where ceiling heights change, the solids standing there (pillars).

Reads tools/blender/plans/<skin>.json (from: node scripts/hub-export-plan.mjs <PLACE> <skin>) and writes
public/hub/models/skins/<skin>.glb. Usage, from portfolio/:
    "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe" --background --python tools/blender/greybox.py -- slice0

Same rules as the game, so what you see is what stops you:
- where rooms overlap, the later one (higher index) owns the floor and the ceiling there;
- only faces owned by a skinned room are kept: the rooms around are still drawn by the kit, openings stay open.
Axes: game (x, height, z) is Blender (x, -y, z) here; the glTF export (+Y up) turns it back into game coordinates.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh  # noqa: E402
import bpy  # noqa: E402
import lib  # noqa: E402

TALL = (-50.0, 200.0)  # a cutter's height: through every floor and ceiling


def prism(name, outline, z0, z1):
    """A closed vertical prism over a 2D outline (game x, z), from z0 to z1 (heights)."""
    bm = bmesh.new()
    bottom = [bm.verts.new((x, -z, z0)) for x, z in outline]
    top = [bm.verts.new((x, -z, z1)) for x, z in outline]
    bm.faces.new(bottom)
    bm.faces.new(top)
    n = len(outline)
    for k in range(n):
        bm.faces.new((bottom[k], bottom[(k + 1) % n], top[(k + 1) % n], top[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def boolean(obj, operation, operands):
    """Apply one boolean with a whole collection of operands (Manifold solver when this Blender has it)."""
    if not operands:
        return
    coll = bpy.data.collections.new(f"ops_{obj.name}")
    bpy.context.scene.collection.children.link(coll)
    for o in operands:
        coll.objects.link(o)
    mod = obj.modifiers.new("bool", "BOOLEAN")
    mod.operation = operation
    mod.operand_type = "COLLECTION"
    mod.collection = coll
    try:
        mod.solver = "MANIFOLD"
    except TypeError:
        mod.solver = "EXACT"
    deps = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
    obj.modifiers.remove(mod)
    old = obj.data
    obj.data = mesh
    bpy.data.meshes.remove(old)
    for o in operands:
        coll.objects.unlink(o)
    bpy.data.collections.remove(coll)


def bounds(outline):
    xs = [p[0] for p in outline]
    zs = [p[1] for p in outline]
    return min(xs), min(zs), max(xs), max(zs)


def overlaps(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def inside(x, z, outline):
    """Point in polygon (even-odd), game coordinates."""
    hit = False
    n = len(outline)
    for k in range(n):
        x0, z0 = outline[k]
        x1, z1 = outline[(k + 1) % n]
        if (z0 > z) != (z1 > z) and x < x0 + (z - z0) * (x1 - x0) / (z1 - z0):
            hit = not hit
    return hit


def owner(rooms, x, z):
    """The room that owns (x, z) in the game: the last one placed that contains it."""
    best = None
    for r in rooms:
        if inside(x, z, r["outline"]) and (best is None or r["index"] > best["index"]):
            best = r
    return best


def in_volume(rooms, solids, x, y, z):
    """Is (x, height y, z) inside the walkable volume? The owner's floor and ceiling bound it; solids are not in it."""
    r = owner(rooms, x, z)
    if r is None or not r["floor"] < y < r["ceil"]:
        return False
    return not any(inside(x, z, s["outline"]) and (s["h"] is None or y < s["h"]) for s in solids)


def build(skin):
    here = os.path.dirname(__file__)
    with open(os.path.join(here, "plans", f"{skin}.json"), encoding="utf-8") as f:
        plan = json.load(f)
    rooms = sorted(plan["rooms"], key=lambda r: r["index"])
    grid = plan["grid"]
    for r in rooms:
        r["box"] = bounds(r["outline"])

    lib.reset()
    # each room's own volume: its prism minus whatever later rooms take over (the game's ownership)
    tall = {r["index"]: prism(f"cut{r['index']}", r["outline"], *TALL) for r in rooms}
    owned = []
    for r in rooms:
        body = prism(f"room{r['index']}", r["outline"], r["floor"], r["ceil"])
        later = [tall[o["index"]] for o in rooms if o["index"] > r["index"] and overlaps(o["box"], r["box"])]
        boolean(body, "DIFFERENCE", later)
        if body.data.polygons:
            owned.append(body)
        else:
            bpy.data.objects.remove(body)
    for obj in tall.values():
        bpy.data.objects.remove(obj)

    space = owned[0]
    boolean(space, "UNION", owned[1:])
    for obj in owned[1:]:
        bpy.data.objects.remove(obj)
    cutters = [prism(f"solid{k}", s["outline"], -1.0, s["h"] if s["h"] else TALL[1]) for k, s in enumerate(plan["solids"])]
    boolean(space, "DIFFERENCE", cutters)
    for obj in cutters:
        bpy.data.objects.remove(obj)

    # seen from inside: turn the volume inside out, keep the faces the skinned rooms own, sort and map them
    # plain materials, named: the game dresses them (archi/Skin.tsx). Images packed in a .glb load from blob: URLs,
    # which the site's CSP refuses; the art pass will ship its textures as files.
    floor_m = lib.mat("floor", "#7d7152", 0.95)
    wall_m = lib.mat("wall", "#b9ae8a", 0.9)
    tile_m = lib.mat("tiles", "#e6e3d8", 0.95)
    me = space.data
    me.materials.clear()
    for m in (floor_m, wall_m, tile_m):
        me.materials.append(m)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    # triangles: a wall around an opening comes out of the union as one concave face whose centre lies in the opening;
    # judged as a whole it would go (or stay) with it. Each triangle is judged on its own.
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.normal_update()
    uv = bm.loops.layers.uv.verify()
    drop = []
    for face in bm.faces:
        n = face.normal
        c = face.calc_center_median()
        if n.z > 0.7:
            kind, sx, sz = 0, c.x, -c.y
        elif n.z < -0.7:
            kind, sx, sz = 2, c.x, -c.y
        else:
            kind, sx, sz = 1, c.x + n.x * 0.05, -(c.y + n.y * 0.05)
        r = owner(rooms, sx, sz)
        if r is None or not r["skinned"]:
            drop.append(face)
            continue
        # where two rooms' volumes touch, the union may keep their shared faces: walls standing in the middle of the
        # space. A real face has emptiness behind it (outside, a solid, above a lower ceiling, below a higher floor).
        bx, by, bz = c.x - n.x * 0.05, c.y - n.y * 0.05, c.z - n.z * 0.05
        if in_volume(rooms, plan["solids"], bx, bz, -by):
            drop.append(face)
            continue
        face.material_index = kind
        cos_a, sin_a = math.cos(r["angle"]), math.sin(r["angle"])
        cx, cz = r["centre"]
        tx, ty = -n.y, n.x  # along the wall, horizontally
        length = math.hypot(tx, ty) or 1.0
        for loop in face.loops:
            x, z, y = loop.vert.co.x, -loop.vert.co.y, loop.vert.co.z
            if kind == 0:
                loop[uv].uv = (x, z)
            elif kind == 2:
                # the same grid the game lays its lights on (archi/build.ts tilePanels): a tile per UV unit
                dx, dz = x - cx, z - cz
                loop[uv].uv = ((dx * cos_a - dz * sin_a) / grid, (dx * sin_a + dz * cos_a) / grid)
            else:
                loop[uv].uv = ((loop.vert.co.x * tx + loop.vert.co.y * ty) / length, y)
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    bm.to_mesh(me)
    bm.free()
    space.name = skin
    for o in list(bpy.context.scene.objects):
        if o is not space:
            bpy.data.objects.remove(o)
    path = lib.export(skin, "skins")
    print(f"SKIN {skin}: {len(me.polygons)} faces, {lib.tris()} triangles, {os.path.getsize(path) // 1024} KB -> {os.path.relpath(path, lib.ROOT)}")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if not args:
        raise SystemExit("usage: blender --background --python tools/blender/greybox.py -- <skin>")
    for name in args:
        build(name)
