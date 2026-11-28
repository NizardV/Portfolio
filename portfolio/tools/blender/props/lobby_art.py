"""
Images du Lobby (skill hub-props), peintes pixel par pixel avec numpy (aucune dépendance en dehors de Blender) :
la maison au bout d'une prairie au crépuscule (cadre et Polaroid), la feuille quadrillée du plan.
Toutes les fonctions rendent un tableau float32 (hauteur, largeur, 3) en sRGB, ligne 0 = haut de l'image.
Sobre et photographique : dégradés lents, bruit fractal, flou léger, vignettage, grain.
"""
import functools

import numpy as np


# ---------------------------------------------------------------- briques
@functools.lru_cache(maxsize=None)
def _table(seed):
    return np.random.RandomState(seed).rand(256, 256).astype(np.float32)


def vnoise(u, v, seed=0):
    """Value noise 0..1 at float coordinates (arrays)."""
    t = _table(seed)
    iu, iv = np.floor(u).astype(np.int64), np.floor(v).astype(np.int64)
    fu, fv = (u - iu).astype(np.float32), (v - iv).astype(np.float32)
    fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
    a, b = t[iu & 255, iv & 255], t[(iu + 1) & 255, iv & 255]
    c, d = t[iu & 255, (iv + 1) & 255], t[(iu + 1) & 255, (iv + 1) & 255]
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv


def fbm(u, v, seed=0, octaves=5, gain=0.5):
    out, amp, tot, f = 0.0, 1.0, 0.0, 1.0
    for i in range(octaves):
        out = out + amp * vnoise(u * f + 17.3 * i, v * f - 9.1 * i, seed + i)
        tot += amp
        amp *= gain
        f *= 2.0
    return out / tot


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def ramp(t, stops):
    """Colour ramp: stops = [(pos, (r, g, b)), ...] -> (..., 3)."""
    pos = [p for p, _ in stops]
    col = np.array([c for _, c in stops], dtype=np.float32)
    return np.stack([np.interp(t, pos, col[:, i]) for i in range(3)], axis=-1).astype(np.float32)


def mix(base, colour, alpha):
    a = alpha[..., None] if alpha.ndim == base.ndim - 1 else alpha
    return base * (1 - a) + np.asarray(colour, dtype=np.float32) * a


def blur(img, passes=1):
    k = np.array([1, 4, 6, 4, 1], dtype=np.float32) / 16
    for _ in range(passes):
        for ax in (0, 1):
            p = np.pad(img, [(2, 2) if i == ax else (0, 0) for i in range(img.ndim)], mode="edge")
            n = img.shape[ax]
            img = sum(k[i] * np.take(p, np.arange(i, i + n), axis=ax) for i in range(5))
    return img


def grain(img, seed, amount=0.02, chroma=0.006):
    rng = np.random.RandomState(seed)
    h, w = img.shape[:2]
    g = rng.normal(0, amount, (h, w, 1)).astype(np.float32) + rng.normal(0, chroma, (h, w, 3)).astype(np.float32)
    return img + g


def vignette(img, strength=0.4):
    h, w = img.shape[:2]
    y, x = (np.arange(h) + 0.5) / h - 0.5, (np.arange(w) + 0.5) / w - 0.5
    r2 = (x[None, :] ** 2 + y[:, None] ** 2) * 2
    return img * (1 - strength * r2)[..., None]


def grid(w, h):
    return np.meshgrid(np.arange(w, dtype=np.float32) + 0.5, np.arange(h, dtype=np.float32) + 0.5)


