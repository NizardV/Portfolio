"""
Builds a skin: the rooms tagged Shape.skin in the game's plan, drawn from that very plan instead of the kit.

Reads tools/blender/plans/<skin>.json (from: node scripts/hub-export-plan.mjs <PLACE> <skin>) and writes
public/hub/models/skins/<skin>.glb. Usage, from portfolio/:
    "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe" --background --python tools/blender/skin.py -- lobby

What it makes, all derived from the plan (the layout may be mad, the building is built properly):
- each room's volume (floor, sloping on a ramp, up to its ceiling) minus what later rooms take over: where rooms
  overlap, the later one owns floor and ceiling, as in the game; all united, minus the solids (pillars, partitions);
- only the faces skinned rooms own, judged triangle by triangle; faces with the volume behind them (inner) removed;
- materials named after the game's surfaces ("f:carpet", "w:wallpaper", "c:ceiling", "trim", "beam"): the game dresses
  them with its own textures (archi/Skin.tsx). UVs in metres; a ceiling's along its room's 60 cm tile grid;
- a baseboard along every wall foot; a beam wherever two ceiling grids meet at the same height (a real building changes
  its grid under a beam, never in the open);
- ceiling lights inside the tiles: one lit 60 cm tile, or 2 x 2 tiles in big rooms (never under a low ceiling), on the room's grid, clear of walls
  and beams. Stored in the model (extras "panels" on the "skin" node) for the game to light exactly those.
- the light itself, baked in Cycles (bake.py): <skin>-light.jpg on a second UV set; SKIN_BAKE=0 skips it.
Axes: game (x, height, z) is Blender (x, -y, z); the glTF export (+Y up) turns it back into game coordinates.
"""
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bmesh  # noqa: E402
import bpy  # noqa: E402
import lib  # noqa: E402

TALL = (-60.0, 200.0)  # a cutter's height: through every floor and ceiling
GRID = 0.6  # a ceiling tile
CELL = 8.0  # the spatial index of rooms


# ---------------------------------------------------------------- the plan, in 2D
def floor_at(r, x, z):
    f = r["ramp"]
    if not f:
        return r["floor"]
    dx, dz = f["bx"] - f["ax"], f["bz"] - f["az"]
    t = ((x - f["ax"]) * dx + (z - f["az"]) * dz) / ((dx * dx + dz * dz) or 1)
    return f["ha"] + (f["hb"] - f["ha"]) * min(1.0, max(0.0, t))


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


class Plan:
    """The rooms and solids, with a coarse grid so a point only tests the rooms near it."""

    def __init__(self, plan):
        self.rooms = sorted(plan["rooms"], key=lambda r: r["index"])
        self.solids = plan["solids"]
        self.cells = {}
        for r in self.rooms:
            r["box"] = bounds(r["outline"])
            x0, z0, x1, z1 = r["box"]
            for i in range(math.floor(x0 / CELL), math.floor(x1 / CELL) + 1):
                for j in range(math.floor(z0 / CELL), math.floor(z1 / CELL) + 1):
                    self.cells.setdefault((i, j), []).append(r)
        for s in self.solids:
            s["box"] = bounds(s["outline"])

    def owner(self, x, z):
        """The room that owns (x, z) in the game: the last one placed that contains it."""
        best = None
        for r in self.cells.get((math.floor(x / CELL), math.floor(z / CELL)), ()):
            if (best is None or r["index"] > best["index"]) and inside(x, z, r["outline"]):
                best = r
        return best

    def ceiling(self, x, z):
        """The ceiling seen at (x, z): the highest of the rooms there (a later, lower room owns the floor, not the sky)."""
        return max((r["ceil"] for r in self.cells.get((math.floor(x / CELL), math.floor(z / CELL)), ()) if inside(x, z, r["outline"])), default=None)

    def in_volume(self, x, y, z):
        """Is (x, height y, z) in the walkable volume? Owner's floor, highest ceiling there; solids are not in it."""
        r = self.owner(x, z)
        if r is None or not floor_at(r, x, z) < y < self.ceiling(x, z):
            return False
        for s in self.solids:
            b = s["box"]
            if b[0] <= x <= b[2] and b[1] <= z <= b[3] and inside(x, z, s["outline"]) and (s["h"] is None or y < s["base"] + s["h"]):
                return False
        return True


