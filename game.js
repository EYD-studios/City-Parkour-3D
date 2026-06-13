let scene,camera,renderer,clock,player,body;
let state="menu", mode="normal", level=1; localStorage.setItem("cp_level","1");
let coins=Number(localStorage.getItem("cp_coins")||0), gems=Number(localStorage.getItem("cp_gems")||0);
let playerName=localStorage.getItem("cp_player_name")||"Player";
let playerRole=localStorage.getItem("cp_player_role")||"Player";
let theme=localStorage.getItem("cp_theme")||"day", speedSetting=localStorage.getItem("cp_speed")||"normal";
let difficulty=localStorage.getItem("cp_difficulty")||"normal";
let accessory=localStorage.getItem("cp_accessory")||"none";
let globalText=localStorage.getItem("cp_global_text")||"";
let partyMode=localStorage.getItem("cp_party")==="1";
let platforms=[],obstacles=[],coinObjs=[],portals=[],boosters=[],decor=[],movingPlatforms=[],slopes=[],wallRuns=[];
let x=0,z=0,y=24,vy=0,targetX=0,speed=9,baseSpeed=9,finishZ=-300,score=0,time=0,boostTimer=0;
let grounded=false,sliding=false,dragging=false,lastX=0,left=false,right=false,inOffice=false,returnData=null,wallRunning=false,cinematicDrop=false,lastPlatformTop=24,mapNameTimer=0;
let audioCtx=null,stepTimer=0,lastSpecialZ=999;
const $=id=>document.getElementById(id);
const GRAVITY=24,JUMP=12,HEIGHT=1.85;

init(); animate();