# ---------------------------------------------------------------- la maison au bout de la prairie
def house_scene(w, h, lit, seed=7, aged=0.0):
    """Une prairie qui monte vers l'horizon, une lisière sombre, une petite maison au bout du chemin. Crépuscule.
    lit: la fenêtre du rez-de-chaussée est allumée. aged (0..1): tirage ancien (jauni, délavé, fuite de lumière)."""
    s = float(w)
    px, py = grid(w, h)
    X, Y = px / s, py / s
    hn = h / s
    hy = 0.60 * hn  # horizon
    height = np.clip((hy - Y) / hy, 0, 1)
    # ciel
    sky = ramp(height ** 0.55, [(0, (0.93, 0.62, 0.44)), (0.25, (0.78, 0.52, 0.48)), (0.5, (0.46, 0.40, 0.52)), (0.8, (0.17, 0.22, 0.38)), (1, (0.07, 0.11, 0.24))])
    glow = np.exp(-(((X - 0.20) * 1.0) ** 2 + ((Y - hy - 0.02) * 2.4) ** 2) / 0.06)
    sky = sky + glow[..., None] * np.array([0.50, 0.24, 0.07], dtype=np.float32)
    cl = fbm(X * 2.4 + 3, Y * 11, seed + 1, 5)
    cmask = smoothstep(0.50, 0.72, cl) * smoothstep(0.0, 0.25, height) * 0.62
    cloud = ramp(height, [(0, (0.74, 0.43, 0.36)), (0.35, (0.40, 0.31, 0.42)), (1, (0.14, 0.16, 0.30))])
    img = mix(sky, cloud, cmask)
    haze = np.array([0.62, 0.46, 0.43], dtype=np.float32)
    # lisière d'arbres (hauteur par colonne), plus deux grands arbres
    x1 = X[0]
    th = 0.016 + 0.030 * vnoise(x1 * 8, np.zeros_like(x1), seed + 2) + 0.012 * vnoise(x1 * 60, np.zeros_like(x1), seed + 3)
    th = th + (0.045 * np.exp(-((x1 - 0.08) / 0.10) ** 2) + 0.035 * np.exp(-((x1 - 0.93) / 0.09) ** 2)) * (0.8 + 0.4 * vnoise(x1 * 90, np.zeros_like(x1), seed + 15))
    tmask = smoothstep(hy - th[None, :] - 1.2 / s, hy - th[None, :] + 0.4 / s, Y) * (1 - smoothstep(hy + 0.001, hy + 0.004, Y))
    leaf = 0.75 + 0.5 * fbm(X * 160, Y * 160, seed + 4, 3)
    tcol = np.array([0.05, 0.065, 0.07], dtype=np.float32) * leaf[..., None]
    tcol = mix(tcol, haze, np.full(Y.shape, 0.22, dtype=np.float32))
    img = mix(img, tcol, tmask)
    # la prairie : profondeur ~ 1/(y - horizon), brume vers l'horizon, chemin usé, herbes hautes devant
    dy = np.maximum(Y - hy, 0)
    gm = smoothstep(hy - 0.0008, hy + 0.0025, Y)
    dz = 1.0 / (dy + 0.012)
    u, v = (X - 0.5) * dz * 0.9, dz * 0.9
    g1 = fbm(u * 14 + 5, v * 3.5, seed + 5, 5)
    blades = vnoise(u * 150, v * 9, seed + 6)
    gcol = ramp(g1, [(0, (0.085, 0.115, 0.085)), (0.5, (0.15, 0.185, 0.11)), (1, (0.25, 0.28, 0.15))])
    gcol = gcol * (0.8 + 0.4 * blades)[..., None] * np.array([0.88, 0.97, 1.08], dtype=np.float32)
    t = np.clip(dy / max(hn - hy, 1e-6), 0, 1)
    xc = 0.575 + (0.34 - 0.575) * t ** 1.1
    hw = 0.003 + 0.07 * t
    pmask = (1 - smoothstep(hw * 0.55, hw * 1.15, np.abs(X - xc))) * (0.55 + 0.45 * fbm(u * 30, v * 5, seed + 7, 3)) * smoothstep(0.0, 0.02, dy)
    pcol = np.array([0.27, 0.235, 0.16], dtype=np.float32) * (0.85 + 0.3 * vnoise(u * 90, v * 6, seed + 8))[..., None]
    gcol = mix(gcol, pcol, pmask * 0.85)
    fog = np.clip(np.exp(-dy * 11) * 0.78 + 0.06, 0, 1)
    gcol = mix(gcol, haze * np.array([0.9, 0.9, 1.0], dtype=np.float32), fog)
    img = mix(img, gcol, gm)
    # la maison (une petite masse sombre, loin) : murs, toit à deux pans, cheminée, porte, fenêtres
    hx, base = 0.575, hy + 0.0035
    hw_, hh_ = 0.072, 0.066
    wall_cy = base - hh_ / 2

    def rect(cx, cy, rw, rh):
        sd = np.maximum(np.abs(X - cx) - rw, np.abs(Y - cy) - rh)
        return 1 - smoothstep(-0.6 / s, 0.6 / s, sd)

    apex, eave = base - hh_ - 0.050, base - hh_ + 0.003
    over = 0.011
    k = (hw_ + over) / (eave - apex)
    roof_sd = np.maximum(np.abs(X - hx) - (Y - apex) * k, np.maximum(apex - Y, Y - eave))
    roof = 1 - smoothstep(-0.6 / s, 0.6 / s, roof_sd)
    wall = rect(hx, wall_cy, hw_, hh_ / 2)
    chimney = rect(hx - 0.042, apex + 0.022, 0.0075, 0.021)
    shade = 0.78 + 0.45 * (1 - (X - (hx - hw_)) / (2 * hw_))
    wcol = np.array([0.215, 0.185, 0.18], dtype=np.float32) * np.clip(shade, 0.6, 1.3)[..., None]
    wcol = wcol * (0.9 + 0.2 * fbm(X * 320, Y * 320, seed + 9, 3))[..., None]
    rcol = np.array([0.085, 0.08, 0.095], dtype=np.float32) * (0.9 + 0.2 * vnoise(X * 400, Y * 60, seed + 10))[..., None]
    house = wcol
    house = mix(house, rcol, roof)
    hmask = np.maximum(np.maximum(wall, roof), chimney)
    # ouvertures
    door = rect(hx + 0.036, base - 0.0165, 0.0075, 0.0165)
    house = mix(house, (0.04, 0.035, 0.04), door)
    win_cx, win_cy, ww, wh = hx - 0.030, wall_cy - 0.002, 0.0125, 0.0165
    dark_glass = np.array([0.05, 0.065, 0.095], dtype=np.float32) + 0.07 * (0.5 + 0.5 * np.clip((X - Y) * 6 % 1, 0, 1))[..., None] * np.array([0.5, 0.6, 0.9], dtype=np.float32)
    for wx in (hx - 0.030, hx + 0.0, hx + 0.042):
        pane = rect(wx, win_cy - (0.012 if wx == hx + 0.042 else 0), ww if wx != hx + 0.042 else 0.0085, wh if wx != hx + 0.042 else 0.012)
        is_lit = lit and wx == hx - 0.030
        if is_lit:
            col = np.array([1.0, 0.80, 0.46], dtype=np.float32) * (0.92 + 0.12 * vnoise(X * 500, Y * 500, seed + 11))[..., None]
            bar = np.maximum(rect(wx, win_cy, 0.0008, wh), rect(wx, win_cy - 0.002, ww, 0.0007))
            col = mix(col, (0.30, 0.18, 0.08), bar * 0.8)
            house = mix(house, col, pane)
        else:
            house = mix(house, dark_glass, pane * 0.95)
    if lit:  # halo sur la façade et l'herbe devant
        d2 = (X - (hx - 0.030)) ** 2 + (Y - win_cy) ** 2
        house = house + (np.exp(-d2 / 0.00055) * 0.34)[..., None] * np.array([1.0, 0.62, 0.22], dtype=np.float32)
    house = mix(house, haze, np.full(Y.shape, 0.20, dtype=np.float32))
    img = mix(img, house, hmask)
    if lit:  # un peu de lumière chaude sur l'herbe et le chemin devant
        d2 = ((X - (hx - 0.030)) * 1.0) ** 2 + ((Y - base - 0.012) * 3.0) ** 2
        img = img + (np.exp(-d2 / 0.0016) * 0.10 * gm)[..., None] * np.array([1.0, 0.65, 0.25], dtype=np.float32)
    # herbes folles au premier plan, quelques fleurs pâles
    fy = smoothstep(0.55, 1.0, t)
    stalks = vnoise(X * 420, Y * 22, seed + 12)
    img = img * (1 - 0.35 * fy[..., None] * (stalks[..., None] < 0.35)) + 0.05 * fy[..., None] * (stalks[..., None] > 0.8)
    fl = (vnoise(X * 260, Y * 260, seed + 13) > 0.965) * fy * gm
    img = mix(img, (0.62, 0.62, 0.50), fl * 0.7)
    # prise de vue : lumière faible, voile, flou, vignette, grain
    img = blur(img, 1)
    img = vignette(img, 0.42)
    if aged > 0:  # tirage ancien : noirs relevés, contraste bas, désaturé, jaune, fuite chaude sur un bord
        lum = img.mean(axis=2, keepdims=True)
        img = lum + (img - lum) * (1 - 0.35 * aged)
        img = 0.5 + (img - 0.5) * (1 - 0.18 * aged)
        img = img + 0.075 * aged
        img = img * (1 + aged * (np.array([0.06, 0.0, -0.17], dtype=np.float32)))
        leak = np.exp(-((X - 0.0) / 0.12) ** 2) * (0.5 + 0.5 * fbm(Y * 3, Y * 0, seed + 14, 2)) * aged
        img = img + leak[..., None] * np.array([0.16, 0.06, 0.01], dtype=np.float32)
        img = blur(img, 1)
    img = grain(img, seed + 20, 0.022 + 0.01 * aged, 0.006)
    return np.clip(img, 0, 1).astype(np.float32)