def inset(outline, d):
    """A convex outline moved d inwards (every edge shifted along its inner normal, corners re-intersected)."""
    n = len(outline)
    area = sum(outline[k][0] * outline[(k + 1) % n][1] - outline[(k + 1) % n][0] * outline[k][1] for k in range(n))
    sign = 1 if area > 0 else -1
    lines = []
    for k in range(n):
        (x0, z0), (x1, z1) = outline[k], outline[(k + 1) % n]
        length = math.hypot(x1 - x0, z1 - z0) or 1
        nx, nz = -(z1 - z0) / length * sign, (x1 - x0) / length * sign
        lines.append(((x0 + nx * d, z0 + nz * d), (x1 - x0, z1 - z0)))
    out = []
    for k in range(n):
        (px, pz), (dx, dz) = lines[k - 1]
        (qx, qz), (ex, ez) = lines[k]
        det = dx * ez - dz * ex
        if abs(det) < 1e-12:
            out.append((qx, qz))
            continue
        t = ((qx - px) * ez - (qz - pz) * ex) / det
        out.append((px + dx * t, pz + dz * t))
    return out


def frame(r):
    """A room's tile grid: cos, sin of its angle, and its centre (the origin). Same as archi/build.ts tileFrame."""
    return math.cos(r["angle"]), math.sin(r["angle"]), r["centre"][0], r["centre"][1]


# ---------------------------------------------------------------- volumes
def prism(name, outline, bottom, top):
    """A closed vertical prism over a 2D outline (game x, z); bottom is a height or a function of (x, z) (a ramp)."""
    bm = bmesh.new()
    low = [bm.verts.new((x, -z, bottom(x, z) if callable(bottom) else bottom)) for x, z in outline]
    high = [bm.verts.new((x, -z, top)) for x, z in outline]
    bm.faces.new(low)
    bm.faces.new(high)
    n = len(outline)
    for k in range(n):
        bm.faces.new((low[k], low[(k + 1) % n], high[(k + 1) % n], high[k]))
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
        mod.solver = os.environ.get("SKIN_SOLVER", "EXACT")  # Manifold lost floors where many rooms overlap
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


def volume(plan):
    """The walkable volume as one closed mesh object, the game's ownership included."""
    rooms = plan.rooms
    # cutters 5 mm inside the later room: neighbouring volumes then overlap a little instead of touching face to face,
    # which booleans leave as inner faces fused with the real walls on the same plane (walls standing in the open)
    # A later room takes the floor and its own height; above its ceiling, a taller earlier room keeps its volume: the
    # highest ceiling wins (else a door's throat, a landing, hang as a box under the room's ceiling).
    tall = {r["index"]: prism(f"cut{r['index']}", inset(r["outline"], 0.005), TALL[0], TALL[1] if r["open"] else r["ceil"]) for r in rooms}
    owned = []
    for r in rooms:
        body = prism(f"room{r['index']}", r["outline"], lambda x, z, r=r: floor_at(r, x, z), r["ceil"])
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
    cutters = [prism(f"solid{k}", s["outline"], TALL[0], s["base"] + s["h"] if s["h"] else TALL[1]) for k, s in enumerate(plan.solids)]
    boolean(space, "DIFFERENCE", cutters)
    for obj in cutters:
        bpy.data.objects.remove(obj)
    return space


