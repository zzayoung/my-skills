import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createBirdsnestWorld, GRADE, VIEWS } from './world.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=T.MathUtils.clamp, body=document.body, canvas=$('#world');
const touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
if(touch)body.classList.add('touch');
let toastTimer, currentPanel='', focusBeforePanel=null;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3300);}
function fatal(e){$('#loading').classList.add('done');$('#fatal-message').textContent='当前浏览器未能完整开启这份 3D 场景。\n'+(e?.message||String(e))+'\n可检查浏览器图形加速后重新打开。';$('#fatal').style.display='grid';}
window.addEventListener('error',e=>{if(!window.__birdsnest?.ready)fatal(e.error||e.message);});

try {
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.25:1));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
const scene=new T.Scene();scene.background=new T.Color('#729295');scene.fog=new T.FogExp2('#789397',.00074);
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.12,4200);
const pmrem=new T.PMREMGenerator(renderer),envScene=new RoomEnvironment();
const env=pmrem.fromScene(envScene,.05);scene.environment=env.texture;scene.environmentIntensity=.7;
envScene.dispose();pmrem.dispose();
const hemi=new T.HemisphereLight('#dbe9dc','#53696a',2.1);scene.add(hemi);
const sun=new T.DirectionalLight('#ffdab0',3.4);sun.position.set(-180,270,180);sun.target.position.set(0,20,0);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-355,right:355,top:335,bottom:-335,near:10,far:850});sun.shadow.bias=-.00015;sun.shadow.normalBias=.35;sun.shadow.radius=3;scene.add(sun,sun.target);
const rim=new T.DirectionalLight('#a1cfdd',.65);rim.position.set(180,80,-190);scene.add(rim);
const floorMat=new T.MeshStandardMaterial({color:'#637f80',roughness:.98});
const backdrop=new T.Mesh(new T.PlaneGeometry(5000,5000),floorMat);backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.17;backdrop.receiveShadow=true;scene.add(backdrop);
const world=createBirdsnestWorld(T);world.materials.redGlow.side=T.DoubleSide;scene.add(world.group);
const seatDetailMeshes=world.parts.bowl.children.filter(o=>o.userData.seatDetail);
const arenaFill=new T.PointLight('#ffe6b4',0,240,2);arenaFill.position.set(0,72,0);scene.add(arenaFill);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=true;controls.minDistance=155;controls.maxDistance=1050;controls.minPolarAngle=.17;controls.maxPolarAngle=1.43;controls.zoomSpeed=.8;controls.rotateSpeed=.68;controls.panSpeed=.7;
camera.position.fromArray(VIEWS[0].position);controls.target.fromArray(VIEWS[0].target);
if(innerWidth<700)camera.position.sub(controls.target).multiplyScalar(1.42).add(controls.target);
controls.update();
let mode='orbit',weather='afterrain',night=false,nightMix=0,section='all',quality='balanced',yaw=0,pitch=0,flightSpeed=22,transition=null,visited=new Set(),focusedInteraction=null;
let lastStats={triangles:0,calls:0},elapsed=0,frame=0,disposed=false,lastMove=0,firstFrame=true;
let orbitSaved={position:camera.position.clone(),target:controls.target.clone()};
const keys=new Set(),lookEuler=new T.Euler(0,0,0,'YXZ'),front=new T.Vector3(),right=new T.Vector3(),delta=new T.Vector3(),previousPosition=new T.Vector3();
let joy={x:0,y:0},heightInput=0,lookPointer=null,lookPrevious={x:0,y:0},dragDistance=0;
let lastInteractionUpdate=0;

