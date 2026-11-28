"""
Objets du Lobby (skill hub-props, tranche 0). Usage (depuis portfolio/) :
    "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe" --background --python tools/blender/props/lobby.py

-> public/hub/models/props/lobby.glb : un nœud par objet (polaroid, plan, cadre).
   public/hub/textures/props/*.jpg  : les textures, NON empaquetées dans le .glb (CSP `blob:`) : le .glb référence
   ../../textures/props/<fichier>.jpg (relatif au .glb), les .jpg sont les fichiers servis tels quels.
   - polaroid : à plat au sol, origine au centre, z = 0 (face en haut, haut de l'image vers +Y Blender).
   - plan, cadre : objets muraux, origine au DOS, ils avancent vers -Y ; hauteur de pose du centre dans l'extra glTF
     `mount_height` (m). Le cadre a un plan d'image séparé, matériau « cadre:image » (UV 0-1) : le jeu change sa
     texture (cadre_vide.jpg / cadre_fenetre_sombre.jpg / cadre_fenetre_allumee.jpg).
Planches : tools/blender/previews/props/<objet>.png (+ <objet>_detail.png : gros plan).
"""
import json
import math
import os
import shutil
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import bmesh  # noqa: E402
import bpy  # noqa: E402
import lib  # noqa: E402
import lobby_art as art  # noqa: E402
import numpy as np  # noqa: E402
from lib import block, box, join, mat, rbox, wear  # noqa: E402

TEX_DIR = os.path.join(lib.OUT, "..", "textures", "props")
TEX_URI = "../../textures/props/"  # relatif au .glb (public/hub/models/props/)


# ---------------------------------------------------------------- textures et matériaux
def write_texture(name, arr):
    """Save a painted array as a JPEG (public/hub/textures/props) and load it as a file image (never packed)."""
    os.makedirs(TEX_DIR, exist_ok=True)
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h)
    img.pixels.foreach_set(np.concatenate([np.flipud(arr), np.ones((h, w, 1), np.float32)], axis=2).ravel())
    path = os.path.abspath(os.path.join(TEX_DIR, f"{name}.jpg"))
    img.filepath_raw = path
    img.file_format = "JPEG"
    img.save(quality=86)
    bpy.data.images.remove(img)
    loaded = bpy.data.images.load(path)
    loaded.name = name
    print(f"TEXTURE {name}.jpg {w}x{h} {os.path.getsize(path) // 1024} KB")
    return loaded


def textured(name, image, rough=0.6):
    m = mat(name, "#ffffff", rough, image=image)
    return m


def translucent(m, alpha):
    m.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = alpha
    m.surface_render_method = "BLENDED"
    m.use_backface_culling = False
    return m


def mounted(o, height):
    o["mount_height"] = height
    return o


# ---------------------------------------------------------------- polaroid
def polaroid(name, M):
    """Photo instantanée 8,8 x 10,7 cm, ép. 1 mm, posée à plat, un coin corné (en haut à droite)."""
    w, h, t, c, r = 0.088, 0.107, 0.001, 0.013, 0.002
    pts = []

    def corner(cx, cy, a0):  # rounded corner: 3 points of a quarter circle
        for k in range(3):
            a = math.radians(a0 + 45 * k)
            pts.append((cx + r * math.cos(a) , cy + r * math.sin(a)))

    corner(-w / 2 + r, -h / 2 + r, 180)  # bottom left
    corner(w / 2 - r, -h / 2 + r, 270)  # bottom right
    pts.append((w / 2, h / 2 - c))  # the folded corner: cut along the crease
    pts.append((w / 2 - c, h / 2))
    corner(-w / 2 + r, h / 2 - r, 90)  # top left
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    top = [bm.verts.new((x, y, t)) for x, y in pts]
    bot = [bm.verts.new((x, y, 0.0)) for x, y in pts]
    n = len(pts)
    f = bm.faces.new(top)
    f.material_index = 1
    for lp in f.loops:
        lp[uv].uv = ((lp.vert.co.x + w / 2) / w, (lp.vert.co.y + h / 2) / h)
    for i in range(n):  # the underside lies on the floor: no bottom face
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    # the dog-ear: a triangle hinged on the crease, bent back over the front and lifted ~16 degrees
    a, b = np.array([w / 2 - c, h / 2]), np.array([w / 2, h / 2 - c])
    mid = (a + b) / 2
    u = np.array([-1.0, -1.0]) / math.sqrt(2)
    L = c / math.sqrt(2)
    lift = math.radians(16)
    tip = (mid[0] + L * math.cos(lift) * u[0], mid[1] + L * math.cos(lift) * u[1], t + 0.0004 + L * math.sin(lift))
    va, vb = bm.verts.new((a[0], a[1], t)), bm.verts.new((b[0], b[1], t))
    vt = bm.verts.new(tip)
    ua, ub = bm.verts.new((a[0], a[1], t + 0.0004)), bm.verts.new((b[0], b[1], t + 0.0004))
    ut = bm.verts.new((tip[0], tip[1], tip[2] + 0.0004))
    bm.faces.new((ub, ua, ut))  # top side (the back of the card, seen from above)
    bm.faces.new((va, vb, vt))  # underside
    bm.faces.new((va, ua, ub, vb))  # hinge
    bm.faces.new((va, ua, ut, vt))
    bm.faces.new((vb, vt, ut, ub))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(M["polaroid_card"])  # slot 0: edges, flap
    o.data.materials.append(M["polaroid_front"])  # slot 1: the printed face (polygon 0)
    return join(name, [o])