# ---------------------------------------------------------------- faces: keep, sort, map
class Slots:
    """Material slots by surface name; the colours are placeholders, the game dresses them."""

    def __init__(self, me):
        self.me = me
        self.names = []
        me.materials.clear()

    def __call__(self, name):
        if name not in self.names:
            self.names.append(name)
            self.me.materials.append(lib.mat(name, "#b9ae8a", 0.9))
        return self.names.index(name)


def classify(plan, bm, slots):
    """Keep the faces skinned rooms own (triangles), give each its surface and UVs, note who owns each ceiling face."""
    uv = bm.loops.layers.uv.verify()
    own = bm.faces.layers.int.new("owner")
    drop = []
    for face in bm.faces:
        n = face.normal
        c = face.calc_center_median()
        if n.z > 0.7:
            kind, sx, sz = "f", c.x, -c.y
        elif n.z < -0.7:
            kind, sx, sz = "c", c.x, -c.y
        else:
            kind, sx, sz = "w", c.x + n.x * 0.05, -(c.y + n.y * 0.05)
        r = plan.owner(sx, sz)
        if kind == "c" and r is not None:
            # the room this ceiling belongs to: the one at that height (the floor's owner may be a lower, later room)
            at = [o for o in plan.cells.get((math.floor(sx / CELL), math.floor(sz / CELL)), ()) if abs(o["ceil"] - c.z) < 0.01 and inside(sx, sz, o["outline"])]
            r = max(at, key=lambda o: o["index"]) if at else r
        if r is None or not r["skinned"] or plan.in_volume(c.x - n.x * 0.05, c.z - n.z * 0.05, -(c.y - n.y * 0.05)):
            drop.append(face)
            continue
        face[own] = r["index"]
        surface = {"f": r["mat"], "c": r["ceilMat"], "w": r["wall"]}[kind]
        face.material_index = slots(f"{kind}:{surface}")
        cos_a, sin_a, cx, cz = frame(r)
        tx, ty = -n.y, n.x
        length = math.hypot(tx, ty) or 1.0
        for loop in face.loops:
            x, z, y = loop.vert.co.x, -loop.vert.co.y, loop.vert.co.z
            if kind == "f":
                loop[uv].uv = (x, z)
            elif kind == "c":
                dx, dz = x - cx, z - cz
                loop[uv].uv = (dx * cos_a - dz * sin_a, dx * sin_a + dz * cos_a)
            else:
                loop[uv].uv = ((loop.vert.co.x * tx + loop.vert.co.y * ty) / length, y)
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    return own


# ---------------------------------------------------------------- trims: baseboards and beams
def quad(bm, a, b, c, d, facing, slot, uv, us):
    """A quad facing `facing` (a vector), UVs (u along, v up) in metres."""
    f = bm.faces.new((bm.verts.new(a), bm.verts.new(b), bm.verts.new(c), bm.verts.new(d)))
    f.normal_update()
    if f.normal.dot(facing) < 0:
        f.normal_flip()
    f.material_index = slot
    for loop, (u, v) in zip(f.loops, us):
        loop[uv].uv = (u, v)


def grid_fits(heading, angle):
    """Does a Blender-space direction run along a room's tile grid (its angle in game space, z mirrored)?"""
    for a in (angle, -angle):
        m = (heading - a) % (math.pi / 2)
        if min(m, math.pi / 2 - m) < math.radians(2):
            return True
    return False


def same_grid(a, b):
    """Do two rooms lay their ceiling tiles on one grid (same angle mod 90°, origins a whole number of tiles apart)?"""
    m = (a["angle"] - b["angle"]) % (math.pi / 2)
    if min(m, math.pi / 2 - m) > math.radians(0.5):
        return False
    cos_a, sin_a, cx, cz = frame(a)
    dx, dz = b["centre"][0] - cx, b["centre"][1] - cz
    for v in (dx * cos_a - dz * sin_a, dx * sin_a + dz * cos_a):
        r = v / GRID - round(v / GRID)
        if abs(r) * GRID > 0.01:
            return False
    return True