// Small, real planar reflections on the wet plaza. Their alpha is spatially masked.
const reflectionShader={
 uniforms:{color:{value:new T.Color('#81999a')},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},wetness:{value:.65},clock:{value:0}},
 vertexShader:`uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld; void main(){vUv=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 color;uniform float wetness;uniform float clock;varying vec4 vUv;varying vec3 vWorld;
 float noise(vec2 p){return sin(p.x*.11+sin(p.y*.08)*2.)*.5+sin(p.y*.15-p.x*.043)*.27+sin(p.x*.34+p.y*.27)*.13;}
 void main(){vec2 p=vWorld.xz;float ellipse=length(p/vec2(160.,179.));float outside=smoothstep(1.,1.15,ellipse);float edge=1.-smoothstep(250.,285.,max(abs(p.x),abs(p.y)));float puddleMask=smoothstep(.2,.75,noise(p));vec4 uv=vUv;uv.xy+=vec2(sin(p.y*.7+clock),cos(p.x*.6+clock*.8))*.0005*uv.w;vec4 r=texture2DProj(tDiffuse,uv);gl_FragColor=vec4(mix(color,r.rgb,.86),outside*edge*puddleMask*wetness*.35);}`
};
const puddles=new Reflector(new T.PlaneGeometry(600,550),{textureWidth:touch?128:256,textureHeight:touch?128:256,clipBias:.003,shader:reflectionShader});
puddles.rotation.x=-Math.PI/2;puddles.position.y=GRADE+.11;puddles.material.transparent=true;puddles.material.depthWrite=false;puddles.renderOrder=2;scene.add(puddles);
const reflectOriginal=puddles.onBeforeRender;let renderingReflection=false;
puddles.onBeforeRender=function(...args){renderingReflection=true;try{reflectOriginal.apply(this,args);}finally{renderingReflection=false;}};

// Atmospheric particles; precipitation is absent below a roof or below grade.
let particleSeed=99;const rand=()=>{particleSeed=(Math.imul(particleSeed,1664525)+1013904223)>>>0;return particleSeed/4294967296;};
const count=touch?700:1400,rainPositions=new Float32Array(count*6),snowPositions=new Float32Array(count*3),particles=[];
for(let i=0;i<count;i++)particles.push({x:(rand()-.5)*620,z:(rand()-.5)*560,y:GRADE+rand()*120,speed:35+rand()*25});
const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPositions,3));
const rainMat=new T.LineBasicMaterial({color:'#b7d7d8',transparent:true,opacity:0,depthWrite:false});const rain=new T.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;scene.add(rain);
const snowGeo=new T.BufferGeometry();snowGeo.setAttribute('position',new T.BufferAttribute(snowPositions,3));
const snowMat=new T.PointsMaterial({color:'#e9f1e7',transparent:true,opacity:0,size:.33,depthWrite:false});const snow=new T.Points(snowGeo,snowMat);snow.frustumCulled=false;scene.add(snow);
function atmosphere(dt,time){
 const isRain=weather==='rain',isSnow=weather==='snow';rain.visible=isRain;snow.visible=isSnow;
 rainMat.opacity+=(Number(isRain)*.3-rainMat.opacity)*(1-Math.exp(-dt*4));snowMat.opacity+=(Number(isSnow)*.8-snowMat.opacity)*(1-Math.exp(-dt*4));
 if(!isRain&&!isSnow)return;
 for(let i=0;i<count;i++){
  const p=particles[i];p.y-=dt*(isRain?p.speed:2.2);p.x+=dt*(isRain?3:Math.sin(time*.5+i)*.6);if(p.y<GRADE||p.x>310){p.y=GRADE+90+rand()*30;p.x=(rand()-.5)*620;}
  const e=Math.sqrt((p.x/150)**2+(p.z/168)**2),inner=Math.sqrt((p.x/62)**2+(p.z/91)**2);
  const belowRoof=e<1&&inner>1&&p.y<GRADE+68;
  const base=i*6;if(isRain){const y=belowRoof?-200:p.y;rainPositions.set([p.x,y,p.z,p.x+.25,y+1.8,p.z+.1],base);}else{snowPositions.set([p.x,belowRoof?-200:p.y,p.z],i*3);}
 }
 if(isRain)rainGeo.attributes.position.needsUpdate=true;if(isSnow)snowGeo.attributes.position.needsUpdate=true;
}
const daySky=new T.Color('#729295'),nightSky=new T.Color('#253d50'),weatherSky={afterrain:'#729295',clear:'#8ba8ac',rain:'#58787e',mist:'#93a6a3',snow:'#a1b2b1'};
const tempColor=new T.Color();
function updateLighting(dt){
 nightMix+=(Number(night)-nightMix)*(1-Math.exp(-dt*2.2));
 tempColor.set(weatherSky[weather]).lerp(nightSky,nightMix);scene.background.lerp(tempColor,1-Math.exp(-dt*2));scene.fog.color.copy(scene.background);
 const density=weather==='mist'?.0034:weather==='rain'?.0018:weather==='snow'?.002:.00074;scene.fog.density+=(density-scene.fog.density)*(1-Math.exp(-dt*2));
 hemi.intensity=2.1-nightMix*1.3;sun.intensity=(weather==='clear'?4:weather==='rain'||weather==='snow'?1.3:3.4)*(1-nightMix)+.18*nightMix;
 sun.color.set(nightMix>.5?'#9db8e0':'#ffdab0');rim.intensity=.65+nightMix*.15;arenaFill.intensity=nightMix*160;
 world.setNight(nightMix);floorMat.color.set('#637f80').lerp(new T.Color('#23394b'),nightMix);
 puddles.material.uniforms.clock.value=elapsed;puddles.material.uniforms.wetness.value=weather==='rain'?1:weather==='afterrain'?.65:weather==='snow'?.15:.03;
 puddles.visible=quality!=='low'&&section!=='basement'&&(weather==='rain'||weather==='afterrain')&&camera.position.y>GRADE+.15;
}