function init(){
  scene=new THREE.Scene(); clock=new THREE.Clock();
  camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,1200);
  renderer=new THREE.WebGLRenderer({canvas:$("game"),antialias:true});
  renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true;
  scene.add(new THREE.HemisphereLight(0xffffff,0x776655,1.85));
  const sun=new THREE.DirectionalLight(0xfff2d4,1.8); sun.position.set(-45,95,55); sun.castShadow=true; scene.add(sun);
  player=new THREE.Object3D(); scene.add(player); player.add(camera); camera.position.set(0,HEIGHT,0); makeBody();
  wire(); applyTheme(); show("menu");
}
function wire(){
  $("playBtn").onclick=()=>start("normal"); $("timedBtn").onclick=()=>start("timed");
  $("howBtn").onclick=()=>show("how"); $("settingsBtn").onclick=()=>show("settings");
  $("accessoriesBtn").onclick=()=>{buildAccessories();show("accessories")};
  $("recordBtn").onclick=()=>{buildRecord();show("record")};
  $("nameBtn").onclick=()=>{$("playerNameInput").value=playerName;$("ownerCodeInput").value="";show("nameScreen")};
  $("saveNameBtn").onclick=saveName;
  $("resumeBtn").onclick=()=>{hideAll();state="play";$("hud").classList.remove("hidden");$("pauseBtn").classList.remove("hidden")};
  $("restartBtn").onclick=()=>start(mode); $("mainMenuBtn").onclick=mainMenu;
  $("pauseBtn").onclick=pause; $("completeMenuBtn").onclick=mainMenu;
  $("nextLevelBtn").onclick=()=>{level++;localStorage.setItem("cp_level",level);start(mode)};
  $("addCoinsBtn").onclick=()=>{if(isOwner()){coins+=500;saveMoney();buildRecord()}};
  $("addGemsBtn").onclick=()=>{if(isOwner()){gems+=50;saveMoney();buildRecord()}};
  $("unlockAllBtn").onclick=()=>{if(isOwner()){items().forEach(i=>localStorage.setItem("own_"+i.id,"1"));buildAccessories()}};
  $("resetRecordBtn").onclick=()=>{if(isOwner()){localStorage.removeItem("cp_record");localStorage.removeItem("cp_world_board");buildRecord()}};
  $("forceNightBtn").onclick=()=>{if(isOwner()){theme="night";localStorage.setItem("cp_theme",theme);applyTheme()}};
  $("forceDayBtn").onclick=()=>{if(isOwner()){theme="day";localStorage.setItem("cp_theme",theme);applyTheme()}};
  if($("setGlobalTextBtn"))$("setGlobalTextBtn").onclick=()=>{if(isOwner()){globalText=($("globalTextInput").value||"").slice(0,60);localStorage.setItem("cp_global_text",globalText);showGlobalText()}};
  if($("partyBtn"))$("partyBtn").onclick=()=>{if(isOwner()){partyMode=!partyMode;localStorage.setItem("cp_party",partyMode?"1":"0");applyTheme()}};
  if($("giveEveryoneGemsBtn"))$("giveEveryoneGemsBtn").onclick=()=>{if(isOwner()){gems+=1000;saveMoney();buildRecord()}};
  if($("giveEveryoneCoinsBtn"))$("giveEveryoneCoinsBtn").onclick=()=>{if(isOwner()){coins+=1000;saveMoney();buildRecord()}};
  if($("setLevelOneBtn"))$("setLevelOneBtn").onclick=()=>{if(isOwner()){level=1;localStorage.setItem("cp_level",1);buildRecord()}};
  if($("clearCodesBtn"))$("clearCodesBtn").onclick=()=>{if(isOwner()){Object.keys(localStorage).filter(k=>k.startsWith("code_")).forEach(k=>localStorage.removeItem(k));flash("CODES RESET")}};
  document.querySelectorAll(".back").forEach(b=>b.onclick=()=>show("menu"));
  $("speedSelect").value=speedSetting; $("themeSelect").value=theme;
  if($("difficultySelect"))$("difficultySelect").value=difficulty;
  $("speedSelect").onchange=e=>{speedSetting=e.target.value;localStorage.setItem("cp_speed",speedSetting);setSpeed()};
  $("themeSelect").onchange=e=>{theme=e.target.value;localStorage.setItem("cp_theme",theme);applyTheme()};
  if($("difficultySelect"))$("difficultySelect").onchange=e=>{difficulty=e.target.value;localStorage.setItem("cp_difficulty",difficulty)};
  if($("redeemBtn"))$("redeemBtn").onclick=redeemCode;
  addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  addEventListener("keydown",e=>{if(e.code==="Space"){if(wallRunning)exitWallRun();else jump()} if(e.code==="ShiftLeft"||e.code==="ShiftRight")sliding=true; if(e.code==="ArrowLeft"||e.code==="KeyA")left=true; if(e.code==="ArrowRight"||e.code==="KeyD")right=true; if(e.code==="Escape"||e.code==="KeyP")pause()});
  addEventListener("keyup",e=>{if(e.code==="ShiftLeft"||e.code==="ShiftRight")sliding=false; if(e.code==="ArrowLeft"||e.code==="KeyA")left=false; if(e.code==="ArrowRight"||e.code==="KeyD")right=false});
  addEventListener("pointerdown",e=>{if(state==="play"){dragging=true;lastX=e.clientX;startAudio()}});
  addEventListener("pointermove",e=>{if(state==="play"&&dragging){let dx=e.clientX-lastX;lastX=e.clientX;targetX=THREE.MathUtils.clamp(targetX+dx*.02,-11,11)}});
  addEventListener("pointerup",()=>dragging=false); addEventListener("pointercancel",()=>dragging=false);
}
function isOwner(){return playerRole==="Owner"}
function show(id){hideAll();$(id).classList.remove("hidden");$("nameBtn").classList.toggle("hide",id!=="menu")}
function hideAll(){["menu","how","settings","accessories","record","nameScreen","pause","complete"].forEach(id=>$(id).classList.add("hidden"))}
function mainMenu(){state="menu";$("hud").classList.add("hidden");$("timer").classList.add("hidden");$("pauseBtn").classList.add("hidden");show("menu")}
function pause(){if(state!=="play")return;state="pause";show("pause")}
function saveName(){playerName=($("playerNameInput").value||"Player").trim().slice(0,18)||"Player";let code=($("ownerCodeInput").value||"").trim();playerRole=code==="OWNER2026"?"Owner":code==="COOWNER2026"?"Co-Owner":"Player";localStorage.setItem("cp_player_name",playerName);localStorage.setItem("cp_player_role",playerRole);show("menu")}
function saveMoney(){localStorage.setItem("cp_coins",coins);localStorage.setItem("cp_gems",gems)}
function redeemCode(){let code=($("redeemInput").value||"").trim().toUpperCase();let prizes={CITY100:{coins:100,gems:10},OWNERBOOST:{coins:500,gems:50},PARKOURVIP:{coins:1000,gems:100}};if(!prizes[code]){flash("BAD CODE");return}if(localStorage.getItem("code_"+code)){flash("USED CODE");return}coins+=prizes[code].coins;gems+=prizes[code].gems;localStorage.setItem("code_"+code,"1");saveMoney();flash("PRIZE CLAIMED")}
function difficultyFactor(){return {easy:.8,normal:1,hard:1.25,extreme:1.55}[difficulty]||1}
function setSpeed(){baseSpeed=speedSetting==="easy"?8:speedSetting==="fast"?11:9.4;baseSpeed*=difficultyFactor();speed=baseSpeed}
function mapList(){return ["Downtown Day","Cyber Night","Haunted Heights","Space Station","Galaxy Run","Solar City"]}
function currentMap(){return mapList()[Math.floor((level-1)/5)%mapList().length]}
function mapIndex(){return Math.floor((level-1)/5)%6}
function mapColors(){
  let i=mapIndex();
  const dayMaps=[
    {sky:0x9fc7df,roof:0x4b5459,building:0x6f7b82,glow:0xfff0a8,floor:0x64b6d9},
    {sky:0xaee7ff,roof:0x3e6b63,building:0x5e8981,glow:0xfff0a8,floor:0x52c7a8},
    {sky:0xffd59b,roof:0x715548,building:0x8c7160,glow:0xfff0a8,floor:0xe08d55},
    {sky:0x8bb8ff,roof:0x2f4d73,building:0x324864,glow:0xffffff,floor:0x3b67b0},
    {sky:0xc7b6ff,roof:0x565178,building:0x6d668c,glow:0xffffff,floor:0x8b77d9},
    {sky:0xffc078,roof:0x8c5738,building:0x996b4d,glow:0xfff3a3,floor:0xff9f43}
  ];
  const nightMaps=[
    {sky:0x070b18,roof:0x303a58,building:0x1c2445,glow:0x7ddcff,floor:0x222a55},
    {sky:0x10051f,roof:0x35255f,building:0x20124d,glow:0xb38cff,floor:0x382a68},
    {sky:0x1b0d20,roof:0x3a2b45,building:0x2a1830,glow:0xff75dd,floor:0x3c2b55},
    {sky:0x020817,roof:0x1e2d4d,building:0x111a33,glow:0xffffff,floor:0x1f3a66},
    {sky:0x050024,roof:0x2b2355,building:0x171033,glow:0x8df7ff,floor:0x2f2780},
    {sky:0x160b08,roof:0x4c2c22,building:0x2c1715,glow:0xff8844,floor:0x6b3a25}
  ];
  return theme==="night" ? nightMaps[i] : dayMaps[i];
}
function applyTheme(){
  document.body.classList.toggle("night", theme==="night");
  document.body.classList.toggle("day", theme==="day");
  let c=mapColors();
  if(scene){
    scene.background=new THREE.Color(c.sky);
    scene.fog=new THREE.Fog(c.sky, theme==="night"?70:95, theme==="night"?430:520);
  }
}
function start(m){mode=m;setSpeed();clearWorld();applyTheme();x=0;targetX=0;z=0;y=28;vy=0;score=0;time=0;boostTimer=0;lastSpecialZ=999;grounded=false;sliding=false;inOffice=false;wallRunning=false;cinematicDrop=false;finishZ=-(340+level*30*difficultyFactor());player.position.set(x,y,z);buildWorld();state="play";hideAll();$("hud").classList.remove("hidden");$("pauseBtn").classList.remove("hidden");$("timer").classList.toggle("hidden",mode!=="timed");$("nameBtn").classList.add("hide");showMapName();showGlobalText();updateHUD();startAudio()}
function clearWorld(){[...platforms,...obstacles,...coinObjs,...portals,...boosters,...decor,...movingPlatforms,...slopes,...wallRuns].forEach(o=>scene.remove(o));platforms=[];obstacles=[];coinObjs=[];portals=[];boosters=[];decor=[];movingPlatforms=[];slopes=[];wallRuns=[]}
function mat(c,em=0){return new THREE.MeshStandardMaterial({color:c,emissive:em,roughness:.48,metalness:.08})}
function glass(){return new THREE.MeshPhysicalMaterial({color:0xbdefff,transparent:true,opacity:.54,roughness:.02,transmission:.35})}
function addPlatform(px,py,pz,w,d,color){let p=new THREE.Mesh(new THREE.BoxGeometry(w,3,d),mat(color||mapColors().roof));p.position.set(px,py,pz);p.userData={w,d,top:py+1.5,platform:true};scene.add(p);platforms.push(p);addRoofDetails(px,py,pz,w,d);return p}
function addRoofDetails(px,py,pz,w,d){let edgeMat=mat(mapColors().glow,theme==="night"?0x123b4a:0);for(let sx of [-1,1]){let e=new THREE.Mesh(new THREE.BoxGeometry(.35,.65,d),edgeMat);e.position.set(px+sx*w/2,py+2.1,pz);scene.add(e);decor.push(e)}}
function addWindows(b,bw,bh,bd){let glow=mapColors().glow;for(let r=0;r<Math.floor(bh/11);r++){for(let c=0;c<Math.floor(bw/5.8);c++){if(Math.random()<.25)continue;let w=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.55),new THREE.MeshBasicMaterial({color:glow,transparent:true,opacity:.75}));w.position.set(b.position.x-bw/2+2+c*5,b.position.y-bh/2+7+r*8.5,b.position.z+bd/2+.05);scene.add(w);decor.push(w)}}}
function buildWorld(){
  let c=mapColors(), obsExtra=Math.floor(level/3*difficultyFactor());
  for(let i=0;i<78;i++){
    let side=Math.random()<.5?-1:1,bw=12+Math.random()*24,bh=35+Math.random()*105,bd=12+Math.random()*24;
    let b=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),mat(c.building));
    b.position.set(side*(35+Math.random()*100),-10+bh/2,-Math.random()*560);
    scene.add(b);decor.push(b);addWindows(b,bw,bh,bd);
    if(Math.random()<.32)addBillboard(b,bw,bh,bd);
  }

  const layout=(level-1)%5;
  let cur=0;
  let h=22; // lower starting height so the player can reach platforms
  let prev=null;

  for(let i=0;i<11;i++){
    let d=34+Math.random()*12;
    let g=i?7+Math.random()*7:0;
    let w=20+Math.random()*7;
    let px=0;

    // Different platform formats every level
    if(layout===0){ // gentle straight rooftops
      px=(Math.random()-.5)*4;
      h=Math.max(16, h-(Math.random()*1.6));
    }else if(layout===1){ // left/right lane city
      px=(i%2===0?-3.5:3.5)+(Math.random()-.5)*1.5;
      h=Math.max(16, h-(Math.random()*1.2));
    }else if(layout===2){ // staircase up then glide down
      px=(Math.random()-.5)*4;
      if(i===2||i===3) h+=1.4; else h=Math.max(15, h-1.8);
    }else if(layout===3){ // zig-zag roof run
      px=[-5,-2,3,5,2,-3][i%6];
      h=Math.max(16, h-(Math.random()*1.5));
    }else{ // harder but still reachable high-low jumps
      px=(Math.random()-.5)*6;
      if(i%4===2) h+=2.2; else h=Math.max(14, h-2.2);
    }

    // Hard safety clamp: never make the next platform too high above previous.
    if(prev && h-prev.y>2.4) h=prev.y+2.4;
    // Also prevent huge drops becoming too extreme.
    if(prev && prev.y-h>5.5) h=prev.y-5.5;

    cur+=g+d/2;
    let roofZ=-cur;
    addPlatform(px,h,roofZ,w,d,c.roof);

    if(prev){
      let prevEnd=prev.z-prev.d/2;
      let start=roofZ+d/2;
      let gap=Math.abs(start-prevEnd);
      let heightDiff=h-prev.y;

      if(heightDiff>1.2){
        addRampBridge(prev.x,prev.y,prev.z-prev.d/2,px,h,roofZ+d/2);
      }else if(gap>13){
        addMovingPlatform((prev.x+px)/2,(prev.y+h)/2+1,(prev.z+roofZ)/2);
      }
    }

    addStuff(px,h,roofZ,w,d,i,obsExtra);
    prev={x:px,y:h,z:roofZ,d,w};
    cur+=d/2;
  }
  finishZ=-(cur+28);
  addFinish(finishZ,h+5);
}
function addBillboard(b,bw,bh,bd){let messages=["CODE: CITY100","CODE: PARKOURVIP","CODE: OWNERBOOST","RUN FAST","CITY PARKOUR","WALL RUN ➜"];let sign=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(14,bw*.75),4.2),new THREE.MeshBasicMaterial({color:partyMode?Math.random()*0xffffff:mapColors().glow,transparent:true,opacity:.85}));sign.position.set(b.position.x,b.position.y+bh*.16,b.position.z+bd/2+.08);scene.add(sign);decor.push(sign)}
function addStuff(px,py,pz,w,d,i,extra){
  addCoins(px,py,pz);

  // Obstacles use separated positions so boosts are not beside barriers.
  if(i>0)addHurdle(px,py,pz-6);
  if(extra>2&&Math.random()<.55)addHurdle(px+(Math.random()-.5)*6,py,pz+6);

  if(i===1||i===6)addTruck(px,py,pz+8);
  if(i===2||i===8||i===10)addBooster(px+(Math.random()-.5)*4,py,pz-10);
  if(i===6||i===9)addJumpPad(px+(Math.random()-.5)*4,py,pz+11);

  if(i===3||i===7)addPortal(px,py,pz+d*.24,false);
  if(i===5||i===9)addSlope(px,py,pz-4);

  // Edge wall-runs are closer and clearly marked.
  if(i===4||i===8)addWallRunGap(px,py,pz,w,d);

  // Detailed subway/train cars appear on some levels as jumpable platforms.
  if(i===2||i===7)addTrain(px,py,pz+13);
}
function addHurdle(px,py,pz){let g=new THREE.Group();let railMat=mat(0xf6c453),postMat=mat(0x202020);let r1=new THREE.Mesh(new THREE.BoxGeometry(4.8,.28,.24),railMat);let r2=r1.clone();r1.position.y=.45;r2.position.y=-.15;let p1=new THREE.Mesh(new THREE.BoxGeometry(.22,1.6,.22),postMat);p1.position.x=-2.1;let p2=p1.clone();p2.position.x=2.1;g.add(r1,r2,p1,p2);g.position.set(px,py+3,pz);g.userData={kind:"jump",r:2.8,clear:py+3.45};scene.add(g);obstacles.push(g);if(level>=10)addStairs(px,py,pz)}
function addTruck(px,py,pz){let g=new THREE.Group();let body=new THREE.Mesh(new THREE.BoxGeometry(6.8,1.25,3),mat(0xd85a24));let cabin=new THREE.Mesh(new THREE.BoxGeometry(2.7,1.15,2.5),mat(0x9fc7df));cabin.position.set(1.2,1.05,0);g.add(body,cabin);for(let sx of [-2.3,2.3])for(let sz of [-1.1,1.1]){let w=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.32,18),mat(0x111111));w.rotation.z=Math.PI/2;w.position.set(sx,-.55,sz);g.add(w)}g.position.set(px+(Math.random()-.5)*4,py+4.4,pz+4);g.userData={kind:"slide",r:3.6};scene.add(g);obstacles.push(g)}
function addCoins(px,py,pz){for(let i=0;i<3;i++){let c=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.12,24),new THREE.MeshStandardMaterial({color:0xf6c453,metalness:.65,roughness:.2,emissive:0x3a2500}));c.rotation.x=Math.PI/2;c.position.set(px,py+4,pz-3+i*2.5);scene.add(c);coinObjs.push(c)}}
function addPortal(px,py,pz,exit){let g=new THREE.Group();let ring=new THREE.Mesh(new THREE.TorusGeometry(4.5,.3,16,64),mat(0x26313a,0x0b1820));let glow=new THREE.Mesh(new THREE.TorusGeometry(3.85,.12,16,64),new THREE.MeshBasicMaterial({color:0xf6c453}));let pane=new THREE.Mesh(new THREE.CircleGeometry(4,48),glass());g.add(ring,glow,pane);g.position.set(px,py+5,pz);g.userData={r:6,exit};scene.add(g);portals.push(g)}
function addSlope(px,py,pz){let s=new THREE.Mesh(new THREE.BoxGeometry(12,.55,18),glass());s.rotation.x=-.28;s.position.set(px,py+3,pz);s.userData={kind:"slope",r:7};scene.add(s);slopes.push(s);let col=new THREE.Mesh(new THREE.BoxGeometry(12,.35,18),new THREE.MeshBasicMaterial({visible:false}));col.position.set(px,py+2.8,pz);col.userData={w:12,d:18,top:py+3.2,platform:true,slope:true};scene.add(col);platforms.push(col)}
function addBooster(px,py,pz){let b=new THREE.Group();let pad=new THREE.Mesh(new THREE.BoxGeometry(5,.35,4),new THREE.MeshStandardMaterial({color:0x39d98a,emissive:0x0b5b31}));let arrow=new THREE.Mesh(new THREE.ConeGeometry(.7,1.6,3),new THREE.MeshBasicMaterial({color:0xffffff}));arrow.rotation.x=-Math.PI/2;arrow.position.y=.35;b.add(pad,arrow);b.position.set(px,py+2.1,pz);b.userData={kind:"boost",r:4,used:false};scene.add(b);boosters.push(b)}
function addJumpPad(px,py,pz){let b=new THREE.Group();let pad=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.1,.35,32),new THREE.MeshStandardMaterial({color:0x4ba3ff,emissive:0x0c2f5c}));let top=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.45,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75}));top.position.y=.2;b.add(pad,top);b.position.set(px,py+2.1,pz);b.userData={kind:"jumpPad",r:4,used:false};scene.add(b);boosters.push(b)}
function addRampBridge(x1,y1,z1,x2,y2,z2){
  const midX=(x1+x2)/2, midY=(y1+y2)/2+1.0, midZ=(z1+z2)/2;
  const dist=Math.max(9, Math.abs(z2-z1));
  const bridge=new THREE.Group();

  const deck=new THREE.Mesh(
    new THREE.BoxGeometry(8,.65,dist),
    new THREE.MeshStandardMaterial({color:theme==="night"?0x7ddcff:0xf6c453,roughness:.35,metalness:.12,emissive:theme==="night"?0x123b4a:0x000000})
  );
  deck.position.y=0;
  bridge.add(deck);

  // side rails so it looks like a bridge, not a random block
  const railMat=mat(theme==="night"?0xffffff:0x26313a);
  for(const sx of [-1,1]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.25,1.1,dist),railMat);
    rail.position.set(sx*4.1,.85,0);
    bridge.add(rail);
  }

  bridge.position.set(midX,midY,midZ);
  bridge.rotation.x=THREE.MathUtils.clamp(-(y2-y1)/Math.max(dist,1),-.22,.22);
  bridge.userData={w:8,d:dist,top:midY+.35,platform:true,ramp:true};
  scene.add(bridge);
  platforms.push(bridge);
  decor.push(bridge);

  if(y2>y1+.8)addStairs(x1,y1,z1);
  else if(y1>y2+.8)addStairs(x2,y2,z2);
}