# ---------------------------------------------------------------- plan (feuille A4 scotchée)
PW, PH = 0.210, 0.297
PAPER_Y = 0.0016  # la feuille ne colle pas au mur : le scotch la tient aux coins


def paper_y(x, z):
    """Height (towards -Y) of the paper at (x, z): a slight wave, the vertical crease a valley, the horizontal one a ridge."""
    y = PAPER_Y + 0.0006 * math.sin(x * 21 + 1.0) * math.cos(z * 15 + 0.4) + 0.0005 * (1 - (2 * x / PW) ** 2) * math.sin(z * 11)
    y -= 0.0013 * math.exp(-abs(x) / 0.0075)  # vertical fold: valley (towards the wall)
    y += 0.0011 * math.exp(-abs(z) / 0.0075)  # horizontal fold: ridge
    return max(y, 0.0003)


def plan(name, M):
    xs = [-PW / 2, -0.080, -0.050, -0.026, -0.012, -0.004, 0.0, 0.004, 0.012, 0.026, 0.050, 0.080, PW / 2]
    zs = [-PH / 2, -0.12, -0.085, -0.055, -0.030, -0.012, -0.004, 0.0, 0.004, 0.012, 0.030, 0.055, 0.085, 0.12, PH / 2]
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    grid = [[bm.verts.new((x, -paper_y(x, z), z)) for x in xs] for z in zs]
    for j in range(len(zs) - 1):
        for i in range(len(xs) - 1):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for lp in f.loops:
                lp[uv].uv = ((lp.vert.co.x + PW / 2) / PW, (lp.vert.co.z + PH / 2) / PH)
    mesh = bpy.data.meshes.new(name + "_paper")
    bm.to_mesh(mesh)
    bm.free()
    paper = bpy.data.objects.new(name + "_paper", mesh)
    bpy.context.scene.collection.objects.link(paper)
    paper.data.materials.append(M["plan_paper"])
    parts = [paper]
    # quatre bouts de ruban adhésif jauni, en travers des coins, au-dessus de la feuille et jusqu'au mur
    for sx, sz in ((-1, 1), (1, 1), (-1, -1), (1, -1)):
        d = np.array([sx, sz]) / math.sqrt(2)  # outwards
        n_ = np.array([-d[1], d[0]])
        corner = np.array([sx * PW / 2, sz * PH / 2])
        centre = corner - d * 0.003 + n_ * (0.0015 * sx * sz)
        ang = 0.06 * (sx * sz)
        bmt = bmesh.new()
        L, Wd = 0.034, 0.019
        rows = []
        for k in range(6):
            s = -L / 2 + L * k / 5
            row = []
            for e in (-1, 1):
                p = centre + d * s + n_ * (e * Wd / 2) + n_ * (s * ang)
                inside = np.clip((min(PW / 2 - abs(p[0]), PH / 2 - abs(p[1])) + 0.004) / 0.009, 0, 1)
                y = 0.0006 + (PAPER_Y + 0.0013 - 0.0006) * inside  # lies over the paper, comes down to the wall
                row.append(bmt.verts.new((p[0], -y, p[1])))
            rows.append(row)
        for k in range(5):
            bmt.faces.new((rows[k][0], rows[k][1], rows[k + 1][1], rows[k + 1][0]))
        bmt.normal_update()
        for f in bmt.faces:
            if f.normal.y > 0:
                f.normal_flip()
        tm = bpy.data.meshes.new(f"{name}_tape")
        bmt.to_mesh(tm)
        bmt.free()
        tape = bpy.data.objects.new(f"{name}_tape", tm)
        bpy.context.scene.collection.objects.link(tape)
        tape.data.materials.append(M["tape"])
        parts.append(tape)
    return mounted(join(name, parts), 1.45)


