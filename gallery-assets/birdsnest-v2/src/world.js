/* Birdsnest V2. Native units: metres. Grade = 18 m above the exhibit base.
   Authored architectural study, NOT an as-built survey/BIM reconstruction.
   All geometry and textures are generated locally; no external assets.
   This function is shared by the complete experience and its geometry preview. */
export const GRADE = 18;
export const VIEWS = [
  {id:'overview',label:'整座鸟巢',detail:'把一座建筑，轻轻放在掌心。',position:[425,322,478],target:[0,43,0],mode:'orbit'},
  {id:'plaza',label:'雨后南广场',detail:'走近钢的编织，听脚步落在石上。',position:[10,19.7,208],target:[0,40,128],mode:'walk'},
  {id:'tunnel',label:'出场之前',detail:'穿过安静的通道，草坪在另一端。',position:[0,19.7,127],target:[0,20,85],mode:'walk'},
  {id:'field',label:'站在球场上',detail:'抬头看，天空被建筑围成一片椭圆。',position:[12,19.7,40],target:[0,47,-130],mode:'walk'},
  {id:'stand',label:'看台的回声',detail:'红色座椅、层层台阶与一整个赛场。',position:[95,45,22],target:[0,26,0],mode:'walk'},
  {id:'steel',label:'钢与天空之间',detail:'自由飞行，看见内外两层结构。',position:[127,84,96],target:[15,56,0],mode:'ghost'},
  {id:'basement',label:'地面之下',detail:'地下交通与设备空间的研究性重建。',position:[205,7.7,24],target:[205,9,-10],mode:'walk'}
];