// Synthesized soundscape. Nothing is fetched; audio starts only on explicit gesture.
let audio=null,audioOn=false,stepDistance=0;
function noiseBuffer(ctx,seconds=3){const b=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate),data=b.getChannelData(0);let v=0;for(let i=0;i<data.length;i++){v=(v+(Math.random()*2-1)*.02)/1.02;data[i]=v*4;}return b;}
function initAudio(){
 const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw new Error('此浏览器未提供环境声音接口');
 const ctx=new Ctx(),master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
 const buffer=noiseBuffer(ctx),wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;
 const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=850;
 const gain=ctx.createGain();gain.gain.value=.1;wind.connect(filter);filter.connect(gain);gain.connect(master);wind.start();
 const rainSource=ctx.createBufferSource();rainSource.buffer=noiseBuffer(ctx,2.7);rainSource.loop=true;const rainFilter=ctx.createBiquadFilter();rainFilter.type='highpass';rainFilter.frequency.value=1250;const rainGain=ctx.createGain();rainGain.gain.value=0;rainSource.connect(rainFilter);rainFilter.connect(rainGain);rainGain.connect(master);rainSource.start();
 const impulse=ctx.createBuffer(2,ctx.sampleRate*1.6,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.4);}
 const reverb=ctx.createConvolver();reverb.buffer=impulse;const reverbGain=ctx.createGain();reverbGain.gain.value=.22;reverb.connect(reverbGain);reverbGain.connect(master);
 return{ctx,master,gain,filter,rainGain,reverb,wind,rainSource};
}
async function toggleAudio(){try{if(!audio)audio=initAudio();await audio.ctx.resume();audioOn=!audioOn;audio.master.gain.setTargetAtTime(audioOn?.55:0,audio.ctx.currentTime,.25);$('#soundtext').textContent=audioOn?'声音 开':'声音 关';$('#sound').setAttribute('aria-label',audioOn?'关闭环境声音':'开启环境声音');$('#soundwave').setAttribute('d',audioOn?'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14':'m16 9 5 6m0-6-5 6');toast(audioOn?'风声、脚步与空间的回声已开启':'环境声音已关闭');}catch(e){toast(e.message);}}
function pulse(gain=.12,freq=120,echo=false){if(!audioOn||!audio)return;const c=audio.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g);g.connect(audio.master);if(echo)g.connect(audio.reverb);o.start();o.stop(t+.25);}
function updateAudio(distance){if(!audio)return;const t=audio.ctx.currentTime,inside=mode!=='orbit'&&Math.sqrt((camera.position.x/135)**2+(camera.position.z/150)**2)<1;audio.gain.gain.setTargetAtTime(inside?.025:.1,t,.8);audio.rainGain.gain.setTargetAtTime(weather==='rain'?(inside?.035:.16):0,t,.5);audio.filter.frequency.setTargetAtTime(camera.position.y<GRADE?250:700,t,.8);if(mode==='walk'&&!transition&&distance>0){stepDistance+=distance;if(stepDistance>.92){stepDistance=0;pulse(inside?.06:.045,inside?105:145,inside);}}}

