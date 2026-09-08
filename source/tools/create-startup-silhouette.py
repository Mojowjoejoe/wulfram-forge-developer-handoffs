"""Project the shipped tank and missile geometry into the native startup artwork."""
import hashlib
import sys
import zipfile
from pathlib import Path
from extract_wulfram_assets import parse_shape

archive = Path(sys.argv[1])
destination = Path(__file__).resolve().parents[1] / 'desktop/WulframForge/StartupTankGeometry.cs'
def project(v):
    x, y, z = v
    return (x * .86 + y * .51, x * .18 - y * .30 - z * .94)
with zipfile.ZipFile(archive) as z:
    tank = parse_shape(z.read('tank_1'))
    missile = parse_shape(z.read('missile_1'))
lines = ['// Generated from original Wulfram II shapes.zip; no invented tank geometry.',
         '// Archive SHA-256: ' + hashlib.sha256(archive.read_bytes()).hexdigest(),
         'namespace WulframForge;', 'internal static class StartupTankGeometry', '{']
for name, model in [('Tank',tank),('Missile',missile)]:
    lines.append(f'    internal static readonly PointF[][] {name} = new PointF[][] {{')
    for mesh in model['meshes']:
        p = mesh['positions']
        for i in range(0,len(p),9):
            points=[project(p[j:j+3]) for j in range(i,i+9,3)]
            lines.append('        new PointF[] { '+', '.join(f'new({x:.5f}f,{y:.5f}f)' for x,y in points)+' },')
    lines.append('    };')
x,y=project(tank['namedVectors']['missile_pos'])
lines += [f'    internal static readonly PointF LaunchPoint = new({x:.5f}f,{y:.5f}f);','}']
destination.write_text('\n'.join(lines)+'\n')
print(destination)