def blank_card(w, h, seed=3):
    """Le cadre vide : un carton photo pâle, taché, sans image."""
    px, py = grid(w, h)
    n = fbm(px / 140, py / 140, seed, 4)
    fox = smoothstep(0.62, 0.78, fbm(px / 38, py / 38, seed + 1, 3))
    img = np.empty((h, w, 3), np.float32)
    img[:] = (0.80, 0.78, 0.71)
    img = img * (0.94 + 0.10 * n)[..., None]
    img = mix(img, (0.62, 0.55, 0.40), fox * 0.35)
    img = vignette(img, 0.28)
    img = grain(img, seed + 5, 0.012, 0.004)
    return np.clip(img, 0, 1).astype(np.float32)


# ---------------------------------------------------------------- le Polaroid
def polaroid_front(w=512, h=622, seed=5):
    """Face du Polaroid 8,8 x 10,7 cm : cadre blanc cassé jauni, image 7,9 x 7,9 cm (marges 4,5 / 6,5 / 21,5 mm)."""
    cm = w / 8.8
    px, py = grid(w, h)
    card = np.empty((h, w, 3), np.float32)
    card[:] = (0.905, 0.865, 0.725)
    card = card * (0.93 + 0.10 * fbm(px / 90, py / 90, seed, 4))[..., None]
    # jaunissement et usure des bords, taches d'humidité
    d = np.minimum(np.minimum(px, w - px), np.minimum(py, h - py))
    card = mix(card, (0.70, 0.55, 0.30), np.exp(-d / 26) * 0.40)
    stain = smoothstep(0.58, 0.75, fbm(px / 60, py / 60, seed + 1, 4))
    card = mix(card, (0.66, 0.50, 0.28), stain * 0.38)
    # photo
    x0, y0 = int(round(0.45 * cm)), int(round(0.65 * cm))
    pw = int(round(7.9 * cm))
    photo = house_scene(pw, pw, True, seed=11, aged=1.0)
    card[y0 : y0 + pw, x0 : x0 + pw] = photo
    edge = np.zeros((h, w), np.float32)
    edge[y0 - 1 : y0 + pw + 1, x0 - 1 : x0 + pw + 1] = 1
    edge[y0 + 1 : y0 + pw - 1, x0 + 1 : x0 + pw - 1] = 0
    card = mix(card, (0.35, 0.27, 0.15), edge * 0.5)
    # poussière, rayures fines, éraflures claires sur l'image
    rng = np.random.RandomState(seed)
    spk = (vnoise(px / 1.6, py / 1.6, seed + 2) > 0.90).astype(np.float32)
    card = mix(card, (0.2, 0.17, 0.1), spk * 0.30)
    for _ in range(5):
        x = rng.randint(x0 + 20, x0 + pw - 20)
        ya = rng.randint(y0, y0 + pw - 100)
        n = rng.randint(25, 90)
        card[ya : ya + n, x] = card[ya : ya + n, x] * 0.88 + 0.09
    # le coin corné en haut à droite est découpé dans la géométrie ; léger voile blanc le long du pli
    card = vignette(card, 0.10)
    card = grain(card, seed + 9, 0.010, 0.004)
    return np.clip(card, 0, 1).astype(np.float32)


