from pathlib import Path

root = Path('gallery-assets/birdsnest-v2')

def replace_once(path, old, new):
    text = path.read_text()
    if new in text and old not in text:
        return
    assert text.count(old) == 1, f'{path}: expected one exact source match, found {text.count(old)}'
    path.write_text(text.replace(old, new, 1))

app = root / 'src/app.js'
replace_once(app, 'float patch=smoothstep(.2,.75,noise(p));', 'float puddleMask=smoothstep(.2,.75,noise(p));')
replace_once(app, 'outside*edge*patch*wetness*.35', 'outside*edge*puddleMask*wetness*.35')
replace_once(app, 'renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.35:1.5));', 'renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.25:1));')
replace_once(app, 'sun.shadow.mapSize.set(2048,2048)', 'sun.shadow.mapSize.set(1024,1024)')
replace_once(app, 'textureWidth:touch?256:512,textureHeight:touch?256:512', 'textureWidth:touch?128:256,textureHeight:touch?128:256')
replace_once(app, "const world=createBirdsnestWorld(T);world.materials.redGlow.side=T.DoubleSide;scene.add(world.group);", "const world=createBirdsnestWorld(T);world.materials.redGlow.side=T.DoubleSide;scene.add(world.group);\nconst seatDetailMeshes=world.parts.bowl.children.filter(o=>o.userData.seatDetail);")
replace_once(app, 't:0,duration,arc:', 't:0,startTime:performance.now(),duration,arc:')
replace_once(app, 'const tr=transition;tr.t+=dt;', 'const tr=transition;tr.t=(performance.now()-tr.startTime)/1000;')
replace_once(app, 'const dt=Math.min(clock.getDelta(),.05);', 'const dt=Math.min(clock.getDelta(),.12);')
replace_once(app, 'renderer.render(scene,camera);lastStats=', 'for(const m of seatDetailMeshes)m.visible=camera.position.distanceTo(m.boundingSphere.center)<215;\n renderer.render(scene,camera);lastStats=')

html = root / 'src/index.html'
replace_once(html, '.walk-only{display:none}', '.dock .walk-only{display:none}')
replace_once(html, '.walking .walk-only{display:flex}', '.walking .dock .walk-only{display:flex}')

world = root / 'src/world.js'
text = world.read_text()
start = text.index('  if(!preview){const sit=')
end = text.index('  // The athletic track', start)
new = '''  if(!preview){
    // Eight-triangle L-shaped seats preserve a real seat/back silhouette. Sector
    // instancing permits proper frustum and distance culling instead of drawing
    // every seat while looking at the outside of the building.
    const chair=new T.BufferGeometry();
    const positions=[];
    const q=(a,b,c,d)=>positions.push(...a,...b,...c,...a,...c,...d);
    q([-.28,-.06,-.24],[-.28,-.06,.24],[.28,-.06,.24],[.28,-.06,-.24]);
    q([-.28,-.18,-.24],[-.28,-.06,-.24],[.28,-.06,-.24],[.28,-.18,-.24]);
    q([-.28,-.06,.2],[-.28,.52,.2],[.28,.52,.2],[.28,-.06,.2]);
    q([-.28,.52,.2],[-.28,.52,.27],[.28,.52,.27],[.28,.52,.2]);
    chair.setAttribute('position',new T.Float32BufferAttribute(positions,3));chair.computeVertexNormals();
    M.seat.side=T.DoubleSide;
    const sectors=Array.from({length:24},()=>[]);
    seats.forEach(s=>sectors[Math.floor(((Math.atan2(s.z,s.x)+TAU)%TAU)/TAU*24)%24].push(s));
    const ob=new T.Object3D(),color=new T.Color();
    for(const sector of sectors){
      const m=new T.InstancedMesh(chair,M.seat,sector.length);
      sector.forEach((s,i)=>{ob.position.set(s.x,s.y,s.z);ob.rotation.y=s.angle;ob.updateMatrix();m.setMatrixAt(i,ob.matrix);color.setHSL(.018+s.color*.014,.47+s.color*.08,.29+s.color*.12);m.setColorAt(i,color);});
      m.userData.seatDetail=true;m.receiveShadow=true;m.computeBoundingSphere();parts.bowl.add(m);
    }
  }
'''
text = text[:start] + new + text[end:]
old = 'M.light.emissiveIntensity=1.6+night*2.5;'
assert old in text
text = text.replace(old, 'M.light.emissiveIntensity=arenaOn?1.6+night*2.5:.08;', 1)
world.write_text(text)

# Keep the original boot/shader failures as evidence, not as the current result.
report = root / 'evidence/acceptance.json'
if report.exists():
    (root / 'evidence/shader-regression-before.json').write_text(report.read_text())
print('Applied exact source patches: GLSL reserved word, sector seat LOD, real-time camera transitions, dock state, persistent light interaction.')