export function createBirdsnestWorld(T, options={}) {
  const preview=!!options.preview, G=GRADE, TAU=Math.PI*2;
  let seed=42522;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const group=new T.Group(); group.name='Birdsnest · 雨后';
  const parts={}; for(const name of ['site','landscape','steel','roof','bowl','interior','underground','details']){const p=new T.Group();p.name=name;parts[name]=p;group.add(p);}
  const materials=[],textures=[],buckets=new Map(),floors=[];
  function canvasTexture(size,draw,repeat=1){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');draw(x,size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;textures.push(t);return t;}
  const paving=canvasTexture(512,(c,s)=>{c.fillStyle='#999b93';c.fillRect(0,0,s,s);for(let y=0;y<s;y+=64)for(let x=0;x<s;x+=64){const v=143+rand()*24;c.fillStyle=`rgb(${v|0},${(v+2)|0},${(v-4)|0})`;c.fillRect(x+1,y+1,62,62);}for(let i=0;i<27000;i++){c.fillStyle=rand()>.5?'#ffffff08':'#1111110b';c.fillRect(rand()*s,rand()*s,1,1);}},.105);
  const concreteTex=canvasTexture(256,(c,s)=>{c.fillStyle='#a5a59c';c.fillRect(0,0,s,s);for(let i=0;i<15000;i++){const v=100+rand()*100;c.fillStyle=`rgba(${v|0},${v|0},${v|0},.09)`;c.fillRect(rand()*s,rand()*s,rand()*2+1,1);}},1);
  const turf=canvasTexture(1024,(c,s)=>{for(let i=0;i<16;i++){c.fillStyle=i%2?'#4a7046':'#587d4d';c.fillRect(0,i*s/16,s,s/16);}for(let i=0;i<50000;i++){c.fillStyle=rand()>.5?'#bdd79920':'#14381918';c.fillRect(rand()*s,rand()*s,1,2);}c.strokeStyle='#e6e8ce';c.lineWidth=3;c.strokeRect(24,24,s-48,s-48);c.beginPath();c.moveTo(24,s/2);c.lineTo(s-24,s/2);c.stroke();c.beginPath();c.ellipse(s/2,s/2,135,85,0,0,TAU);c.stroke();for(const y of [24,s-24]){const sign=y<s/2?1:-1;c.strokeRect(s/2-295,y,590,sign*155);c.strokeRect(s/2-130,y,260,sign*50);c.beginPath();c.arc(s/2,y+sign*108,4,0,TAU);c.fillStyle='#e6e8ce';c.fill();}},1);
  function mat(color,rough=.8,metal=0,extra={}){const m=new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});materials.push(m);return m;}
  const M={
    steel:mat('#bec4c0',.34,.68),heavy:mat('#a9b1ad',.41,.62),concrete:mat('#b5b4a8',.91,0,{map:concreteTex}),paving:mat('#c0bcae',.63,.05,{map:paving}),
    base:mat('#394547',.82),red:mat('#a44738',.72),redDark:mat('#672a25',.69),seat:mat('#b44d40',.54),seatback:mat('#9e392e',.54),
    dark:mat('#2c3839',.62,.3),wood:mat('#84674b',.83),grass:mat('#71806a',.94),leaf:mat('#697c55',.94),trunk:mat('#54473b',.97),
    track:mat('#865c48',.97),line:mat('#dcd8bd',.83),turf:mat('#ffffff',.94,0,{map:turf}),asphalt:mat('#49534f',.54,.08),
    glass:mat('#577e80',.24,.22,{transparent:true,opacity:.44,depthWrite:false}),membrane:mat('#dfdec8',.74,0,{transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false}),
    light:mat('#ffdf9b',.3,0,{emissive:'#ffb456',emissiveIntensity:2.1}),redGlow:mat('#8e352b',.64,0,{emissive:'#cb4228',emissiveIntensity:.24}),
    white:mat('#dedcca',.75),black:mat('#252f30',.85),blue:mat('#536e77',.73),skin:mat('#bf9f80',.8)
  };
  const boxGeometry=new T.BoxGeometry(1,1,1).toNonIndexed();
  const bp=boxGeometry.attributes.position.array,bn=boxGeometry.attributes.normal.array,bu=boxGeometry.attributes.uv.array;
  const q=new T.Quaternion(),up=new T.Vector3(0,1,0),v=new T.Vector3(),n=new T.Vector3(),scl=new T.Vector3();
  function bucket(material,part){const key=part.name+material.uuid;let b=buckets.get(key);if(!b){b={material,part,p:[],n:[],u:[]};buckets.set(key,b);}return b;}
  function addBox(material,part,x,y,z,w,h,d,quaternion){const b=bucket(material,part);const quat=quaternion||new T.Quaternion();for(let i=0,j=0;i<bp.length;i+=3,j+=2){v.set(bp[i]*w,bp[i+1]*h,bp[i+2]*d).applyQuaternion(quat);n.set(bn[i],bn[i+1],bn[i+2]).applyQuaternion(quat);b.p.push(v.x+x,v.y+y,v.z+z);b.n.push(n.x,n.y,n.z);b.u.push(bu[j],bu[j+1]);}}
  const box=(material,part,x,y,z,w,h,d,angle=0)=>{q.setFromAxisAngle(up,angle);addBox(material,part,x,y,z,w,h,d,q);};
  function beam(a,b,width,material,part,depth=width){const va=new T.Vector3(...a),vb=new T.Vector3(...b),dir=vb.clone().sub(va);q.setFromUnitVectors(up,dir.clone().normalize());const mid=va.add(vb).multiplyScalar(.5);addBox(material,part,mid.x,mid.y,mid.z,width,dir.length()+.025,depth,q);}
  function quad(a,b,c,d,material,part){const bkt=bucket(material,part);const nn=new T.Vector3(...b).sub(new T.Vector3(...a)).cross(new T.Vector3(...c).sub(new T.Vector3(...a))).normalize();for(const p of [a,b,c,a,c,d]){bkt.p.push(...p);bkt.n.push(nn.x,nn.y,nn.z);bkt.u.push(p[0],p[2]);}}
  function mesh(geometry,material,part,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;part.add(m);return m;}
  function roundedRect(w,d,r){const sh=new T.Shape();sh.moveTo(-w/2+r,-d/2);sh.lineTo(w/2-r,-d/2);sh.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);sh.lineTo(w/2,d/2-r);sh.quadraticCurveTo(w/2,d/2,w/2-r,d/2);sh.lineTo(-w/2+r,d/2);sh.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);sh.lineTo(-w/2,-d/2+r);sh.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);return sh;}
  function ring(a,b,ai,bi,y,material,part,segments=160,gap=false){for(let i=0;i<segments;i++){const t=i/segments*TAU,t2=(i+1)/segments*TAU;if(gap&&Math.abs(t-Math.PI/2)<.055)continue;quad([a*Math.cos(t),y,b*Math.sin(t)],[ai*Math.cos(t),y,bi*Math.sin(t)],[ai*Math.cos(t2),y,bi*Math.sin(t2)],[a*Math.cos(t2),y,b*Math.sin(t2)],material,part);}}
  // A hollow, cut-away exhibit plinth leaves a genuine opening for the basement stairs.
  const shape=roundedRect(624,574,28); const hole=new T.Path();hole.moveTo(198,-84);hole.lineTo(212,-84);hole.lineTo(212,-25);hole.lineTo(198,-25);hole.closePath();shape.holes.push(hole);
  const base=mesh(new T.ExtrudeGeometry(shape,{depth:18,bevelEnabled:false,curveSegments:10}),M.base,parts.site);base.rotation.x=-Math.PI/2;
  const ground=mesh(new T.ShapeGeometry(shape,10),M.paving,parts.site,0,G+.015,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;floors.push(ground);
  // Roads, pedestrian crossings, planted margins and human-scale street furniture.
  for(const z of [-252,252]){box(M.asphalt,parts.site,0,G+.03,z,590,.04,15);for(let x=-280;x<285;x+=16)box(M.line,parts.site,x,G+.065,z,6,.015,.22);}
  for(const x of [-278,278]){box(M.asphalt,parts.site,x,G+.03,0,15,.04,490);for(let z=-235;z<240;z+=16)box(M.line,parts.site,x,G+.065,z,.22,.015,6);}
  for(let i=-6;i<=6;i++)box(M.white,parts.site,i*2.2,G+.08,252,1.1,.025,13);
  for(const z of [-241,241])box(M.concrete,parts.site,0,G+.25,z,570,.45,.5);
  for(const x of [-267,267])box(M.concrete,parts.site,x,G+.25,0,.5,.45,470);
  for(const sx of [-1,1])for(const sz of [-1,1]){box(M.grass,parts.landscape,sx*225,G+.08,sz*182,62,.15,78);box(M.concrete,parts.landscape,sx*225,G+.25,sz*223,64,.5,.5);}
  ring(190,208,181,199,G+.08,M.concrete,parts.site,192);
  ring(183,201,182.6,200.6,G+.09,M.line,parts.site,192);
  for(let i=0;i<8;i++)ring(173+i*1.2,191+i*1.2,172+i*1.2,190+i*1.2,G+.12+i*.045,M.paving,parts.site,192);
  // A measured oval envelope with a saddle roof. Members have square sections, not wire lines.
  const H=t=>61+8*Math.cos(2*t);
  function shell(t,u){const bulge=.873+.127*Math.sin(u*Math.PI*.62);return[148*bulge*Math.cos(t),G+u*H(t),166.5*bulge*Math.sin(t)];}
  function roof(t,u){const a=148*(1-u)+62.05*u,b=166.5*(1-u)+91.2*u;return[a*Math.cos(t),G+H(t)-9*u,b*Math.sin(t)];}
  const seg=preview?10:24;
  for(let i=0;i<24;i++){
    const a=i/24*TAU;
    for(const side of [-1,1]){let old=shell(a+side*.14,0);for(let j=1;j<=seg;j++){const u=j/seg;const pt=shell(a+side*.14*(1-u)+.035*Math.sin(u*Math.PI),u);beam(old,pt,1.15,M.heavy,parts.steel,.86);old=pt;}}
    for(const side of [-1,1]){let old=roof(a,0);for(let j=1;j<=12;j++){const u=j/12;const pt=roof(a+side*.16*Math.sin(u*Math.PI/2),u);beam(old,pt,1.05,M.steel,parts.roof,.82);old=pt;}}
  }
  for(let family=0;family<2;family++)for(let i=0;i<52;i++){
    const a=i/52*TAU,sign=family?1:-1,span=.5+.15*Math.sin(i*2.31),width=.52+rand()*.22;
    let old=shell(a-sign*.3,.025);
    for(let j=1;j<=seg;j++){const u=.025+.975*j/seg;const theta=a+sign*span*(u-.5)+.04*Math.sin(u*5+i);const pt=shell(theta,u);beam(old,pt,width,M.steel,parts.steel,width*.86);old=pt;}
  }
  // Continuous irregular lateral bands make the structural weave readable from the plaza.
  for(let band=0;band<9;band++){let old;const steps=preview?96:192;for(let i=0;i<=steps;i++){const t=i/steps*TAU,u=clamp(.08+band*.101+.039*Math.sin(3*t+band*1.7)+.022*Math.cos(7*t-band),.025,.98);const pt=shell(t,u);if(old)beam(old,pt,.55,M.steel,parts.steel,.48);old=pt;}}
  for(let family=0;family<2;family++)for(let i=0;i<48;i++){const a=i/48*TAU;let old=roof(a,0);for(let j=1;j<=12;j++){const u=j/12;const pt=roof(a+(family?1:-1)*u*.33,u);beam(old,pt,.47,M.steel,parts.roof,.4);old=pt;}}
  for(let band=1;band<7;band++){let old;for(let i=0;i<=144;i++){const t=i/144*TAU,pt=roof(t,band/7);if(old)beam(old,pt,.42,M.steel,parts.roof,.38);old=pt;}}
  for(let i=0;i<144;i++)for(let j=0;j<4;j++){const t=i/144*TAU,t2=(i+1)/144*TAU;const a=roof(t,j/4),b=roof(t2,j/4),c=roof(t2,(j+1)/4),d=roof(t,(j+1)/4);for(const p of[a,b,c,d])p[1]-=.45;quad(a,d,c,b,M.membrane,parts.roof);}
  // Independent concrete bowl and open ground-floor entrances.
  const NS=preview?96:192;
  for(let i=0;i<NS;i++){
    const t=i/NS*TAU,t2=(i+1)/NS*TAU;const gap=Math.abs(Math.sin(t*12))<.17;
    const low=gap?G+9:G+.4;
    quad([132*Math.cos(t),low,150*Math.sin(t)],[132*Math.cos(t2),low,150*Math.sin(t2)],[132*Math.cos(t2),G+46,150*Math.sin(t2)],[132*Math.cos(t),G+46,150*Math.sin(t)],M.redGlow,parts.bowl);
  }
  for(const y of [9,21,34,45]){ring(136,154,130,148,G+y,M.concrete,parts.bowl,NS);ring(132.3,150.3,131.7,149.7,G+y+.27,M.light,parts.bowl,NS);}
  for(let i=0;i<48;i++){const t=i/48*TAU;box(M.concrete,parts.interior,126*Math.cos(t),G+20,144*Math.sin(t),1.2,40,1.2,t);}
  const tiers=[{a:66,b:98,a2:91,b2:123,y:1.2,h:14.4,rows:20},{a:94,b:126,a2:108,b2:138,y:18.5,h:10,rows:13},{a:111,b:141,a2:129,b2:154,y:32,h:18,rows:24}];
  const seats=[];
  tiers.forEach((tier,ti)=>{const rows=tier.rows;for(let r=0;r<rows;r++){
    const u=r/rows,u2=(r+1)/rows,a=tier.a+(tier.a2-tier.a)*u,b=tier.b+(tier.b2-tier.b)*u,a2=tier.a+(tier.a2-tier.a)*u2,b2=tier.b+(tier.b2-tier.b)*u2,y=G+tier.y+tier.h*u;
    ring(a2,b2,a,b,y,M.concrete,parts.bowl,NS,ti===0);
    for(let i=0;i<NS;i++){const t=i/NS*TAU,t2=(i+1)/NS*TAU;if(ti===0&&Math.abs(t-Math.PI/2)<.065)continue;quad([a2*Math.cos(t),y,b2*Math.sin(t)],[a2*Math.cos(t2),y,b2*Math.sin(t2)],[a2*Math.cos(t2),y+tier.h/rows,b2*Math.sin(t2)],[a2*Math.cos(t),y+tier.h/rows,b2*Math.sin(t)],M.redDark,parts.bowl);}
    if(!preview){const count=Math.round(TAU*Math.sqrt((a*a+b*b)/2)/.92);for(let i=0;i<count;i++){const t=i/count*TAU;if(Math.abs(Math.sin(t*12))<.14||(ti===0&&Math.abs(t-Math.PI/2)<.085))continue;seats.push({x:(a+.5)*Math.cos(t),y:y+.53,z:(b+.5)*Math.sin(t),angle:-t+Math.PI/2,color:rand()});}}
  }});
  if(!preview){
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
  // Green infield occupies the complete athletic-track interior, not just the pitch.
  const infieldShape=new T.Shape();
  infieldShape.moveTo(36.5,-42.2);infieldShape.lineTo(36.5,42.2);
  infieldShape.absarc(0,42.2,36.5,0,Math.PI,false);
  infieldShape.lineTo(-36.5,-42.2);infieldShape.absarc(0,-42.2,36.5,Math.PI,Math.PI*2,false);infieldShape.closePath();
  const infield=mesh(new T.ShapeGeometry(infieldShape,48),M.grass,parts.interior,0,G+.06,0);infield.rotation.x=-Math.PI/2;infield.castShadow=false;
  // The athletic track has parallel straights and semicircular ends, not an ellipse.
  const capsule=(t,r)=>[Math.cos(t)*r,Math.sin(t)*r+(Math.sin(t)>=0?42.2:-42.2)];
  for(let i=0;i<192;i++){const t=i/192*TAU,t2=(i+1)/192*TAU,a=capsule(t,47.6),b=capsule(t,36.5),c=capsule(t2,36.5),d=capsule(t2,47.6);quad([a[0],G+.075,a[1]],[b[0],G+.075,b[1]],[c[0],G+.075,c[1]],[d[0],G+.075,d[1]],M.track,parts.interior);for(let lane=0;lane<10;lane++){const r=36.5+lane*1.22;const a=capsule(t,r),b=capsule(t,r+.065),c=capsule(t2,r+.065),d=capsule(t2,r);quad([a[0],G+.09,a[1]],[b[0],G+.09,b[1]],[c[0],G+.09,c[1]],[d[0],G+.09,d[1]],M.line,parts.interior);}}
  const pitch=mesh(new T.PlaneGeometry(68,105),M.turf,parts.interior,0,G+.095,0);pitch.rotation.x=-Math.PI/2;pitch.castShadow=false;
  for(const z of [-53,53]){for(const x of [-3.66,3.66])beam([x,G+.1,z],[x,G+2.54,z],.11,M.white,parts.details);beam([-3.66,G+2.54,z],[3.66,G+2.54,z],.11,M.white,parts.details);for(let i=-7;i<=7;i++)beam([i*.5,G+.15,z+Math.sign(z)*1.6],[i*.5,G+2.45,z],.017,M.white,parts.details);for(let i=0;i<5;i++)beam([-3.6,G+.3+i*.48,z+Math.sign(z)*1.3],[3.6,G+.3+i*.48,z+Math.sign(z)*1.3],.016,M.white,parts.details);}
  // South entrance / player tunnel. A real clear opening is left in the lower bowl.
  box(M.concrete,parts.interior,-5.8,G+2.8,122,.7,5.6,36);box(M.concrete,parts.interior,5.8,G+2.8,122,.7,5.6,36);box(M.concrete,parts.interior,0,G+5.65,122,12,.5,36);
  for(let z=108;z<=138;z+=6)box(M.light,parts.interior,0,G+5.35,z,5.5,.06,.17);
  for(const x of [-5.39,5.39])box(M.redDark,parts.interior,x,G+1.2,122,.08,2.4,35);
  // Basement: visible staircase down 12 metres, room and service details.
  box(M.concrete,parts.underground,205,5.8,6,38,.4,52);
  for(const x of [185.7,224.3])box(M.concrete,parts.underground,x,9.4,6,.6,7,52);
  box(M.concrete,parts.underground,205,9.4,-20,39,7,.6);
  box(M.concrete,parts.underground,192,9.4,32,13,7,.6);box(M.concrete,parts.underground,218,9.4,32,13,7,.6);
  box(M.concrete,parts.underground,205,13,5,39,.4,52);
  for(let i=0;i<24;i++){const z=80-i*2,y=G-(i+1)*.5;box(M.concrete,parts.underground,205,y-.15,z,8,.3,2.01);}
  for(const x of [200.4,209.6]){beam([x,G+1,81],[x,7,32],.065,M.heavy,parts.underground);for(let i=0;i<9;i++)beam([x,G-(i*6)/4,80-i*6],[x,G+1-(i*6)/4,80-i*6],.05,M.heavy,parts.underground);}
  for(let z=-16;z<31;z+=8){box(M.light,parts.underground,205,12.68,z,9,.08,.19);for(const x of [192,218])box(M.blue,parts.underground,x,8.1,z,3,4.2,3);}
  for(const x of [187,222]){beam([x,11.8,-19],[x,11.8,29],.24,M.red,parts.underground);beam([x+.5,11.8,-19],[x+.5,11.8,29],.15,M.blue,parts.underground);}
  const roomLight=new T.PointLight('#ffd69a',110,52,2);roomLight.position.set(205,11,3);parts.underground.add(roomLight);
  const door=new T.Group();door.position.set(201.3,6,32);parts.underground.add(door);const doorPanel=mesh(new T.BoxGeometry(7.4,5.6,.2),M.blue,door,3.7,2.8,0);doorPanel.castShadow=true;
  let doorOpen=true,doorAngle=0;door.rotation.y=-Math.PI/2;
  // Landscape: clustered canopies, trunks, lamp pools, seats and railings.
  // Stable positions independent of preview detail or seat-generation RNG.
  seed=20261020;
  const treePositions=[];
  for(let i=0;i<100;i++){
    const t=i/100*TAU;const x=(231+rand()*15)*Math.cos(t),z=(222+rand()*12)*Math.sin(t);
    if(Math.abs(x)<22&&z>170)continue;if(x>184&&x<225&&z>0&&z<90)continue;treePositions.push([x,z,5.5+rand()*4]);
  }
  const treeLeaves=new T.InstancedMesh(new T.SphereGeometry(1,preview?6:9,preview?4:6),M.leaf,treePositions.length*5);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.18,.31,1,6),M.trunk,treePositions.length);const ob=new T.Object3D(),col=new T.Color();
  treePositions.forEach(([x,z,h],i)=>{ob.position.set(x,G+h*.3,z);ob.scale.set(1,h*.6,1);ob.rotation.set(0,0,0);ob.updateMatrix();trunks.setMatrixAt(i,ob.matrix);for(let j=0;j<5;j++){ob.position.set(x+(rand()-.5)*3,G+h*.65+rand()*1.8,z+(rand()-.5)*3);ob.scale.set(h*.27,h*.27,h*.25);ob.rotation.set(rand(),rand(),rand());ob.updateMatrix();treeLeaves.setMatrixAt(i*5+j,ob.matrix);col.setHSL(.13+rand()*.12,.22+rand()*.22,.3+rand()*.13);treeLeaves.setColorAt(i*5+j,col);}});
  trunks.castShadow=treeLeaves.castShadow=true;treeLeaves.receiveShadow=true;parts.landscape.add(trunks,treeLeaves);
  for(let i=0;i<32;i++){const t=i/32*TAU,x=203*Math.cos(t),z=220*Math.sin(t);beam([x,G,z],[x,G+6.2,z],.18,M.dark,parts.details);box(M.dark,parts.details,x,G+6.3,z,1.8,.12,.85,t);box(M.light,parts.details,x,G+6.2,z,1.5,.035,.6,t);if(i%2===0){const bx=x+3*Math.cos(t),bz=z+3*Math.sin(t);for(let j=0;j<4;j++)box(M.wood,parts.details,bx,G+.6+j*.08,bz,3,.07,.75,t);for(const k of[-1,1])box(M.dark,parts.details,bx+k*Math.cos(t),G+.3,bz-k*Math.sin(t),.09,.6,.7,t);}}
  for(let i=0;i<32;i++){const t=i/32*TAU,p=roof(t,.85);box(M.dark,parts.roof,p[0],p[1]-.7,p[2],2,.2,1,t);box(M.light,parts.roof,p[0],p[1]-.85,p[2],1.8,.08,.8,t);}
  // A few quiet figures are scale cues, not an overcrowded stadium simulation.
  if(!preview)for(let i=0;i<22;i++){const t=rand()*TAU,x=(177+rand()*28)*Math.cos(t),z=(195+rand()*22)*Math.sin(t);box(i%3?M.blue:M.red,parts.details,x,G+1.05,z,.43,.7,.25,t);box(M.skin,parts.details,x,G+1.59,z,.24,.27,.23,t);for(const s of[-1,1])box(M.dark,parts.details,x+s*.12,G+.38,z,.13,.72,.15,t);}
  function sign(text,x,y,z,w,h,angle=0){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#2a3835';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#e4d2ae';ctx.font='42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;textures.push(tx);const mm=mat('#ffffff',.75,0,{map:tx,emissive:'#a89c81',emissiveMap:tx,emissiveIntensity:.18});const m=mesh(new T.PlaneGeometry(w,h),mm,parts.details,x,y,z);m.rotation.y=angle;m.castShadow=false;}
  if(!preview){sign('国 家 体 育 场  ·  NATIONAL STADIUM',0,G+11,153,42,5);sign('ARENA   /   通往赛场',0,G+4.6,140.4,9,1.05);sign('地下研究空间  /  SERVICE LEVEL',205,11.4,-19.6,17,2);}
  // Consolidate static meshes to keep draw calls bounded.
  for(const b of buckets.values()){if(!b.p.length)continue;const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(b.p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(b.u,2));geometry.computeBoundingSphere();const m=mesh(geometry,b.material,b.part);m.castShadow=!['site'].includes(b.part.name)&&b.material!==M.membrane&&b.material!==M.light;m.receiveShadow=true;}
  boxGeometry.dispose();buckets.clear();group.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(group);
  let night=0,wet=.65,section='all',disposed=false,arenaOn=true;
  const interactions=[{id:'lights',label:'点亮赛场',position:[0,G+1.6,141],distance:10},{id:'door',label:'合上地下门',position:[205,8.8,33],distance:8},{id:'echo',label:'听一会儿看台的回声',position:[12,G+1.6,40],distance:24}];
  function floorAt(x,z,eyeY){
    if(x>198.5&&x<211.5&&z>=31&&z<=82)return clamp(G-(80-z)/4,6,G);
    if(x>=186&&x<=224&&z>=-20&&z<32&&eyeY<G-1)return 6;
    if(Math.abs(x)<5.1&&z>95&&z<145&&eyeY<G+8)return G;
    const theta=Math.atan2(z,x),r=Math.hypot(x,z);const rad=(a,b)=>1/Math.sqrt((Math.cos(theta)/a)**2+(Math.sin(theta)/b)**2);
    const candidates=[G];
    for(const tier of tiers){const a=rad(tier.a,tier.b),b=rad(tier.a2,tier.b2);if(r>=a&&r<=b){const u=clamp((r-a)/(b-a),0,1);candidates.push(G+tier.y+Math.floor(u*tier.rows)*tier.h/tier.rows);}}
    if(r>rad(129,150)&&r<rad(137,158)){for(const y of[9,21,34,45])candidates.push(G+y);}
    const foot=eyeY-1.7;const below=candidates.filter(h=>h<=foot+.85);return below.length?Math.max(...below):G;
  }
  function resolveMovement(position,delta){
    if(!position.every(Number.isFinite)||!delta.every(Number.isFinite))return[0,G+1.7,208];
    let x=clamp(position[0]+delta[0],-302,302),z=clamp(position[2]+delta[2],-278,278),y=position[1];
    const oldFloor=floorAt(position[0],position[2],y),f=floorAt(x,z,y);
    if(f>oldFloor+.85){x=position[0];z=position[2];}
    if(y<G-1){if(z<31){x=clamp(x,186.4,223.6);z=Math.max(z,-19.4);}if(z>=31&&z<82){x=clamp(x,199.2,210.8);}if(!doorOpen&&z>30.8&&z<33.4){z=position[2];}}
    // Ground-level access is through the real portals, not through opaque red walls.
    if(y<G+9){const a=Math.sqrt((position[0]/132)**2+(position[2]/150)**2),b=Math.sqrt((x/132)**2+(z/150)**2),angle=Math.atan2(z,x);if((a-1)*(b-1)<0&&Math.abs(Math.sin(angle*12))>=.17){x=position[0];z=position[2];}}
    return[x,floorAt(x,z,y)+1.7,z];
  }
  function setWeather(value){wet=value==='rain'?1:value==='afterrain'?.65:value==='snow'?.1:.15;M.paving.roughness=.78-wet*.46;M.asphalt.roughness=.78-wet*.48;M.paving.metalness=.025+wet*.12;}
  function setNight(value){night=clamp(value,0,1);M.light.emissiveIntensity=arenaOn?1.6+night*2.5:.08;M.redGlow.emissiveIntensity=.14+night*.7;roomLight.intensity=110;}
  function setSection(value){section=value;parts.roof.visible=value==='all';parts.steel.visible=value!=='basement';parts.site.visible=value!=='basement';parts.landscape.visible=value!=='basement';parts.bowl.visible=value!=='basement';parts.interior.visible=value!=='basement';parts.details.visible=value!=='basement';if(value==='open'){parts.steel.visible=true;}}
  function activateInteraction(id){if(id==='door'){doorOpen=!doorOpen;interactions[1].label=doorOpen?'合上地下门':'推开地下门';return true;}if(id==='lights'){arenaOn=!arenaOn;M.light.emissiveIntensity=arenaOn?3.5:.08;interactions[0].label=arenaOn?'熄灭赛场灯':'点亮赛场';return true;}return id==='echo';}
  function update(dt,time){if(disposed)return;const target=doorOpen?-Math.PI*.5:0;doorAngle+=(target-doorAngle)*(1-Math.exp(-dt*5));door.rotation.y=doorAngle;}
  function dispose(){if(disposed)return;disposed=true;const gg=new Set(),mm=new Set(materials),tt=new Set(textures);group.traverse(o=>{if(o.geometry)gg.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mm.add(m));});gg.forEach(g=>g.dispose());mm.forEach(m=>m.dispose());tt.forEach(t=>t.dispose());group.clear();}
  return{group,parts,bounds,materials:M,textures,update,dispose,setWeather,setNight,setSection,resolveMovement,floorAt,activateInteraction,getInteractions:()=>interactions,
    getNavigation:()=>({entry:[10,G+1.7,208],lookAt:[0,G+20,120],eyeHeight:1.7,speed:5.4,bounds:{min:[-304,0,-280],max:[304,120,280]},spots:VIEWS.filter(v=>v.mode==='walk').map(v=>({id:v.id,label:v.label,position:v.position,target:v.target}))}),
    activateSpot:id=>{if(id==='basement')doorOpen=true;return VIEWS.some(v=>v.id===id);},setGrowth:value=>{const k=clamp(value,0,1);group.scale.y=.015+.985*k;},getState:()=>({night,wet,section,doorOpen,seats:seats.length})};
}