# ---------------------------------------------------------------- le plan au crayon
def _stroke_layer(w, h, polylines, width, jitter=0.0, seed=0):
    """Pencil strokes: soft-edged capsules along wobbly polylines -> alpha (h, w)."""
    layer = np.zeros((h, w), np.float32)
    rng = np.random.RandomState(seed)
    for pts in polylines:
        pts = np.asarray(pts, dtype=np.float32)
        # densify every ~5 px and push each point sideways a little (a hand never draws straight)
        dense = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            n = max(1, int(np.hypot(*(b - a)) / 5))
            for i in range(1, n + 1):
                dense.append(a + (b - a) * i / n)
        dense = np.array(dense, dtype=np.float32)
        if jitter and len(dense) > 2:
            tang = np.gradient(dense, axis=0)
            tang /= np.maximum(np.linalg.norm(tang, axis=1, keepdims=True), 1e-6)
            nrm = np.stack([-tang[:, 1], tang[:, 0]], axis=1)
            walk = np.cumsum(rng.normal(0, jitter * 0.45, len(dense))).astype(np.float32)
            walk -= np.linspace(walk[0], walk[-1], len(dense))
            dense = dense + nrm * np.clip(walk, -jitter * 2.2, jitter * 2.2)[:, None]
        for a, b in zip(dense[:-1], dense[1:]):
            x0, x1 = int(max(min(a[0], b[0]) - width - 2, 0)), int(min(max(a[0], b[0]) + width + 3, w))
            y0, y1 = int(max(min(a[1], b[1]) - width - 2, 0)), int(min(max(a[1], b[1]) + width + 3, h))
            if x1 <= x0 or y1 <= y0:
                continue
            gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
            ab = b - a
            t = np.clip(((gx - a[0]) * ab[0] + (gy - a[1]) * ab[1]) / max(float(ab @ ab), 1e-6), 0, 1)
            dist = np.hypot(gx - (a[0] + t * ab[0]), gy - (a[1] + t * ab[1]))
            al = np.clip((width * 0.5 + 0.8 - dist) / 1.2, 0, 1)
            layer[y0:y1, x0:x1] = np.maximum(layer[y0:y1, x0:x1], al)
    return layer