MURET_H, MURET_T = 1.0, 0.15


def murets(plan, out, slots):
    """Low walls (1 m, 15 cm thick, plain render in the wall's colour, a capping board) along every drop over 60 cm
    between skinned rooms, on the higher side, following a ramp's slope: balconies, not railings (the kit lays no railings
    in a skin). Only where the higher side has head room (a slot under a low ceiling is a construction fault). The outline
    is walked as one loop, so a muret turns corners and follows a round pit (whose sides are a few cm each)."""
    uv = out.loops.layers.uv.verify()
    seen = set()
    for r in plan.rooms:
        if not r["skinned"] or r["open"]:
            continue
        pts = r["outline"]
        samples = []
        mine = set()
        t = 0.0
        for k in range(len(pts)):
            (px, pz), (qx, qz) = pts[k], pts[(k + 1) % len(pts)]
            length = math.hypot(qx - px, qz - pz)
            if length < 1e-4:
                continue
            tx, tz = (qx - px) / length, (qz - pz) / length
            nx, nz = -tz, tx  # one side; the higher side is chosen per sample
            steps = max(1, math.ceil(length / 0.25))
            for i in range(steps):
                d = length * i / steps
                x, z = px + tx * d, pz + tz * d
                mark = None
                a, b = plan.owner(x + nx * 0.1, z + nz * 0.1), plan.owner(x - nx * 0.1, z - nz * 0.1)
                lo = 0.0
                # only along the edge that really parts the two rooms: this room owns one side (a corridor crossing a
                # balcony edge would claim bits of it, in pieces and askew)
                if a is not None and b is not None and a is not b and r in (a, b) and a["skinned"] and b["skinned"] and not a["open"] and not b["open"]:
                    fa, fb = floor_at(a, x + nx * 0.1, z + nz * 0.1), floor_at(b, x - nx * 0.1, z - nz * 0.1)
                    hi, side = (a, 1) if fa > fb else (b, -1)
                    lo = min(fa, fb)
                    # a boundary already walled from another outline lying on it (counted once this outline is done:
                    # on a slanted edge, two samples 25 cm apart can round to the same key)
                    key = (round(x * 4), round(z * 4))
                    # over 45 cm it is no step the player walks down (STEP_MAX): it gets a low wall
                    if abs(fa - fb) > 0.45 and key not in seen and (plan.ceiling(x + side * nx * 0.2, z + side * nz * 0.2) or 0) - max(fa, fb) > 2.0:
                        mark = (hi["index"], side)
                        mine.add(key)
                samples.append((t + d, x, z, mark, nx, nz, lo))
            t += length
        seen |= mine
        if not samples:
            continue
        # a loop: start the walk on an unwalled sample, so a muret all around (a pit) is one run
        start = next((i for i, s in enumerate(samples) if s[3] is None), None)
        if start is None:
            ring = samples + [samples[0][:0] + (t,) + samples[0][1:]]
            wall_run(out, uv, plan, ring, slots, closed=True)
            continue
        order = samples[start:] + samples[:start]
        run = []
        for smp in order + [(None, None, None, None, None, None, None)]:
            if run and (smp[3] is None or smp[3] != run[-1][3]):
                if len(run) > 1 and sum(math.hypot(p[1] - q[1], p[2] - q[2]) for p, q in zip(run, run[1:])) >= 0.8:  # no stub
                    wall_run(out, uv, plan, run, slots)
                run = []
            if smp[3] is not None:
                if run and smp[0] < run[-1][0]:  # wrapped past the loop's end
                    smp = (smp[0] + t,) + smp[1:]
                run.append(smp)


