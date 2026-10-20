from pathlib import Path
root=Path('gallery-assets/birdsnest-v2')

def change(path,old,new):
    text=path.read_text()
    if old not in text and new in text:
        return
    assert text.count(old)==1, (str(path),old[:80],text.count(old))
    path.write_text(text.replace(old,new,1))

app=root/'src/app.js'
change(app,'controls.maxDistance=1050;','controls.maxDistance=touch?2600:1400;')
change(app,'multiplyScalar(1.42)','multiplyScalar(Math.max(1.42,1.05/camera.aspect))')
change(app,"const dt=Math.min(clock.getDelta(),.12);", "const frameDelta=Math.min(clock.getDelta(),.5),dt=Math.min(frameDelta,.1);")
change(app,"const moved=updateMovement(dt);", "let moved=0;for(let remaining=frameDelta;remaining>0;){const step=Math.min(remaining,.05);moved+=updateMovement(step);remaining-=step;}")
change(app,"value==='low'?1:touch?1.35:1.5", "value==='low'?.85:touch?1.25:1")
change(app,"['w','a','s','d','q','e',' ','control','arrowleft','arrowright','arrowup','arrowdown']", "['w','a','s','d','q','e',' ','control','shift','arrowleft','arrowright','arrowup','arrowdown']")

world=root/'src/world.js'
change(world,"  const treePositions=[];\n  for(let i=0;i<(preview?44:100);i++){\n    const t=i/(preview?44:100)*TAU;", "  // Stable positions independent of preview detail or seat-generation RNG.\n  seed=20261020;\n  const treePositions=[];\n  for(let i=0;i<100;i++){\n    const t=i/100*TAU;")
change(world,"  // The athletic track has parallel straights and semicircular ends, not an ellipse.", """  // Green infield occupies the complete athletic-track interior, not just the pitch.
  const infieldShape=new T.Shape();
  infieldShape.moveTo(36.5,-42.2);infieldShape.lineTo(36.5,42.2);
  infieldShape.absarc(0,42.2,36.5,0,Math.PI,false);
  infieldShape.lineTo(-36.5,-42.2);infieldShape.absarc(0,-42.2,36.5,Math.PI,Math.PI*2,false);infieldShape.closePath();
  const infield=mesh(new T.ShapeGeometry(infieldShape,48),M.grass,parts.interior,0,G+.06,0);infield.rotation.x=-Math.PI/2;infield.castShadow=false;
  // The athletic track has parallel straights and semicircular ends, not an ellipse.""")
print('Refined mobile framing, substepped movement, Shift handling, full infield, and identical preview tree locations.')