def _bez(p0, p1, p2, n=14):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * np.array(p0) + 2 * (1 - t) * t * np.array(p1) + t ** 2 * np.array(p2)


def plan_paper(w=724, h=1024, seed=4):
    """A4 (21 x 29,7 cm) papier quadrillé 5 mm, plié en quatre puis déplié, un plan de couloirs au crayon : une pièce
    entourée deux fois, une flèche, « ici »."""
    px, py = grid(w, h)
    # le papier : blanc cassé, fibres, bords jaunis
    paper = np.empty((h, w, 3), np.float32)
    paper[:] = (0.925, 0.915, 0.870)
    paper = paper * (0.955 + 0.08 * fbm(px / 110, py / 110, seed, 4) + 0.025 * (vnoise(px / 1.4, py / 45, seed + 1) - 0.5))[..., None]
    d = np.minimum(np.minimum(px, w - px), np.minimum(py, h - py))
    paper = mix(paper, (0.80, 0.72, 0.52), np.exp(-d / 55) * 0.30)
    # quadrillé 5 mm, bleu-gris, encre inégale
    cell = w / 42.0
    fx, fy = px % cell, py % cell
    dl = np.minimum(np.minimum(fx, cell - fx), np.minimum(fy, cell - fy))
    line = np.clip(1.1 - dl, 0, 1) * (0.34 + 0.22 * vnoise(px / 30, py / 30, seed + 2))
    paper = mix(paper, (0.50, 0.66, 0.80), line)
    # pliage en quatre : un pli vertical et un horizontal, ombre d'un côté, fibres blanchies, croisement usé
    dx, dyy = px - w / 2, py - h / 2
    for dd, other in ((dx, dyy), (dyy, dx)):
        crease = np.exp(-(dd / 1.1) ** 2) * 0.22 + np.sign(dd) * np.exp(-(dd / 11) ** 2) * 0.045
        white = np.exp(-(dd / 1.0) ** 2) * (0.5 + 0.5 * vnoise(other / 6, dd * 0, seed + 3)) * 0.10
        paper = paper * (1 - crease)[..., None] + white[..., None]
    paper = paper + (np.exp(-((dx / 22) ** 2 + (dyy / 22) ** 2)) * 0.07)[..., None]
    # dessin : couloirs (union de rectangles, contour gauchi à la main), pièces, hachures
    S = 2
    mask = np.zeros((h * S, w * S), bool)

    def fill(x0, y0, x1, y1):
        mask[int(y0 * S) : int(y1 * S), int(x0 * S) : int(x1 * S)] = True

    cw = 13  # demi-largeur d'un couloir
    for x0, x1, y in ((90, 640, 300), (190, 560, 700), (190, 420, 120), (520, 650, 860)):
        fill(x0, y - cw, x1, y + cw)
    for x, y0, y1 in ((190, 120, 880), (520, 300, 900), (355, 300, 400)):
        fill(x - cw, y0, x + cw, y1)
    rooms = [(90, 110, 190, 205), (420, 88, 545, 205), (520, 352, 654, 478), (78, 438, 190, 565), (120, 880, 330, 962), (250, 380, 462, 604), (640, 820, 695, 902)]
    for r in rooms:
        fill(*r)
    gxx, gyy = np.meshgrid(np.arange(w * S, dtype=np.float32), np.arange(h * S, dtype=np.float32))
    wx = np.clip(gxx + S * 3.2 * (fbm(gxx / (S * 60), gyy / (S * 60), seed + 4, 3) - 0.5) * 2, 0, w * S - 1).astype(np.int32)
    wy = np.clip(gyy + S * 3.2 * (fbm(gxx / (S * 60) + 7, gyy / (S * 60) + 3, seed + 5, 3) - 0.5) * 2, 0, h * S - 1).astype(np.int32)
    m = mask[wy, wx]
    inner = m.copy()
    for sh, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)):
        inner &= np.roll(m, sh, ax)
    outline = (m & ~inner).astype(np.float32)
    outline = np.maximum(outline, np.roll(outline, 1, 0))
    outline = outline.reshape(h, S, w, S).mean(axis=(1, 3))
    outline = np.clip(outline * 1.5, 0, 1)
    # hachures dans la pièce entourée
    hatch = [[(536 + 18 * i, 470), (610 + 18 * i - 70, 360)] for i in range(0, 8)]
    hatch_a = _stroke_layer(w, h, hatch, 1.3, 0.8, seed + 6)
    rr = np.zeros((h, w), np.float32)
    rr[352:478, 520:654] = 1
    hatch_a = hatch_a * rr * 0.35
    # le cercle, deux fois : un tour un peu plus grand et décalé, qui déborde
    def loop(cx, cy, rx, ry, a0, turns, wob, sd):
        th = np.linspace(a0, a0 + turns * 2 * np.pi, 70)
        rng = np.random.RandomState(sd)
        k = 1 + wob * np.sin(th * 1.7 + rng.rand() * 6) + 0.02 * th
        return np.stack([cx + rx * k * np.cos(th), cy + ry * k * np.sin(th)], axis=1)

    ring = [loop(586, 415, 112, 96, -2.2, 1.12, 0.035, 1), loop(589, 418, 121, 103, -0.5, 1.10, 0.03, 2)]
    ring_a = _stroke_layer(w, h, ring, 2.6, 1.0, seed + 7)
    # la flèche et « ici »
    c = np.array([632, 548])
    arrow = [_bez((592, 612), tuple(c), (598, 490))]
    tip = np.array([598, 490], np.float32)
    dirv = tip - c
    dirv = dirv / np.linalg.norm(dirv)
    for sgn in (-1, 1):
        ang = np.radians(28) * sgn
        rot = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
        arrow.append([tip, tip - (rot @ dirv) * 19])
    arrow_a = _stroke_layer(w, h, arrow, 2.3, 0.7, seed + 8)

    def slant(pts):  # small right slant of a hand-written word
        return [(x + (665 - y) * 0.16, y) for x, y in pts]

    ici = [
        slant([(556, 626), (557, 662)]), slant([(556, 611), (557, 612)]),
        slant([(a, b) for a, b in zip(592 + 19 * np.cos(np.linspace(-0.9, -5.4, 16)), 644 + 20 * np.sin(np.linspace(-0.9, -5.4, 16)))]),
        slant([(626, 626), (627, 662)]), slant([(626, 611), (627, 612)]),
    ]
    ici_a = _stroke_layer(w, h, ici, 3.0, 0.6, seed + 9)
    # le crayon : grain du papier qui mange le trait, tracé plus appuyé sur le cercle et les lettres
    gr = 0.55 + 0.75 * fbm(px / 1.3, py / 1.3, seed + 10, 3)
    gr = np.clip(gr, 0.2, 1.1)
    graphite = np.clip(outline * 0.62 + hatch_a + ring_a * 0.86 + arrow_a * 0.82 + ici_a * 0.9, 0, 1) * gr
    smudge = np.exp(-(((px - 560) / 55) ** 2 + ((py - 560) / 30) ** 2)) * 0.07 * (0.6 + 0.4 * vnoise(px / 8, py / 8, seed + 11))
    paper = paper * (1 - smudge)[..., None]
    pencil = np.array([0.20, 0.21, 0.25], dtype=np.float32)
    paper = mix(paper, pencil, np.clip(graphite, 0, 0.95))
    paper = vignette(paper, 0.10)
    paper = grain(paper, seed + 12, 0.008, 0.003)
    return np.clip(paper, 0, 1).astype(np.float32)