def wall_run(out, uv, plan, run, slots, closed=False):
    """One muret along samples (t, x, z, (room, side), nx, nz, lower floor): the face toward the drop, plain render from
    the lower floor up (a balcony edge reads as one built front, not a papered riser under a band of render), a nosing at
    the slab, the face toward the room, its top, its ends."""
    from mathutils import Vector

    hi = plan.rooms_by_index[run[0][3][0]]
    side = run[0][3][1]
    if not closed:
        # 15 cm on past both ends (the wall's thickness): two murets meeting at a corner close it, no slit
        def past(a, b):
            dx, dz = a[1] - b[1], a[2] - b[2]
            d = math.hypot(dx, dz) or 1.0
            return (a[0] + (MURET_T if a[0] >= b[0] else -MURET_T), a[1] + dx / d * MURET_T, a[2] + dz / d * MURET_T) + a[3:]
        run = [past(run[0], run[1])] + run + [past(run[-1], run[-2])]
    wall, cap = slots(f"muret:{hi['wall']}"), slots("trim")
    up = Vector((0, 0, 1))

    def at(s, inset, h):
        _, x, z, _, nx, nz, _ = s
        return Vector((x + nx * side * inset, -(z + nz * side * inset), h))

    def floor_of(s):
        _, x, z, _, nx, nz, _ = s
        return floor_at(hi, x + nx * side * 0.1, z + nz * side * 0.1)

    for s0, s1 in zip(run, run[1:]):
        f0, f1 = floor_of(s0), floor_of(s1)
        lo0, lo1 = s0[6], s1[6]
        t0, t1 = s0[0], s1[0]
        out_dir = Vector((-s0[4] * side, s0[5] * side, 0))
        in_dir = -out_dir
        # toward the drop: from the lower floor to the top, 3 mm proud of the riser so it covers it
        quad(out, at(s0, -0.01, lo0), at(s1, -0.01, lo1), at(s1, -0.01, f1 + MURET_H), at(s0, -0.01, f0 + MURET_H), out_dir, wall, uv,
             [(t0, lo0), (t1, lo1), (t1, f1 + MURET_H), (t0, f0 + MURET_H)])
        # toward the room
        quad(out, at(s0, MURET_T, f0), at(s1, MURET_T, f1), at(s1, MURET_T, f1 + MURET_H), at(s0, MURET_T, f0 + MURET_H), in_dir, wall, uv,
             [(t0, f0), (t1, f1), (t1, f1 + MURET_H), (t0, f0 + MURET_H)])
        # the capping board
        quad(out, at(s0, -0.013, f0 + MURET_H), at(s1, -0.013, f1 + MURET_H), at(s1, MURET_T + 0.01, f1 + MURET_H), at(s0, MURET_T + 0.01, f0 + MURET_H), up, cap, uv,
             [(t0, 0), (t1, 0), (t1, MURET_T), (t0, MURET_T)])
        # the slab's nosing: 16 cm high, 2.5 cm proud, at the upper floor
        quad(out, at(s0, -0.028, f0 - 0.16), at(s1, -0.028, f1 - 0.16), at(s1, -0.028, f1), at(s0, -0.028, f0), out_dir, cap, uv,
             [(t0, 0), (t1, 0), (t1, 0.16), (t0, 0.16)])
        quad(out, at(s0, -0.028, f0), at(s1, -0.028, f1), at(s1, -0.01, f1), at(s0, -0.01, f0), up, cap, uv,
             [(t0, 0), (t1, 0), (t1, 0.025), (t0, 0.025)])
        quad(out, at(s0, -0.028, f0 - 0.16), at(s1, -0.028, f1 - 0.16), at(s1, -0.01, f1 - 0.16), at(s0, -0.01, f0 - 0.16), -up, cap, uv,
             [(t0, 0), (t1, 0), (t1, 0.025), (t0, 0.025)])
    if closed:
        return
    for s, sign in ((run[0], -1), (run[-1], 1)):
        f = floor_of(s)
        tx, tz = run[-1][1] - run[0][1], run[-1][2] - run[0][2]
        n = Vector((tx * sign, -tz * sign, 0)).normalized()
        quad(out, at(s, -0.01, f), at(s, MURET_T, f), at(s, MURET_T, f + MURET_H), at(s, -0.01, f + MURET_H), n, wall, uv,
             [(0, f), (MURET_T, f), (MURET_T, f + MURET_H), (0, f + MURET_H)])