function addMovingPlatform(px,py,pz){
  let g=new THREE.Group();
  let deck=new THREE.Mesh(new THREE.BoxGeometry(8,1.1,7),mat(0x7d8a91));
  let stripe=new THREE.Mesh(new THREE.BoxGeometry(7.6,.08,.45),new THREE.MeshBasicMaterial({color:0xf6c453}));
  stripe.position.y=.62;
  g.add(deck,stripe);
  g.position.set(px,py,pz);
  g.userData={w:8,d:7,top:py+.55,platform:true,baseX:px,amp:3,phase:Math.random()*6.28};
  scene.add(g);platforms.push(g);movingPlatforms.push(g);
}

function addWallRunGap(px,py,pz,w,d){
  let gapMarker=new THREE.Mesh(new THREE.BoxGeometry(w*.55,.25,5),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.35}));
  gapMarker.position.set(px,py+2.05,pz);
  scene.add(gapMarker);decor.push(gapMarker);
  addWallRun(px,py,pz,w,d);
}

function addWallRun(px,py,pz,w,d){
  const side=Math.random()<.5?-1:1;
  const group=new THREE.Group();
  const wall=new THREE.Mesh(new THREE.BoxGeometry(1.05,8.8,22),mat(0xbca06a,0x352400));
  group.add(wall);
  for(let i=0;i<4;i++){
    const mark=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,2.2),new THREE.MeshBasicMaterial({color:0xf6c453,transparent:true,opacity:.9}));
    mark.position.set(-side*.48,-2.5+i*1.5,-6+i*3.2);
    group.add(mark);
  }
  // Close enough to touch when moving to platform edge
  group.position.set(px+side*(w/2+.25),py+5,pz);
  group.userData={side,r:8.8,edgeX:px+side*(w/2-.8)};
  scene.add(group);wallRuns.push(group);
}
function addTrain(px,py,pz){
  const train=new THREE.Group();
  const carMat=new THREE.MeshStandardMaterial({color:0x2f5f8f,roughness:.35,metalness:.35});
  const roofMat=new THREE.MeshStandardMaterial({color:0xcfd8dc,roughness:.25,metalness:.25});
  for(let car=0;car<2;car++){
    const body=new THREE.Mesh(new THREE.BoxGeometry(8,2.2,8),carMat);
    body.position.z=car*8.4;
    const roof=new THREE.Mesh(new THREE.BoxGeometry(8.2,.35,8.2),roofMat);
    roof.position.set(0,1.25,car*8.4);
    train.add(body,roof);
    for(let i=0;i<3;i++){
      const win=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.7),new THREE.MeshBasicMaterial({color:0x7ddcff,transparent:true,opacity:.85}));
      win.position.set(-4.05,.35,car*8.4-2.5+i*2.4);
      win.rotation.y=-Math.PI/2;
      train.add(win);
      const win2=win.clone();
      win2.position.x=4.05;
      win2.rotation.y=Math.PI/2;
      train.add(win2);
    }
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(8.3,.18,.25),new THREE.MeshBasicMaterial({color:0xf6c453}));
    stripe.position.set(0,.95,car*8.4);
    train.add(stripe);
  }
  train.position.set(px,py+3.0,pz);
  train.userData={w:8,d:17,top:py+4.35,platform:true,train:true};
  scene.add(train);
  platforms.push(train);
  decor.push(train);
}

