"""Genera las imágenes WebP responsive de la visita virtual a partir de las fotos originales.

Uso:   python docs/visita-museo/build-images.py "C:\\ruta\\a\\MUSEO"

Para cada foto crea varios tamaños (lado mayor) que el visor elige según la pantalla:
    visita-museo/img/escenas/<id>-900.webp | -1600.webp | -2400.webp
    visita-museo/img/piezas/<id>-640.webp  | -1200.webp | -1800.webp
Nunca se amplía una foto: si el original (o el recorte) es más chico que un tamaño, ese tamaño se omite.
También escribe visita-museo/js/imagenes.js con las dimensiones reales y una vista previa
borrosa (LQIP, ~300 bytes) de cada foto: permite reservar el espacio y evitar pantallas vacías.

Los originales NO se tocan ni se publican. Para sumar una foto: agregá una línea en SCENES o
PIECES y el id correspondiente en visita-museo/js/escenas.js.
`crop` = (x0, y0, x1, y1) como fracciones 0-1 del original, para recortar un detalle.
"""
import base64
import io
import json
import os
import sys
from PIL import Image, ImageOps

SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\Ricardo\Desktop\PROYECTOS MSR\16 Pasantia Dev_Software_SanRoque\MUSEO'
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'visita-museo')
NEW = 'Museo nuevo fotografias flyers'

SCENE_SIZES = [(900, 74), (1600, 76), (2400, 78)]   # (lado mayor, calidad)
PIECE_SIZES = [(640, 76), (1200, 78), (1800, 80)]

SCENES = {
    'aerea': f'{NEW}/Drone/DJI_0635.jpg',
    'parque': f'{NEW}/CLA_4670.JPG',
    'entrada': f'{NEW}/CLA_4691.JPG',
    'galeria': f'{NEW}/CLA_4737.JPG',
    'sala': f'{NEW}/CLA_4762.JPG',
    'virgen': f'{NEW}/CLA_4777.JPG',
    'altar': f'{NEW}/CLA_4783.JPG',
    'caldero': f'{NEW}/CLA_4808.JPG',
    'sables': f'{NEW}/CLA_4801.JPG',
    'santos': f'{NEW}/CLA_4839.JPG',
    'nicho': f'{NEW}/CLA_4769.JPG',
    'pila': f'{NEW}/CLA_4831.JPG',
    'auditorio': f'{NEW}/CLA_4120.JPG',
    'arte': f'{NEW}/CLA_4136.JPG',
    'antiguo-fachada': 'CLA_8056.JPG.jpeg',
    'antiguo-sala': 'Museo Antiguo.jpeg',
}

PIECES = {
    'busto': (f'{NEW}/CLA_4676.JPG', None),
    'morteros': (f'{NEW}/CLA_4737.JPG', (0.25, 0.40, 0.80, 0.95)),
    'crucifijo': (f'{NEW}/CLA_4786.JPG', None),
    'virgen': (f'{NEW}/CLA_4774.JPG', None),
    'caldero': (f'{NEW}/CLA_4795.JPG', None),
    'sables': (f'{NEW}/CLA_4801.JPG', (0.18, 0.52, 0.78, 0.92)),
    'san-roque-peana': (f'{NEW}/CLA_4839.JPG', (0.08, 0.12, 0.88, 0.97)),
    'dolorosa': (f'{NEW}/CLA_4839.JPG', (0.04, 0.18, 0.30, 0.52)),
    'cristo-cruz': (f'{NEW}/CLA_4827.JPG', None),
    'san-roque-nicho': (f'{NEW}/CLA_4847.JPG', None),
    'acta': (f'{NEW}/CLA_4769.JPG', (0.70, 0.23, 0.99, 0.84)),
    'pila': (f'{NEW}/CLA_4831.JPG', (0.12, 0.40, 0.78, 0.97)),
    'logo': (f'{NEW}/CLA_4753.JPG', None),
    'cuadro-paisaje': (f'{NEW}/CLA_4155.JPG', None),
    'pinturas': (f'{NEW}/CLA_4158.JPG', None),
    'campana-torre': ('CLA_8077.JPG.jpeg', None),
    'antiguo-campana': ('Museo Antiguo.jpeg', (0.45, 0.62, 0.68, 0.88)),
    'antiguo-imagen': ('Museo Antiguo.jpeg', (0.45, 0.32, 0.70, 0.68)),
    'antiguo-manto': ('Museo Antiguo.jpeg', (0.10, 0.30, 0.30, 0.65)),
    'antiguo-farol': ('Museo Antiguo.jpeg', (0.0, 0.45, 0.18, 0.72)),
}


def lqip(im):
    t = im.copy()
    t.thumbnail((24, 24), Image.LANCZOS)
    buf = io.BytesIO()
    t.save(buf, 'WEBP', quality=45, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def build(kind, key, src, sizes, crop=None):
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert('RGB')
    if crop:
        w, h = im.size
        im = im.crop((int(w * crop[0]), int(h * crop[1]), int(w * crop[2]), int(h * crop[3])))
    native = max(im.size)
    out = os.path.join(BASE, 'img', kind)
    os.makedirs(out, exist_ok=True)
    variants = []
    for long_edge, q in sizes:
        if long_edge > native and variants:   # no ampliar: ya existe la versión máxima disponible
            continue
        v = im.copy()
        v.thumbnail((long_edge, long_edge), Image.LANCZOS)   # thumbnail solo reduce
        name = f'{key}-{max(v.size)}.webp'
        v.save(os.path.join(out, name), 'WEBP', quality=q, method=6)
        if [vw for vw, _ in variants if vw == v.size[0]]:
            continue
        variants.append(v.size)
        print(f'{kind}/{name}', v.size, os.path.getsize(os.path.join(out, name)) // 1024, 'KB')
    return {'w': im.size[0], 'h': im.size[1], 'v': [[w, h] for w, h in variants], 'lqip': lqip(im)}


manifest = {'escenas': {}, 'piezas': {}}
for k in ('escenas', 'piezas'):   # limpia versiones anteriores
    d = os.path.join(BASE, 'img', k)
    if os.path.isdir(d):
        for f in os.listdir(d):
            os.remove(os.path.join(d, f))
for sid, f in SCENES.items():
    manifest['escenas'][sid] = build('escenas', sid, f, SCENE_SIZES)
for pid, (f, crop) in PIECES.items():
    manifest['piezas'][pid] = build('piezas', pid, f, PIECE_SIZES, crop)

with open(os.path.join(BASE, 'js', 'imagenes.js'), 'w', encoding='utf-8') as fh:
    fh.write('/* GENERADO por docs/visita-museo/build-images.py. No editar a mano. */\n')
    fh.write('window.VISITA_IMG = ' + json.dumps(manifest, separators=(',', ':')) + ';\n')
print('manifest listo')