def trims(plan, bm, own, slots):
    """Baseboards along wall feet, beams along ceiling seams: a separate mesh, same materials."""
    from mathutils import Vector

    out = bmesh.new()
    uv = out.loops.layers.uv.verify()
    trim, beam = slots("trim"), slots("beam")
    up = Vector((0, 0, 1))
    for face in bm.faces:
        n = face.normal
        if abs(n.z) > 0.3:
            continue
        r = plan.rooms_by_index[face[own]]
        verts = [v.co for v in face.verts]
        at_floor = [v for v in verts if abs(v.z - floor_at(r, v.x, -v.y)) < 0.01]
        if len(at_floor) != 2:
            continue
        a, b = at_floor
        o = Vector((n.x, n.y, 0)).normalized() * 0.015
        h = up * 0.12
        span = (b - a).length
        quad(out, a + o, b + o, b + o + h, a + o + h, n, trim, uv, [(0, 0), (span, 0), (span, 0.12), (0, 0.12)])
        quad(out, a + h, b + h, b + o + h, a + o + h, up, trim, uv, [(0, 0), (span, 0), (span, 0.015), (0, 0.015)])
    for edge in bm.edges:
        faces = [f for f in edge.link_faces if f.normal.z < -0.7]
        if len(faces) != 2 or faces[0][own] == faces[1][own]:
            continue
        a, b = edge.verts[0].co.copy(), edge.verts[1].co.copy()
        if abs(a.z - b.z) > 0.01:
            continue
        d = (b - a)
        span = d.length
        if span < 0.02:
            continue
        # a beam runs along the tiles of one of the two ceilings: a seam across both grids (rooms askew, overlapping) drew
        # zigzags of beams through the middle of the rooms; there the tiles simply meet
        heading = math.atan2(d.y, d.x)  # Blender y = -game z: angles mirror, so compare the absolute misfit mod 90°
        if not any(grid_fits(heading, plan.rooms_by_index[f[own]]["angle"]) for f in faces):
            continue
        if same_grid(plan.rooms_by_index[faces[0][own]], plan.rooms_by_index[faces[1][own]]):
            continue  # one grid running on (a ramp under its hall): the tiles just go on, no beam
        side = Vector((-d.y, d.x, 0)).normalized() * 0.06
        drop = up * 0.08
        for s in (side, -side):
            quad(out, a + s - drop, b + s - drop, b + s, a + s, s, beam, uv, [(0, 0), (span, 0), (span, 0.08), (0, 0.08)])
        quad(out, a + side - drop, b + side - drop, b - side - drop, a - side - drop, -up, beam, uv, [(0, 0), (span, 0), (span, 0.12), (0, 0.12)])
    return out


# ---------------------------------------------------------------- lights in the tiles
def square_hits(poly, half):
    """Does the polygon (u, v points) overlap the square [-half, half]²? A vertex inside, a square corner inside, or an
    edge crossing the square (Liang-Barsky): a thin partition crossing a light has no vertex inside it."""
    if any(abs(u) < half and abs(v) < half for u, v in poly):
        return True
    if any(inside(cu, cv, poly) for cu in (-half, half) for cv in (-half, half)):
        return True
    for (u0, v0), (u1, v1) in zip(poly, poly[1:] + poly[:1]):
        t0, t1 = 0.0, 1.0
        du, dv = u1 - u0, v1 - v0
        ok = True
        for p_, q_ in ((-du, u0 + half), (du, half - u0), (-dv, v0 + half), (dv, half - v0)):
            if p_ == 0:
                if q_ < 0:
                    ok = False
                    break
                continue
            t = q_ / p_
            if p_ < 0:
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
            if t0 > t1:
                ok = False
                break
        if ok:
            return True
    return False