# ---------------------------------------------------------------- cadre photo mural
FW, FH = 0.50, 0.70  # vue : 0,5 x 0,7 m hors tout


def ring(prefix, Wo, Ho, t, y0, y1, material, bev=0.0015):
    """Four mitred bars forming a rectangular ring: outer size Wo x Ho, width t, from y0 to y1 (towards -Y)."""
    out = []
    for swap, sign in ((False, 1), (False, -1), (True, 1), (True, -1)):
        L, D = (Ho, Wo) if swap else (Wo, Ho)

        def at(lx, ly, lz):
            return (sign * lz, ly, lx) if swap else (lx, ly, sign * lz)

        a = [at(-L / 2, y0, D / 2), at(-L / 2 + t, y0, D / 2 - t), at(-L / 2 + t, y1, D / 2 - t), at(-L / 2, y1, D / 2)]
        b = [at(L / 2, y0, D / 2), at(L / 2 - t, y0, D / 2 - t), at(L / 2 - t, y1, D / 2 - t), at(L / 2, y1, D / 2)]
        out.append(block(f"{prefix}_{len(out)}", a, b, material, bev=bev, seg=1))
    return out


def quad(name, w, h, y, material, flip=False):
    """A plane in the XZ plane facing -Y at depth y, UV 0-1."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    v = [bm.verts.new(p) for p in ((-w / 2, y, -h / 2), (w / 2, y, -h / 2), (w / 2, y, h / 2), (-w / 2, y, h / 2))]
    f = bm.faces.new(v)
    for lp, st in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        lp[uv].uv = st
    if f.normal.y > 0:
        bmesh.ops.reverse_faces(bm, faces=[f])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(material)
    return o


def frame(name, M):
    parts = []
    # moulure : fond de feuillure (profil bas, le verre s'y loge) + face (plus large) + jonc extérieur + lèvre intérieure
    parts += ring("fr_back", FW, FH, 0.028, 0.0, -0.016, M["wood"])
    parts += ring("fr_face", FW, FH, 0.034, -0.016, -0.024, M["wood"])
    bead = ring("fr_bead", FW, FH, 0.010, -0.024, -0.030, M["wood"])
    parts += bead
    parts += ring("fr_lip", FW - 0.050, FH - 0.050, 0.009, -0.024, -0.027, M["wood"])
    for p in parts:  # patine : éclats clairs sur le jonc et les angles, jamais uniforme
        wear(p, M["wood_worn"], lambda c: math.sin(c.x * 83 + c.z * 61) > 0.90 and c.y < -0.02)
    # passe-partout crème (4 barres d'onglet), carton de fond, plan d'image, verre
    ow, oh = FW - 2 * 0.028, FH - 2 * 0.028  # ouverture de la feuillure
    mw = 0.056
    parts += ring("mat", ow, oh, mw, -0.0075, -0.0095, M["mat"], bev=0.0006)
    iw, ih = ow - 2 * mw + 0.008, oh - 2 * mw + 0.008  # un peu plus grand que la fenêtre : rien ne dépasse
    parts.append(box("backing", (ow, 0.0015, oh), (0, -0.0012, 0), M["backing"]))
    parts.append(quad("glass", ow, oh, -0.0125, M["glass"]))
    # the image plane goes first: join() keeps the UV layer of its first part only (the bars have none)
    o = join(name, [quad("image", iw, ih, -0.0045, M["image"])] + parts)
    return mounted(o, 1.6)


# ---------------------------------------------------------------- export : .glb avec textures hors du fichier
def export_unpacked(name):
    """Export to a temp .gltf + .bin, then pack the JSON and the binary into a .glb whose images are URIs
    (../../textures/props/x.jpg) instead of embedded blobs."""
    tmp = os.path.join(lib.PREVIEWS, "_export_" + name)
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    bpy.ops.export_scene.gltf(filepath=os.path.join(tmp, name + ".gltf"), export_format="GLTF_SEPARATE", export_apply=True, export_cameras=False,
                              export_lights=False, export_yup=True, export_extras=True, export_image_format="JPEG", export_texcoords=True)
    with open(os.path.join(tmp, name + ".gltf"), encoding="utf-8") as f:
        gltf = json.load(f)
    for im in gltf.get("images", []):
        im["uri"] = TEX_URI + os.path.basename(im["uri"]).replace("%20", " ")
    buf = gltf["buffers"][0]
    with open(os.path.join(tmp, buf.pop("uri")), "rb") as f:
        binary = f.read()
    binary += b"\0" * (-len(binary) % 4)
    buf["byteLength"] = len(binary)
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    js += b" " * (-len(js) % 4)
    out = os.path.join(lib.OUT, "props", name + ".glb")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(js) + 8 + len(binary)))
        f.write(struct.pack("<I4s", len(js), b"JSON") + js)
        f.write(struct.pack("<I4s", len(binary), b"BIN\0") + binary)
    shutil.rmtree(tmp, ignore_errors=True)
    return out, gltf


def main():
    lib.reset()
    lib._mats.clear()
    # --- textures (peintes ici : reproductibles)
    tex = {
        "polaroid": write_texture("polaroid", art.polaroid_front()),
        "plan": write_texture("plan", art.plan_paper()),
        "vide": write_texture("cadre_vide", art.blank_card(504, 800)),
    }
    write_texture("cadre_fenetre_sombre", art.house_scene(504, 800, False, seed=7))
    lit = write_texture("cadre_fenetre_allumee", art.house_scene(504, 800, True, seed=7))
    M = {
        "polaroid_card": mat("polaroid:card", "#d9cfa8", 0.7),
        "polaroid_front": textured("polaroid:front", tex["polaroid"], 0.38),
        "plan_paper": textured("plan:paper", tex["plan"], 0.9),
        "tape": translucent(mat("plan:tape", "#d8bf6a", 0.35), 0.72),
        "wood": mat("cadre:wood", "#3a2f1c", 0.5),
        "wood_worn": mat("cadre:wood_worn", "#6b5636", 0.45),
        "mat": mat("cadre:mat", "#e4dcc0", 0.92),
        "backing": mat("cadre:backing", "#2b2823", 0.9),
        "image": textured("cadre:image", tex["vide"], 0.55),
        "glass": translucent(mat("cadre:glass", "#cfdde4", 0.02), 0.07),
    }
    nodes = {"polaroid": polaroid("polaroid", M), "plan": plan("plan", M), "cadre": frame("cadre", M)}
    for n, o in nodes.items():
        pts = [v.co for v in o.data.vertices]
        lo = [min(p[i] for p in pts) for i in range(3)]
        hi = [max(p[i] for p in pts) for i in range(3)]
        print(f"NODE {n}: {lib.mesh_tris(o)} triangles, {hi[0] - lo[0]:.3f} x {hi[1] - lo[1]:.3f} x {hi[2] - lo[2]:.3f} m, "
              f"y {lo[1]:.4f}..{hi[1]:.4f}, pose {o.get('mount_height', 'sol')}, matériaux {[m.name for m in o.data.materials]}")
    path, gltf = export_unpacked("lobby")
    print(f"EXPORT {os.path.relpath(path, lib.ROOT)} ({os.path.getsize(path) // 1024} KB), images {[i['uri'] for i in gltf.get('images', [])]}")
    print("GLTF materials", [(m["name"], m.get("alphaMode", "OPAQUE")) for m in gltf["materials"]])
    sheets = [
        ("polaroid", ["polaroid"], "Polaroid 8,8 x 10,7 cm (au sol)", {}),
        ("polaroid_detail", ["polaroid"], "Polaroid, gros plan", {"figure": False, "gap": 0.05, "lift": "floor"}),
        ("plan", ["plan"], "Plan A4 scotche (centre a 1,45 m)", {"lift": True}),
        ("plan_detail", ["plan"], "Plan, gros plan", {"figure": False, "gap": 0.05, "lift": "floor"}),
        ("cadre", ["cadre"], "Cadre 0,5 x 0,7 (centre a 1,6 m)", {"lift": True}),
        ("cadre_detail", ["cadre"], "Cadre, gros plan (image vide)", {"figure": False, "gap": 0.05, "lift": "floor"}),
        ("cadre_fenetre_allumee", ["cadre"], "Cadre, fenetre allumee (texture echangee)", {"figure": False, "gap": 0.05, "lift": "floor"}),
    ]
    only = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    for sheet, names, title, opts in sheets:
        if only and sheet not in only:
            continue
        if sheet == "cadre_fenetre_allumee":  # what the game does: swap the texture of the material « cadre:image »
            next(n for n in M["image"].node_tree.nodes if n.type == "TEX_IMAGE").image = lit
        print("SHEET", lib.contact_sheet(sheet, [nodes[n] for n in names], title, **opts))


main()