function syncLook(){lookEuler.setFromQuaternion(camera.quaternion,'YXZ');yaw=lookEuler.y;pitch=lookEuler.x;}
function applyLook(){lookEuler.set(clamp(pitch,-1.4,1.4),yaw,0,'YXZ');camera.quaternion.setFromEuler(lookEuler);}
function setMode(next){mode=next;controls.enabled=next==='orbit'&&!transition;body.classList.toggle('walking',next!=='orbit');body.classList.toggle('flying',next==='ghost');$('#enter').innerHTML=next==='orbit'?'走进鸟巢 <span>↗</span>':'返回模型 <span>↖</span>';$('#fly').classList.toggle('active',next==='ghost');$('#flytext').textContent=next==='ghost'?'回到步行':'自由飞行';$('#hint').textContent=next==='orbit'?'拖动旋转 · 滚轮靠近 · 点亮声音，慢慢看':touch?'左侧移动 · 右侧环顾 · 随时返回模型':next==='ghost'?'WASD 飞行 · E / Q 升降 · Shift 加速 · G 步行 · V 返回':'WASD 走动 · 拖动环顾 · F 互动 · G 飞行 · V 返回';keys.clear();joy={x:0,y:0};heightInput=0;syncLook();}
function transitionTo(view){
 closePanel(false);keys.clear();joy={x:0,y:0};body.classList.add('touched');
 if(mode==='orbit'&&view.mode!=='orbit')orbitSaved={position:camera.position.clone(),target:controls.target.clone()};
 world.activateSpot(view.id);if(section!=='all'&&view.mode!=='orbit'){section='all';world.setSection('all');$('#sectiontext').textContent='揭开屋盖';}
 const endPos=new T.Vector3(...view.position),endTarget=new T.Vector3(...view.target),dummy=new T.PerspectiveCamera();dummy.position.copy(endPos);dummy.lookAt(endTarget);
 const distance=camera.position.distanceTo(endPos),duration=reduced?.05:Math.min(2.35,1.1+distance/500);
 transition={startPos:camera.position.clone(),endPos,startQuat:camera.quaternion.clone(),endQuat:dummy.quaternion.clone(),target:endTarget,nextMode:view.mode,t:0,startTime:performance.now(),duration,arc:view.mode==='orbit'?0:Math.min(distance*.09,35)};
 setMode(view.mode);controls.enabled=false;$('#place').textContent=view.label;$('#mood').textContent=view.detail;visited.add(view.id);if(view.id==='basement')toast('地下空间为研究性重建，并非实测施工图。');canvas.focus({preventScroll:true});
}
function returnOrbit(){transitionTo({...VIEWS[0],position:orbitSaved.position.toArray(),target:orbitSaved.target.toArray()});}
function cancelTransition(){if(!transition)return;transition=null;syncLook();if(mode==='orbit'){controls.target.set(0,43,0);controls.enabled=true;controls.update();}}
function toggleGhost(){if(mode==='orbit'){transitionTo(VIEWS.find(v=>v.id==='steel'));return;}cancelTransition();if(mode==='ghost'){const p=world.resolveMovement(camera.position.toArray(),[0,0,0]);camera.position.fromArray(p);setMode('walk');toast('已回到可行走地面');}else{setMode('ghost');toast('自由飞行 · 可穿过建筑观察内部');}}
function flyTo(id){const v=VIEWS.find(v=>v.id===id);if(v)transitionTo(v);}
function openPanel(kind){keys.clear();joy={x:0,y:0};currentPanel=kind;focusBeforePanel=document.activeElement;const title=$('#panel-title'),content=$('#panel-body');
 if(kind==='views'){title.textContent='换一个地方停留';content.innerHTML='<p class="sub">可以直接到达，也可以沿着真实的开口慢慢走近。</p><div class="viewgrid">'+VIEWS.map((v,i)=>`<button data-view="${v.id}"><strong>${String(i+1).padStart(2,'0')} · ${v.label}</strong><small>${v.detail}</small></button>`).join('')+'</div><div class="note">广场、场地、看台与通道使用同一套场景。地下布局为研究性重建。</div>';content.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>flyTo(b.dataset.view));}
 if(kind==='climate'){title.textContent='让时间慢一点';content.innerHTML='<p class="sub">天气改变空气、地面的湿润与声音。你的所在位置不会改变。</p><h3>此刻的天气</h3><div class="choices">'+[['afterrain','雨后'],['clear','晴日'],['rain','细雨'],['mist','薄雾'],['snow','落雪']].map(([id,l])=>`<button data-weather="${id}" class="${weather===id?'active':''}">${l}</button>`).join('')+'</div><h3>光落下的时分</h3><div class="choices"><button data-time="day" class="'+(!night?'active':'')+'">黄昏</button><button data-time="night" class="'+(night?'active':'')+'">夜色</button></div><h3>声景</h3><div class="choices"><button id="panel-sound">'+(audioOn?'关闭环境声音':'开启环境声音')+'</button></div><div class="note">这里呈现的是交互式环境模拟，不是北京的实时天气或专业气象模型。环境声为程序合成。</div>';content.querySelectorAll('[data-weather]').forEach(b=>b.onclick=()=>{weather=b.dataset.weather;world.setWeather(weather);content.querySelectorAll('[data-weather]').forEach(x=>x.classList.toggle('active',x===b));renderer.shadowMap.needsUpdate=true;});content.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{setNight(b.dataset.time==='night');content.querySelectorAll('[data-time]').forEach(x=>x.classList.toggle('active',x===b));});$('#panel-sound').onclick=toggleAudio;}
 if(kind==='help'){title.textContent='在建筑里，慢一点。';content.innerHTML='<p class="sub">先在掌心看一座建筑，再走进它。无需锁定鼠标，也没有必须完成的任务。</p><div class="controls"><b>模型视角</b><span>拖动旋转，滚轮或双指缩放；右键平移。</span><b>走入以后</b><span>WASD 行走，拖动环顾。Shift 走快一点。</span><b>自由飞行</b><span>G 切换，E / Q 或空格 / Ctrl 升降。</span><b>F / 点击提示</b><span>靠近后操作灯光和门，听场地回声。</span><b>V / H</b><span>返回模型 / 隐藏或恢复界面。</span><b>手机和平板</b><span>左侧摇杆移动，右侧拖动看；飞行时右侧出现升降按钮。</span></div><h3>画面细节</h3><div class="choices">'+[['high','精细'],['balanced','均衡'],['low','流畅']].map(([id,l])=>`<button data-quality="${id}" class="${quality===id?'active':''}">${l}</button>`).join('')+'</div><div class="note">鸟巢 V2 · 雨后体验重做。主体使用米制坐标；钢构拓扑、地下房间和周边景观属于研究性重建，不是测绘或施工级数字孪生。<br>离线运行，无网络资源请求。</div>';content.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>{setQuality(b.dataset.quality);content.querySelectorAll('[data-quality]').forEach(x=>x.classList.toggle('active',x===b));});}
 $('#panel').classList.add('open');$('#close-panel').focus();
}
function closePanel(restore=true){$('#panel').classList.remove('open');currentPanel='';keys.clear();if(restore&&focusBeforePanel?.isConnected)focusBeforePanel.focus({preventScroll:true});}
function setNight(value){night=value;$('#nighttext').textContent=night?'夜色':'黄昏';renderer.shadowMap.needsUpdate=true;}
function setQuality(value){quality=value;renderer.setPixelRatio(Math.min(devicePixelRatio,value==='high'?2:value==='low'?1:touch?1.35:1.5));renderer.shadowMap.enabled=value!=='low';renderer.shadowMap.needsUpdate=true;toast(value==='low'?'已减轻阴影与反射计算，保留建筑几何':'画面细节已调整');}
$('#enter').onclick=()=>mode==='orbit'?flyTo('plaza'):returnOrbit();$('#fly').onclick=toggleGhost;$('#views').onclick=()=>openPanel('views');$('#climate').onclick=()=>openPanel('climate');$('#help').onclick=()=>openPanel('help');$('#close-panel').onclick=()=>closePanel();$('#panel').addEventListener('pointerdown',e=>{if(e.target===$('#panel'))closePanel();});
$('#night').onclick=()=>setNight(!night);$('#sound').onclick=toggleAudio;
$('#section').onclick=()=>{section=section==='all'?'open':'all';world.setSection(section);$('#sectiontext').textContent=section==='open'?'合上屋盖':'揭开屋盖';$('#section').classList.toggle('active',section==='open');renderer.shadowMap.needsUpdate=true;};
$('#quiet').onclick=()=>body.classList.toggle('quiet');
$('#photo').onclick=()=>{renderer.render(scene,camera);canvas.toBlob(blob=>{if(!blob){toast('当前浏览器未能保存画面');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='鸟巢-此刻.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('这一刻已留在画面里。');},'image/png');};
function interact(){if(!focusedInteraction)return;world.activateInteraction(focusedInteraction.id);if(focusedInteraction.id==='echo'){pulse(.1,340,true);setTimeout(()=>pulse(.035,215,true),260);toast(audioOn?'听声音在看台之间慢慢消散。':'开启右上角声音，再听听这里的回响。');}renderer.shadowMap.needsUpdate=true;}
$('#interact').onclick=interact;

// Only canvas interactions manipulate the camera; UI clicks never become look drags.
controls.addEventListener('start',()=>{body.classList.add('touched');if(mode==='orbit'){transition=null;controls.enabled=true;}});
canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});body.classList.add('touched');if(mode==='orbit')return;if(currentPanel)return;cancelTransition();lookPointer=e.pointerId;lookPrevious={x:e.clientX,y:e.clientY};dragDistance=0;canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
canvas.addEventListener('pointermove',e=>{if(mode==='orbit'||lookPointer!==e.pointerId||currentPanel)return;const dx=e.clientX-lookPrevious.x,dy=e.clientY-lookPrevious.y;lookPrevious={x:e.clientX,y:e.clientY};dragDistance+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.0032;pitch=clamp(pitch-dy*.0028,-1.4,1.4);applyLook();});
function endLook(e){if(lookPointer!==e.pointerId)return;lookPointer=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);canvas.addEventListener('lostpointercapture',()=>{lookPointer=null;canvas.classList.remove('dragging');});canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;const key=e.key.toLowerCase();if(key==='escape'){if(currentPanel)closePanel();else if(transition)cancelTransition();return;}if(currentPanel){if(key==='tab'){const buttons=[...$('#panel').querySelectorAll('button,input')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}return;}if(['w','a','s','d','q','e',' ','control','arrowleft','arrowright','arrowup','arrowdown'].includes(key)){e.preventDefault();keys.add(key);if(mode!=='orbit')cancelTransition();}if(e.repeat)return;if(key==='g')toggleGhost();if(key==='v')returnOrbit();if(key==='h')body.classList.toggle('quiet');if(key==='f')interact();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function resetInput(){keys.clear();joy={x:0,y:0};heightInput=0;lookPointer=null;$('#stick').style.transform='';}
window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{resetInput();if(audio&&document.hidden)audio.master.gain.setTargetAtTime(0,audio.ctx.currentTime,.1);else if(audio&&audioOn)audio.master.gain.setTargetAtTime(.55,audio.ctx.currentTime,.2);});
let joyPointer=null;
$('#joystick').addEventListener('pointerdown',e=>{e.preventDefault();joyPointer=e.pointerId;$('#joystick').setPointerCapture(e.pointerId);cancelTransition();moveJoy(e);});
function moveJoy(e){if(e.pointerId!==joyPointer)return;const b=$('#joystick').getBoundingClientRect(),dx=(e.clientX-b.left-b.width/2)/36,dy=(e.clientY-b.top-b.height/2)/36,len=Math.max(1,Math.hypot(dx,dy));joy={x:dx/len,y:dy/len};$('#stick').style.transform=`translate(${joy.x*32}px,${joy.y*32}px)`;}
$('#joystick').addEventListener('pointermove',moveJoy);for(const type of['pointerup','pointercancel','lostpointercapture'])$('#joystick').addEventListener(type,()=>{joyPointer=null;joy={x:0,y:0};$('#stick').style.transform='';});
$$('[data-height]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();heightInput=Number(b.dataset.height);b.setPointerCapture(e.pointerId);});for(const type of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>heightInput=0);});

const projected=new T.Vector3(),hotspots=[];
for(const [id,pos,label] of [['plaza',[0,GRADE+8,163],'走进鸟巢'],['steel',[115,82,65],'钢与天空'],['basement',[205,GRADE+1,80],'地面之下']]){const b=document.createElement('button');b.className='hotspot';b.setAttribute('aria-label',label);b.innerHTML='<span class="dot">+</span><span class="tag">'+label+'</span>';b.onclick=()=>flyTo(id);$('#hotspots').appendChild(b);hotspots.push({el:b,pos:new T.Vector3(...pos)});}
function updateHotspots(){if(mode!=='orbit')return;for(const h of hotspots){projected.copy(h.pos).project(camera);const visible=projected.z<1&&Math.abs(projected.x)<.96&&Math.abs(projected.y)<.85;h.el.style.display=visible?'flex':'none';if(visible){h.el.style.left=(projected.x*.5+.5)*innerWidth+'px';h.el.style.top=(-projected.y*.5+.5)*innerHeight+'px';}}}
function updateInteractions(){focusedInteraction=null;if(mode==='orbit'||transition||currentPanel){$('#interact').classList.remove('on');return;}let closest=Infinity;for(const it of world.getInteractions()){const d=camera.position.distanceTo(new T.Vector3(...it.position));if(d<it.distance&&d<closest){focusedInteraction=it;closest=d;}}$('#interact').classList.toggle('on',!!focusedInteraction);if(focusedInteraction)$('#interact-label').textContent=focusedInteraction.label;}
function updateMovement(dt){
 if(mode==='orbit'||transition||currentPanel)return 0;
 if(keys.has('arrowleft'))yaw+=dt*1.35;if(keys.has('arrowright'))yaw-=dt*1.35;if(keys.has('arrowup'))pitch=clamp(pitch+dt,-1.4,1.4);if(keys.has('arrowdown'))pitch=clamp(pitch-dt,-1.4,1.4);applyLook();
 const forwardInput=(keys.has('w')?1:0)-(keys.has('s')?1:0)-joy.y,sideInput=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joy.x,vertical=(keys.has('e')||keys.has(' ')?1:0)-(keys.has('q')||keys.has('control')?1:0)+heightInput;
 const speed=(mode==='ghost'?flightSpeed:5.4)*(keys.has('shift')?mode==='ghost'?3:2:1);
 front.set(-Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));delta.copy(front).multiplyScalar(forwardInput).addScaledVector(right,sideInput);if(delta.lengthSq()>1)delta.normalize();delta.multiplyScalar(speed*dt);if(mode==='ghost')delta.y=vertical*speed*dt;
 previousPosition.copy(camera.position);
 if(delta.lengthSq()>0){if(mode==='walk')camera.position.fromArray(world.resolveMovement(camera.position.toArray(),delta.toArray()));else{camera.position.add(delta);camera.position.x=clamp(camera.position.x,-480,480);camera.position.z=clamp(camera.position.z,-450,450);camera.position.y=clamp(camera.position.y,1.8,350);}}
 return camera.position.distanceTo(previousPosition);
}
function updateTransition(dt){if(!transition)return;const tr=transition;tr.t=(performance.now()-tr.startTime)/1000;const u=clamp(tr.t/tr.duration,0,1),e=u*u*(3-2*u);camera.position.lerpVectors(tr.startPos,tr.endPos,e);camera.position.y+=Math.sin(Math.PI*u)*tr.arc;camera.quaternion.slerpQuaternions(tr.startQuat,tr.endQuat,e);if(u===1){camera.position.copy(tr.endPos);camera.quaternion.copy(tr.endQuat);transition=null;syncLook();if(mode==='orbit'){controls.target.copy(tr.target);controls.enabled=true;controls.update();}}}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;fatal(new Error('图形上下文中断；重新打开可恢复场景。'));});
world.setWeather(weather);
const clock=new T.Clock();
function animate(){if(disposed)return;requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.12);elapsed+=dt;frame++;
 updateTransition(dt);if(mode==='orbit'&&!transition)controls.update();const moved=updateMovement(dt);world.update(dt,elapsed);updateLighting(dt);atmosphere(dt,elapsed);updateAudio(moved);
 if(frame%3===0)updateHotspots();if(elapsed-lastInteractionUpdate>.15){updateInteractions();lastInteractionUpdate=elapsed;}
 for(const m of seatDetailMeshes)m.visible=camera.position.distanceTo(m.boundingSphere.center)<215;
 renderer.render(scene,camera);lastStats={triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};
 if(firstFrame){firstFrame=false;$('#loading').classList.add('done');window.__birdsnest.ready=true;}
}
async function exportPreview(){const p=createBirdsnestWorld(T,{preview:true});p.materials.redGlow.side=T.DoubleSide;const sc=new T.Scene();sc.userData.galleryNativeBounds={min:world.bounds.min.toArray(),max:world.bounds.max.toArray()};sc.add(p.group);const exporter=new GLTFExporter();try{const bytes=await exporter.parseAsync(sc,{binary:true,onlyVisible:true,maxTextureSize:512});const a=new Uint8Array(bytes);let out='';for(let i=0;i<a.length;i+=16384)out+=String.fromCharCode(...a.subarray(i,i+16384));return btoa(out);}finally{p.dispose();}}
window.__birdsnest={ready:false,getState:()=>({mode,camera:camera.position.toArray(),orbitDistance:camera.position.distanceTo(controls.target),yaw,pitch,weather,night,section,quality,stats:lastStats,geometry:world.getState(),transition:!!transition}),exportPreview};
requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>{disposed=true;controls.dispose();world.dispose();rainGeo.dispose();rainMat.dispose();snowGeo.dispose();snowMat.dispose();puddles.getRenderTarget().dispose();puddles.geometry.dispose();puddles.material.dispose();env.dispose();backdrop.geometry.dispose();floorMat.dispose();renderer.dispose();if(audio)audio.ctx.close().catch(()=>{});},{once:true});
}catch(e){fatal(e);}