def over_solid(plan, r, pu, pv, half):
    """A light (centre pu, pv on room r's grid, half-size with its margin) over a solid that reaches the ceiling."""
    cos_a, sin_a, cx, cz = frame(r)
    x, z = cx + pu * cos_a + pv * sin_a, cz - pu * sin_a + pv * cos_a
    reach = half * 1.5
    for so in plan.solids:
        b = so["box"]
        if b[0] > x + reach or b[2] < x - reach or b[1] > z + reach or b[3] < z - reach:
            continue
        if so["h"] is not None and so["base"] + so["h"] < r["ceil"] - 0.1:
            continue  # a low partition: the light is above it
        poly = []
        for sx, sz in so["outline"]:
            dx, dz = sx - cx, sz - cz
            poly.append((dx * cos_a - dz * sin_a - pu, dx * sin_a + dz * cos_a - pv))
        if square_hits(poly, half):
            return True
    return False


def lights(plan):
    """One lit tile (60 cm), or 2 x 2 tiles in big rooms, every `lights` metres on each room's grid, 30 cm clear of
    walls, beams and other rooms' ceilings. Never two in the same spot (a room and the feature sharing its grid both laid
    one there: twice the light). A room that would get none (narrow, eaten by its neighbours) gets one, 15 cm clear.
    [x, y, z, angle, size, dead] for the game."""
    panels = []
    taken = {}

    def free(x, z):
        cell = (math.floor(x), math.floor(z))
        return all(math.hypot(x - px, z - pz) >= 0.9 for i in (-1, 0, 1) for j in (-1, 0, 1) for px, pz in taken.get((cell[0] + i, cell[1] + j), ()))

    def place(r, margin, step=None, limit=None):
        x0, z0, x1, z1 = r["box"]
        area = (x1 - x0) * (z1 - z0)
        # a low ceiling (< 2.75 m - its floor) never takes the big fittings: 1.2 m of light 50 cm over the head fills the view
        low = r["ceil"] - r["floor"] < 2.7
        big = not low and (r["ceil"] > 3.6 or area > 150)
        size = 2 * GRID if big else GRID
        # a 1.2 m fitting every 3.6 m at least (every 2.4 m, a quarter of a hall's ceiling was light: burnt white)
        step = step or max(6 if big else 3, round(r["lights"] / GRID)) * GRID
        cos_a, sin_a, cx, cz = frame(r)
        reach = math.hypot(x1 - x0, z1 - z0) / 2
        first = -math.floor(reach / step) * step
        half = size / 2 + margin
        spots = []
        u = first
        while u <= reach:
            v = first
            while v <= reach:
                spots.append((u, v) if big else (u + GRID / 2, v + GRID / 2))
                v += step
            u += step
        if limit:
            spots.sort(key=lambda s: s[0] * s[0] + s[1] * s[1])  # the fallback: nearest the middle first
        count = 0
        for pu, pv in spots:
            x, z = cx + pu * cos_a + pv * sin_a, cz - pu * sin_a + pv * cos_a
            if not free(x, z) or not fits(r, pu, pv, half) or over_solid(plan, r, pu, pv, half):
                continue
            # never two dead in a row (only every other light may die, twice as often): a corridor whose 3 tubes all
            # drew "dead" went black
            dead = count % 2 == 1 and (math.sin(r["index"] * 12.9898 + count * 78.233) * 43758.5453) % 1 < 2 * min(0.15, r["dead"])
            panels.append([round(x, 3), round(r["ceil"] - 0.004, 3), round(z, 3), round(r["angle"], 5), size, dead])
            taken.setdefault((math.floor(x), math.floor(z)), []).append((x, z))
            count += 1
            if limit and count >= limit:
                break
        return count

    def fits(r, pu, pv, half):
        cos_a, sin_a, cx, cz = frame(r)
        # a grid over the whole footprint, not its corners only: a 50 cm pillar fits between the corners
        grid = [-half + i * half / 2 for i in range(5)]
        for du in grid:
            for dv in grid:
                cu, cv = pu + du, pv + dv
                x, z = cx + cu * cos_a + cv * sin_a, cz - cu * sin_a + cv * cos_a
                o = plan.owner(x, z)
                # a feature under the same ceiling on the same grid (the holes of the holes room) carries lights too
                shared = o is not None and o is not r and not o["open"] and o["ceil"] == r["ceil"] and same_grid(o, r)
                if (o is not r and not shared) or plan.ceiling(x, z) != r["ceil"] or not plan.in_volume(x, r["ceil"] - 0.05, z):
                    return False
        return True

    for r in plan.rooms:
        if not r["skinned"] or r["open"] or not r["lights"]:
            continue
        if not place(r, 0.3):
            place(r, 0.15, step=GRID, limit=1)
    return panels