function addFinish(pz,py){let g=new THREE.Group();let banner=new THREE.Mesh(new THREE.BoxGeometry(14,4,.4),new THREE.MeshBasicMaterial({color:0xffffff}));banner.position.y=7;g.add(banner);for(let i=0;i<12;i++){let sq=new THREE.Mesh(new THREE.BoxGeometry(2,1.3,.5),new THREE.MeshBasicMaterial({color:i%2?0x111111:0xf6c453}));sq.position.set(-5+(i%6)*2,8-Math.floor(i/6)*1.3,.1);g.add(sq)}g.position.set(0,py,pz);scene.add(g);decor.push(g)}
function buildOffice(){
  returnData={z,score};
  clearWorld();
  inOffice=true;
  x=0;targetX=0;z=0;y=19;vy=0;sliding=false;wallRunning=false;

  addPlatform(0,16,-62,20,145,0xcfd8dc);

  const wallMat=glass();
  const frameMat=mat(0x26313a,0x061018);

  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(.45,10,145),wallMat);
  leftWall.position.set(-10.2,22,-62);scene.add(leftWall);decor.push(leftWall);
  const rightWall=leftWall.clone();rightWall.position.x=10.2;scene.add(rightWall);decor.push(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(20,10,.45),wallMat);
  backWall.position.set(0,22,-134);scene.add(backWall);decor.push(backWall);
  const ceiling=new THREE.Mesh(new THREE.BoxGeometry(20,.35,145),glass());
  ceiling.position.set(0,27.2,-62);scene.add(ceiling);decor.push(ceiling);

  for(const sx of [-1,1]){
    for(let k=0;k<8;k++){
      const frame=new THREE.Mesh(new THREE.BoxGeometry(.25,10,.25),frameMat);
      frame.position.set(sx*10.35,22,-125+k*18);
      scene.add(frame);decor.push(frame);
    }
  }

  for(let i=0;i<8;i++){
    addDesk((i%2?4.8:-4.8),18.2,-16-i*11);
    addOfficeChair((i%2?2.6:-2.6),18.1,-16-i*11);
  }
  for(let i=0;i<6;i++)addPlant((i%2?8:-8),17.2,-20-i*18);
  for(let i=0;i<6;i++)addPainting((i%2?9.85:-9.85),22.4,-18-i*18,i%2?Math.PI/2:-Math.PI/2);

  addOfficeWallRun(-9.4,21,-52,1);
  addOfficeWallRun(9.4,21,-84,-1);
  addOfficeGapWallRunSection();

  addPortal(0,21,-130,true);
}
function addDesk(x,y,z){
  let g=new THREE.Group();
  let top=new THREE.Mesh(new THREE.BoxGeometry(3.6,.35,2.1),mat(0x8a6a45));
  top.position.y=.85;
  let legMat=mat(0x4b3622);
  for(const lx of [-1.45,1.45])for(const lz of [-.75,.75]){
    let leg=new THREE.Mesh(new THREE.BoxGeometry(.18,.9,.18),legMat);
    leg.position.set(lx,.35,lz);g.add(leg);
  }
  let mon=new THREE.Mesh(new THREE.BoxGeometry(1.2,.82,.12),mat(0x111820,0x02080d));
  mon.position.set(0,1.55,-.58);
  let screen=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.6),new THREE.MeshBasicMaterial({color:0x7ddcff,transparent:true,opacity:.9}));
  screen.position.set(0,1.55,-.65);
  let screenPic=new THREE.Mesh(new THREE.PlaneGeometry(.55,.28),new THREE.MeshBasicMaterial({color:0xf6c453,transparent:true,opacity:.9}));
  screenPic.position.set(.12,1.56,-.66);
  let keyboard=new THREE.Mesh(new THREE.BoxGeometry(1.2,.08,.35),mat(0x202020));
  keyboard.position.set(0,1.03,.18);
  g.add(top,mon,screen,screenPic,keyboard);
  g.position.set(x,y,z);
  g.userData={kind:"jump",r:2.6,clear:y+1.7};
  scene.add(g);obstacles.push(g);
}
function addOfficeChair(x,y,z){
  let g=new THREE.Group();
  let seat=new THREE.Mesh(new THREE.BoxGeometry(1.1,.25,1.1),mat(0x26313a));
  let back=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,.22),mat(0x26313a));
  back.position.set(0,.65,.48);
  let stem=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.8,10),mat(0x111111));
  stem.position.y=-.45;
  g.add(seat,back,stem);
  g.position.set(x,y+.9,z+1.35);
  scene.add(g);decor.push(g);
}
function addPlant(x,y,z){let pot=new THREE.Mesh(new THREE.CylinderGeometry(.45,.6,.75,12),mat(0x8a4b2a));let leaves=new THREE.Mesh(new THREE.ConeGeometry(.8,1.5,12),mat(0x2f8f46));pot.position.set(x,y+.45,z);leaves.position.set(x,y+1.6,z);scene.add(pot,leaves);decor.push(pot,leaves)}
function addPainting(x,y,z,rot){
  let frame=new THREE.Mesh(new THREE.PlaneGeometry(2.45,1.65),new THREE.MeshBasicMaterial({color:0x26313a,transparent:true,opacity:.95}));
  frame.position.set(x,y,z);frame.rotation.y=rot;scene.add(frame);decor.push(frame);
  let p=new THREE.Mesh(new THREE.PlaneGeometry(2.05,1.25),new THREE.MeshBasicMaterial({color:Math.random()<.5?0xd85a24:0xf6c453,transparent:true,opacity:.9}));
  p.position.set(x+(x>0?-.02:.02),y,z);p.rotation.y=rot;scene.add(p);decor.push(p);
}
function addOfficeWallRun(x,y,z,side){
  let wall=new THREE.Mesh(new THREE.BoxGeometry(.55,6.8,22),mat(0x7ddcff,0x123b4a));
  wall.position.set(x,y+3,z);
  wall.userData={side,r:7.8,edgeX:x-side*.8,office:true};
  scene.add(wall);wallRuns.push(wall);
  for(let i=0;i<4;i++){
    let stripe=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,2.2),new THREE.MeshBasicMaterial({color:0xf6c453,transparent:true,opacity:.9}));
    stripe.position.set(x-side*.35,y+1+i*1.2,z-6+i*3.2);
    scene.add(stripe);decor.push(stripe);
  }
}
function addOfficeGapWallRunSection(){
  const gap=new THREE.Mesh(new THREE.BoxGeometry(15,.25,6),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.35}));
  gap.position.set(0,18.05,-72);
  scene.add(gap);decor.push(gap);
  addOfficeWallRun(-9.4,21,-72,1);
  addOfficeWallRun(9.4,21,-72,-1);
}
function returnOutside(){
  clearWorld();
  inOffice=false;
  z=returnData?returnData.z-35:-165;
  score=returnData?returnData.score:score;
  x=0;targetX=0;y=24;vy=0;sliding=false;wallRunning=false;
  buildWorld();
}
function makeBody(){body=new THREE.Group();camera.add(body);body.position.set(0,-.65,-.9);let skin=mat(0xd4956c),cloth=mat(accessory==="hoodie_red"?0xb52b2b:accessory==="hoodie_blue"?0x1c5ed6:0x27313a);function limb(x,y,z,m){let g=new THREE.Group();let a=new THREE.Mesh(new THREE.CapsuleGeometry(.1,.5,8,16),m),b=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.45,8,16),m);a.position.y=.15;b.position.y=-.32;g.add(a,b);g.position.set(x,y,z);body.add(g);return g}body.la=limb(-.42,.1,-.08,cloth);body.ra=limb(.42,.1,-.08,cloth);body.ll=limb(-.2,-.62,.1,mat(0x111111));body.rl=limb(.2,-.62,.1,mat(0x111111));body.lh=new THREE.Mesh(new THREE.BoxGeometry(.18,.22,.1),accessory==="gloves"?mat(0x111111):skin);body.rh=body.lh.clone();body.lh.position.set(-.45,-.58,-.1);body.rh.position.set(.45,-.58,-.1);body.lf=new THREE.Mesh(new THREE.BoxGeometry(.22,.12,.46),mat(accessory==="shoes"?0x2f3540:0x111111));body.rf=body.lf.clone();body.lf.position.set(-.22,-1.1,-.08);body.rf.position.set(.22,-1.1,-.08);body.add(body.lh,body.rh,body.lf,body.rf)}
function jump(){if(state==="play"&&(grounded||wallRunning)){if(wallRunning)exitWallRun();else{vy=JUMP;grounded=false;playSound(260,.12);}}}
function exitWallRun(){wallRunning=false;vy=JUMP*.8;targetX*=.5;playSound(340,.12)}
function update(dt){
 if(state!=="play")return;if(mode==="timed")time+=dt;if(mapNameTimer>0){mapNameTimer-=dt;if(mapNameTimer<=0)$("mapName").classList.add("hidden")}if(boostTimer>0){boostTimer-=dt;if(boostTimer<=0)speed=baseSpeed}
 if(left)targetX=THREE.MathUtils.clamp(targetX-10*dt,-11,11);if(right)targetX=THREE.MathUtils.clamp(targetX+10*dt,-11,11);
 for(const m of movingPlatforms){m.userData.phase+=dt*1.5;m.position.x=m.userData.baseX+Math.sin(m.userData.phase)*m.userData.amp;m.userData.top=m.position.y+.55}
 z-=speed*dt;x+=(targetX-x)*Math.min(1,dt*8);vy-=wallRunning?0:GRAVITY*dt;y+=wallRunning?0:vy*dt;grounded=false;let newTop=null;
 for(const p of platforms){if(!p.userData.top)continue;let dx=Math.abs(x-p.position.x),dz=Math.abs(z-p.position.z);if(dx<p.userData.w/2&&dz<p.userData.d/2&&y<=p.userData.top+.7&&y>p.userData.top-3&&vy<=0){if(lastPlatformTop-p.userData.top>4&&!cinematicDrop){cinematicDrop=true;setTimeout(()=>cinematicDrop=false,700)}y=p.userData.top;vy=0;grounded=true;newTop=p.userData.top;if(p.userData.slope){sliding=true}else if(!sliding){sliding=false}}}
 if(newTop!==null)lastPlatformTop=newTop;
 wallRunning=false;for(const w of wallRuns){if(w.position.distanceTo(new THREE.Vector3(x,y,z))<w.userData.r){wallRunning=true;y=w.position.y;targetX=w.userData.edgeX;break}}
 for(let i=coinObjs.length-1;i>=0;i--){let c=coinObjs[i];c.rotation.z+=.08;if(c.position.distanceTo(new THREE.Vector3(x,y+1,z))<1.6){coins++;saveMoney();scene.remove(c);coinObjs.splice(i,1);playSound(880,.07)}}
 for(const p of portals){if(p.position.distanceTo(new THREE.Vector3(x,y+2,z))<(p.userData.r||5)){p.userData.exit?returnOutside():(!inOffice?buildOffice():null);playSound(180,.2);return}}
 for(const b of boosters){if(!b.userData.used&&b.position.distanceTo(new THREE.Vector3(x,y,z))<b.userData.r){b.userData.used=true;if(b.userData.kind==="boost"){speed=baseSpeed+4;boostTimer=4;playSound(520,.15)}else if(b.userData.kind==="jumpPad"){vy=JUMP*1.55;grounded=false;playSound(420,.14)}}}
 for(const o of obstacles){let d=o.position.distanceTo(new THREE.Vector3(x,y,z));if(d<(o.userData.r||3)){if(o.userData.kind==="jump"&&y>o.userData.clear)continue;if(o.userData.kind==="slide"&&sliding)continue;if(inOffice)buildOffice();else{flash(crashComment());start(mode)}return}}
 if(y<-20){flash(crashComment());start(mode);return}
 score=Math.max(score,Math.min(1000,Math.floor(Math.abs(z)/Math.abs(finishZ)*1000)));if(!inOffice&&z<=finishZ+5){score=1000;complete();return}
 player.position.set(x,y,z);animateBody();updateHUD();runningSound(dt)
}
function animateBody(){let a=Math.sin(clock.elapsedTime*speed*3);if(wallRunning){body.rotation.z=.35;body.la.rotation.x=-1.1;body.ra.rotation.x=-.35;body.ll.rotation.x=-.8+a*.2;body.rl.rotation.x=.75-a*.2}else{body.rotation.z=cinematicDrop?Math.sin(clock.elapsedTime*8)*.12:0;body.la.rotation.x=a*.6;body.ra.rotation.x=-a*.6;body.ll.rotation.x=-a*.7;body.rl.rotation.x=a*.7}body.position.y=-.65+Math.abs(a)*.03-(sliding?.25:0);body.position.z=cinematicDrop?-.35:-.9;camera.position.y=(sliding?1.1:HEIGHT)+Math.abs(a)*.01;camera.position.z=cinematicDrop?4.6:0}
function updateHUD(){$("levelText").textContent=level;$("scoreText").textContent=score;$("coinText").textContent=coins;$("gemText").textContent=gems;$("timeText").textContent=time.toFixed(1);$("statusText").textContent=boostTimer>0?"BOOST":wallRunning?"WALL RUN":(sliding?"SLIDE":grounded?"RUN":"AIR")}
function complete(){state="complete";let extra="";if(mode==="timed"){let earned=Math.max(5,Math.floor(120-time*3));gems+=earned;saveMoney();saveWorldRecord(earned);extra=` Time: ${time.toFixed(2)}s · 💎 +${earned} gems.`}$("completeTitle").textContent=`🏁 LEVEL ${level} COMPLETE!`;$("completeText").textContent=`Great run, ${playerName}!${extra}`;$("hud").classList.add("hidden");$("pauseBtn").classList.add("hidden");$("timer").classList.add("hidden");show("complete")}
function saveWorldRecord(earned){let board=JSON.parse(localStorage.getItem("cp_world_board")||"[]");board.push({name:playerName,role:playerRole,time,gems:earned,level});board.sort((a,b)=>a.time-b.time);localStorage.setItem("cp_world_board",JSON.stringify(board.slice(0,20)));localStorage.setItem("cp_record",JSON.stringify({name:playerName,role:playerRole,time,gems:earned,level})); if(typeof uploadOnlineScore==='function')setTimeout(()=>uploadOnlineScore(),300)}
function crashComment(){
  const lines=[
    "WATCH YOUR WAY, DUDE!",
    "BRO, LOOK AHEAD!",
    "THAT WAS NOT PARKOUR!",
    "MOVE BETTER NEXT TIME!",
    "OUCH... CLEAN RUN RUINED!",
    "DUDE, THAT WAS THE OBSTACLE!"
  ];
  return lines[Math.floor(Math.random()*lines.length)];
}
function flash(t){$("message").textContent=t;$("message").classList.remove("hidden");setTimeout(()=>$("message").classList.add("hidden"),700)}
function showMapName(){$("mapName").textContent=currentMap();$("mapName").classList.remove("hidden");mapNameTimer=3}
function showGlobalText(){if(globalText){$("globalText").textContent=globalText;$("globalText").classList.remove("hidden")}else $("globalText").classList.add("hidden")}
function items(){return[{id:"sunglasses",name:"😎 Sunglasses",price:80},{id:"gloves",name:"🧤 Gloves",price:120},{id:"shoes",name:"👟 Shoes",price:160},{id:"hoodie_blue",name:"🟦 Blue Hoodie",price:220},{id:"hoodie_red",name:"🟥 Red Hoodie",price:220},{id:"gold",name:"✨ Neon Trail",price:650},{id:"royal",name:"👑 Royal Cape",price:1200},{id:"diamond",name:"💎 Diamond Trail",price:2000},{id:"cyber",name:"🤖 Cyber Arm",price:2500},{id:"galaxy",name:"🌌 Galaxy Suit",price:3500},{id:"space",name:"🚀 Space Boots",price:4200}]}
function buildAccessories(){$("coinMenu").textContent=coins;let box=$("accessoryList");box.innerHTML="";items().forEach(a=>{let own=localStorage.getItem("own_"+a.id)==="1";let card=document.createElement("div");card.className="accessory"+(accessory===a.id?" equipped":"");card.innerHTML=`<div>${a.name}</div><div>${own?"Owned":"Price: "+a.price+" coins"}</div>`;let btn=document.createElement("button");btn.textContent=own?"EQUIP":"BUY";btn.onclick=()=>{if(!own){if(coins<a.price){flash("FELL");return}coins-=a.price;localStorage.setItem("own_"+a.id,"1");saveMoney()}accessory=a.id;localStorage.setItem("cp_accessory",a.id);camera.remove(body);makeBody();buildAccessories()};card.appendChild(btn);box.appendChild(card)})}
function buildRecord(){
  if(typeof buildOnlineBoard==="function")buildOnlineBoard();
  else buildLocalBoardOnly();
}
function startAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)()}
function playSound(freq,dur){startAudio();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type="triangle";g.gain.value=.06;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur)}
function runningSound(dt){if(!grounded||sliding||wallRunning)return;stepTimer-=dt;if(stepTimer<=0){playSound(70,.035);stepTimer=.24/(speed/9)}}
function animate(){requestAnimationFrame(animate);let dt=Math.min(clock.getDelta(),.033);update(dt);renderer.render(scene,camera)}