# ---------------------------------------------------------------- the model
# colour of the ceiling lights, per skin (the scene's palette.light)
LIGHT_TINT = {"lobby": "#ffe7a8"}


def build(skin):
    # a skin name is a plain identifier: it names files, and must never reach outside plans/ or skins/
    if not re.fullmatch(r"[a-z0-9_-]+", skin):
        raise SystemExit(f"invalid skin name: {skin!r}")
    here = os.path.dirname(__file__)
    with open(os.path.join(here, "plans", f"{skin}.json"), encoding="utf-8") as f:
        plan = Plan(json.load(f))
    plan.rooms_by_index = {r["index"]: r for r in plan.rooms}

    lib.reset()
    space = volume(plan)
    me = space.data
    slots = Slots(me)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)  # seen from inside
    # triangles: a wall around an opening comes out of the union as one concave face whose centre lies in the opening
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.normal_update()
    own = classify(plan, bm, slots)
    extra = trims(plan, bm, own, slots)
    murets(plan, extra, slots)
    # one piece per run: welded quads make one lightmap island each (25 cm islands baked as bands of light)
    bmesh.ops.remove_doubles(extra, verts=extra.verts, dist=0.0005)
    bm.to_mesh(me)
    bm.free()
    space.name = "skin"
    space["panels"] = json.dumps(lights(plan))
    trim_me = bpy.data.meshes.new("trims")
    trim_me.materials.clear()
    for m in me.materials:
        trim_me.materials.append(m)
    extra.to_mesh(trim_me)
    # the glTF export writes V as 1 - v: write 1 - v here so the game reads the UVs computed above (the ceiling tiles
    # then fall on the room grid, where the lights are; 1 mod 0.6 had moved every tile line by 40 cm)
    for mesh in (me, trim_me):
        for d in mesh.uv_layers[0].data:
            d.uv = (d.uv[0], 1.0 - d.uv[1])
    extra.free()
    trim_obj = bpy.data.objects.new("trims", trim_me)
    bpy.context.scene.collection.objects.link(trim_obj)
    for o in list(bpy.context.scene.objects):
        if o not in (space, trim_obj):
            bpy.data.objects.remove(o)
    if os.environ.get("SKIN_BAKE", "1") != "0":
        import bake  # noqa: PLC0415 (Cycles setup only when baking)

        bake.bake(skin, [space, trim_obj], json.loads(space["panels"]), {"light": LIGHT_TINT.get(skin, "#ffe7a8")})
    path = lib.export(skin, "skins", extras=True)
    panels = json.loads(space["panels"])
    print(f"SKIN {skin}: {lib.tris()} triangles, {len(panels)} lights, {os.path.getsize(path) // 1024} KB -> {os.path.relpath(path, lib.ROOT)}")


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if not args:
        raise SystemExit("usage: blender --background --python tools/blender/skin.py -- <skin>")
    for name in args:
        build(name)