/* v39 online-ready leaderboard layer */
let onlineDB=null;
let onlineReady=false;

function initOnline(){
  try{
    if(window.CP_FIREBASE_CONFIG && window.firebase){
      firebase.initializeApp(window.CP_FIREBASE_CONFIG);
      onlineDB=firebase.firestore();
      onlineReady=true;
      setOnlineStatus("🌐 Online leaderboard connected");
    }else{
      onlineReady=false;
      setOnlineStatus("📴 Offline mode: add Firebase config to enable worldwide leaderboard");
    }
  }catch(e){
    console.warn("Online init failed", e);
    onlineReady=false;
    setOnlineStatus("📴 Offline mode: Firebase setup needed");
  }
}

function setOnlineStatus(text){
  const el=document.getElementById("onlineStatus");
  if(el) el.textContent=text;
}

async function uploadOnlineScore(){
  if(!onlineReady || !onlineDB){setOnlineStatus("📴 Online leaderboard not connected");return;}
  try{
    const record=JSON.parse(localStorage.getItem("cp_record")||"null");
    if(!record){setOnlineStatus("No timed record to upload yet");return;}
    await onlineDB.collection("city_parkour_scores").add({
      name: record.name || playerName || "Player",
      role: record.role || playerRole || "Player",
      time: Number(record.time || 0),
      gems: Number(record.gems || 0),
      level: Number(record.level || level || 1),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setOnlineStatus("✅ Score uploaded worldwide");
    await buildOnlineBoard();
  }catch(e){
    console.error(e);
    setOnlineStatus("❌ Upload failed. Check Firebase rules/config.");
  }
}

async function buildOnlineBoard(){
  const box=document.getElementById("recordBox");
  if(!box)return;
  if(!onlineReady || !onlineDB){
    setOnlineStatus("📴 Offline mode: showing local board");
    buildLocalBoardOnly();
    return;
  }
  try{
    setOnlineStatus("🌐 Loading worldwide leaderboard...");
    const snap=await onlineDB.collection("city_parkour_scores").orderBy("time","asc").limit(20).get();
    box.innerHTML="";
    if(snap.empty){
      const c=document.createElement("div");
      c.className="record-card online";
      c.innerHTML="No online scores yet.";
      box.appendChild(c);
    }else{
      let i=1;
      snap.forEach(doc=>{
        const r=doc.data();
        const c=document.createElement("div");
        c.className="record-card online";
        c.innerHTML=`${i}. <b>${r.name||"Player"}</b> (${r.role||"Player"})<br>Level ${r.level||1} · ${Number(r.time||0).toFixed(2)}s · 💎 ${r.gems||0}`;
        box.appendChild(c);
        i++;
      });
    }
    setOnlineStatus("🌐 Worldwide leaderboard live");
    const tools=document.getElementById("ownerTools");
    if(tools)tools.classList.toggle("hidden",!isOwner());
  }catch(e){
    console.error(e);
    setOnlineStatus("❌ Online board failed. Showing local board.");
    buildLocalBoardOnly();
  }
}

function buildLocalBoardOnly(){
  const box=document.getElementById("recordBox");
  if(!box)return;
  box.innerHTML="";
  let board=JSON.parse(localStorage.getItem("cp_world_board")||"[]");
  if(board.length===0){
    let c=document.createElement("div");
    c.className="record-card";
    c.innerHTML="No local records yet.";
    box.appendChild(c);
  }
  board.slice(0,10).forEach((r,i)=>{
    let c=document.createElement("div");
    c.className="record-card";
    c.innerHTML=`${i+1}. <b>${r.name}</b> (${r.role||"Player"})<br>Level ${r.level||1} · ${Number(r.time||0).toFixed(2)}s · 💎 ${r.gems}`;
    box.appendChild(c);
  });
  const tools=document.getElementById("ownerTools");
  if(tools)tools.classList.toggle("hidden",!isOwner());
}

function wireOnlineButtons(){
  const refresh=document.getElementById("refreshOnlineBtn");
  if(refresh)refresh.onclick=()=>buildOnlineBoard();
  const upload=document.getElementById("uploadMyScoreBtn");
  if(upload)upload.onclick=()=>uploadOnlineScore();
}

setTimeout(()=>{initOnline();wireOnlineButtons();},500);

document.addEventListener("DOMContentLoaded",()=>{
 const wb=document.getElementById("worldLeaderboardBtn");
 const wr=document.getElementById("worldLeaderboard");
 const mb=document.getElementById("myRecordBtn");
 const mr=document.getElementById("myRecord");

 if(wb && wr){
   wb.addEventListener("click",()=>wr.classList.remove("hidden"));
 }
 if(mb && mr){
   mb.addEventListener("click",()=>{
     const box=document.getElementById("myRecordBox");
     const rec=JSON.parse(localStorage.getItem("cp_record")||"null");
     if(box){
       box.innerHTML=rec ? `${rec.name||"Player"}<br>${Number(rec.time||0).toFixed(2)}s` : "No record yet.";
     }
     mr.classList.remove("hidden");
   });
 }
});

/* v39_fix_back */
document.addEventListener("DOMContentLoaded",()=>{
  const world=document.getElementById("worldLeaderboard");
  const my=document.getElementById("myRecord");

  if(world){
    world.querySelectorAll(".back").forEach(btn=>{
      btn.addEventListener("click",()=>{
        world.classList.add("hidden");
      });
    });
  }

  if(my){
    my.querySelectorAll(".back").forEach(btn=>{
      btn.addEventListener("click",()=>{
        my.classList.add("hidden");
      });
    });
  }
});
