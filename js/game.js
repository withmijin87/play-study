var XM = true; /* 디자인 상태 (skin.js에서 바뀜) */
var LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
function GL(w){ return w.l || w.w.charAt(0).toLowerCase(); }
function BI(w){ return w.l ? w.w.lastIndexOf(w.l) : 0; }
function blankHTML(w,id,fill){ var i=BI(w); return (i?'<span>'+w.w.slice(0,i)+'</span>':'')+'<span class="slot" id="'+id+'">'+fill+'</span><span>'+w.w.slice(i+1)+'</span>'; }
var $ = function(id){return document.getElementById(id);};

/* ---------- sound ---------- */
var player = new Audio();
function speak(w){
  var src = AUDIO[w]; if(!src) return;
  try{ player.pause(); player.src=src; player.currentTime=0; var p=player.play(); if(p&&p.catch) p.catch(function(){}); }catch(e){}
}
var actx=null;
function sfx(type){
  try{
    if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
    var t=actx.currentTime, o=actx.createOscillator(), g=actx.createGain();
    o.connect(g); g.connect(actx.destination);
    if(type==='ok'){ o.type='triangle'; o.frequency.setValueAtTime(660,t); o.frequency.setValueAtTime(880,t+.07); g.gain.setValueAtTime(.12,t); g.gain.exponentialRampToValueAtTime(.001,t+.18); o.start(t); o.stop(t+.2); }
    else if(type==='ng'){ o.type='square'; o.frequency.setValueAtTime(180,t); o.frequency.linearRampToValueAtTime(120,t+.2); g.gain.setValueAtTime(.07,t); g.gain.exponentialRampToValueAtTime(.001,t+.25); o.start(t); o.stop(t+.26); }
    else if(type==='fall'){ o.type='sawtooth'; o.frequency.setValueAtTime(500,t); o.frequency.exponentialRampToValueAtTime(80,t+.7); g.gain.setValueAtTime(.08,t); g.gain.exponentialRampToValueAtTime(.001,t+.75); o.start(t); o.stop(t+.76); }
    else if(type==='pop'){ var len=Math.floor(actx.sampleRate*.12), buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
      for(var n=0;n<len;n++) d[n]=(Math.random()*2-1)*Math.pow(1-n/len,3);
      var src=actx.createBufferSource(); src.buffer=buf; var g3=actx.createGain(); g3.gain.value=.35; src.connect(g3); g3.connect(actx.destination); src.start(t); }
    else if(type==='lvl'){ [523,659,784,1047].forEach(function(f,i){ var o2=actx.createOscillator(), g2=actx.createGain(); o2.type='triangle'; o2.connect(g2); g2.connect(actx.destination); o2.frequency.value=f; g2.gain.setValueAtTime(.09,t+i*.08); g2.gain.exponentialRampToValueAtTime(.001,t+i*.08+.2); o2.start(t+i*.08); o2.stop(t+i*.08+.22); }); }
  }catch(e){}
}

/* ---------- storage ---------- */
function bestKey(k){ k=k||cfg.kind; if(cfg.game==='balloon') return 'balloonBest_'+k; if(cfg.game==='tower') return 'towerBest_'+k; if(cfg.game==='match') return 'matchBest_'+k; return k==='math' ? 'stairsBestMath' : k==='frac' ? 'stairsBestFrac' : k==='word' ? 'stairsBest' : 'stairsBest_'+k; }
function unit(){ return cfg.game==='balloon' ? '점' : '층'; }
function fmtTime(sec){ sec=Math.round(sec); return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'); }
function bestText(){ var b=getBest(); if(cfg.game==='match') return b ? fmtTime(b) : '-'; return b+unit(); }
function getBest(k){
  var loc=0; try{ loc=+localStorage.getItem(bestKey(k||cfg.kind))||0; }catch(e){}
  if(typeof FB!=='undefined' && FB.user){ var c=FB.bests[cfg.game+'_'+(k||cfg.kind)]; var cb=c&&c.best||0;
    if(cfg.game==='match') return (loc&&cb) ? Math.min(loc,cb) : (loc||cb);
    return Math.max(loc,cb); }
  return loc;
}
function setBest(n,k){ try{ localStorage.setItem(bestKey(k||cfg.kind), n); }catch(e){} }

/* ---------- start screen ---------- */
var cfg = {game:'stairs', kind:'word', letters:new Set(LETTERS), mode:3, ops:new Set(['+','-']), lv:2, fm:3, flv:1};
var GEN_CFG = {
  clock:{name:'시계 보기', types:[[1,'시계 보고<br>시각'],[2,'시각 보고<br>시계'],[4,'몇 분<br>후·전'],[3,'섞어서']],
         levels:[[1,'쉬움<br><small>몇 시·30분</small>'],[2,'보통<br><small>5분 단위</small>'],[3,'어려움<br><small>1분 단위</small>']],
         hint:'짧은바늘은 \'시\', 긴바늘은 \'분\' · 1시간 = 60분', drain:0.85, bdur:1.15},
  money:{name:'돈 계산', types:[[1,'얼마일까요?'],[2,'거스름돈'],[3,'섞어서']],
         levels:[[1,'쉬움<br><small>10·50·100원</small>'],[2,'보통<br><small>1000원까지</small>'],[3,'어려움<br><small>5000원까지</small>']],
         hint:'큰 돈부터 차례로 세면 쉬워요.', drain:0.72, bdur:1.35},
  length:{name:'길이 재기', types:[[1,'자로<br>재기'],[2,'m·cm<br>바꾸기'],[4,'더하기<br>빼기'],[3,'섞어서']],
         levels:[[1,'쉬움<br><small>0부터 재기</small>'],[2,'보통<br><small>15cm·135cm</small>'],[3,'어려움<br><small>중간부터</small>']],
         hint:'1m = 100cm 예요.', drain:0.8, bdur:1.2},
  hanja:{name:'한자 공부', types:[[1,'한자 보고<br>뜻·소리'],[2,'뜻·소리<br>보고 한자'],[3,'섞어서']],
         levels:[[1,'8급<br><small>50자</small>'],[2,'7급Ⅱ<br><small>8급 포함 100자</small>'],[3,'7급<br><small>7급Ⅱ 포함 150자</small>']],
         hint:'한국어문회 한자능력검정시험 배정한자 기준', drain:0.85, bdur:1.1}
};

var GSET = {clock:{t:3,l:1}, money:{t:1,l:1}, length:{t:1,l:1}, hanja:{t:3,l:1}};
LETTERS.forEach(function(l){
  var b=document.createElement('button'); b.className='tog'; b.textContent=l.toUpperCase()+l; b.dataset.l=l; b.setAttribute('aria-pressed','true');
  b.onclick=function(){ cfg.letters.has(l)?cfg.letters.delete(l):cfg.letters.add(l); syncLetters(); };
  $('letters').appendChild(b);
});
$('allBtn').onclick=function(){ if(cfg.letters.size===LETTERS.length) cfg.letters.clear(); else LETTERS.forEach(function(l){cfg.letters.add(l);}); syncLetters(); };
function syncLetters(){
  document.querySelectorAll('#letters .tog').forEach(function(b){ b.setAttribute('aria-pressed', cfg.letters.has(b.dataset.l)); });
  $('allBtn').textContent = cfg.letters.size===LETTERS.length ? '전체 해제' : '전체 선택';
  $('startBtn').disabled = cfg.letters.size===0;
  $('hint').textContent = cfg.letters.size===0 ? '알파벳을 하나 이상 골라 주세요.' : '';
}
document.querySelectorAll('#modes .tog').forEach(function(b){
  b.onclick=function(){ cfg.mode=+b.dataset.m; document.querySelectorAll('#modes .tog').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); };
});
syncLetters();
document.querySelectorAll('.tab').forEach(function(t){
  t.onclick=function(){ cfg.kind=t.dataset.k; syncKind(); };
});
document.querySelectorAll('#ops .tog').forEach(function(b){
  b.onclick=function(){ var o=b.dataset.op; cfg.ops.has(o)?cfg.ops.delete(o):cfg.ops.add(o); syncKind(); };
});
document.querySelectorAll('#levels .tog').forEach(function(b){
  b.onclick=function(){ cfg.lv=+b.dataset.lv; document.querySelectorAll('#levels .tog').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); lvHint(); };
});
var LV_TXT={1:'예) 7+5, 13−6 · 곱셈·나눗셈은 2~5단',2:'예) 47+8, 62−7 · 곱셈·나눗셈은 2~9단',3:'예) 38+45, 81−29 · 곱셈·나눗셈은 2~9단 (시간이 더 천천히 줄어요)'};
function lvHint(){ $('lvHint').textContent=LV_TXT[cfg.lv]; }
lvHint();
document.querySelectorAll('#fmodes .tog').forEach(function(b){
  b.onclick=function(){ cfg.fm=+b.dataset.fm; document.querySelectorAll('#fmodes .tog').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); };
});
document.querySelectorAll('#flevels .tog').forEach(function(b){
  b.onclick=function(){ cfg.flv=+b.dataset.flv; document.querySelectorAll('#flevels .tog').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); };
});
document.querySelectorAll('.gtab').forEach(function(t){ t.onclick=function(){ cfg.game=t.dataset.g; syncKind(); }; });
var GAMES=['stairs','balloon','tower','match'];
function stepGame(d){
  var i=(GAMES.indexOf(cfg.game)+d+GAMES.length)%GAMES.length; cfg.game=GAMES[i];
  var h=document.querySelector('.hero'); h.classList.remove('slideL','slideR'); void h.offsetWidth; h.classList.add(d>0?'slideL':'slideR');
  syncKind();
}
$('hPrev').onclick=function(e){ e.stopPropagation(); stepGame(-1); };
$('hNext').onclick=function(e){ e.stopPropagation(); stepGame(1); };
(function(){
  var hero=document.querySelector('.hero'), x0=null, y0=0;
  hero.addEventListener('pointerdown', function(e){ if(e.target.closest('.hnav')) return; x0=e.clientX; y0=e.clientY; });
  hero.addEventListener('pointerup', function(e){ if(x0===null) return; var dx=e.clientX-x0, dy=e.clientY-y0; x0=null; if(Math.abs(dx)>35 && Math.abs(dx)>Math.abs(dy)) stepGame(dx<0?1:-1); });
  hero.addEventListener('pointercancel', function(){ x0=null; });
})();
function drawDots(){ $('hDots').innerHTML=GAMES.map(function(g){ return '<i class="'+(g===cfg.game?'on':'')+'"></i>'; }).join(''); }
function renderGenSet(){
  var k=cfg.kind, gc=GEN_CFG[k], st=GSET[k];
  $('gtypes').innerHTML=''; $('glevels').innerHTML='';
  gc.types.forEach(function(t){ var b=document.createElement('button'); b.className='tog wide'; b.innerHTML=t[1]; b.setAttribute('aria-pressed', st.t===t[0]);
    b.onclick=function(){ st.t=t[0]; renderGenSet(); }; $('gtypes').appendChild(b); });
  gc.levels.forEach(function(l){ var b=document.createElement('button'); b.className='tog wide'; b.innerHTML=l[1]; b.setAttribute('aria-pressed', st.l===l[0]);
    b.onclick=function(){ st.l=l[0]; renderGenSet(); }; $('glevels').appendChild(b); });
  $('gHint').textContent=gc.hint;
}
function syncKind(){
  if(typeof drawDots==='function') drawDots();
  var m = cfg.kind==='math', fr = cfg.kind==='frac', gk = GEN_CFG[cfg.kind];
  document.querySelectorAll('.tab').forEach(function(t){ t.setAttribute('aria-selected', t.dataset.k===cfg.kind); });
  $('wordSet').hidden=(m||fr||!!gk); $('mathSet').hidden=!m; $('fracSet').hidden=!fr; $('genSet').hidden=!gk;
  if(gk) renderGenSet();
  var bal = cfg.game==='balloon';
  document.querySelectorAll('.gtab').forEach(function(t){ t.setAttribute('aria-selected', t.dataset.g===cfg.game); });
  var GN={stairs:'무한계단', balloon:'풍선 터뜨리기', tower:'블록 쌓기', match:'짝 찾기'}[cfg.game];
  $('heroTitle').textContent = (gk ? gk.name.split(' ')[0]+' ' : m ? '수학 ' : fr ? '분수 ' : '영어 ') + GN;
  $('startBtn').textContent = GN+' ▶';
  $('rules').textContent = {
    stairs:'정답을 맞히면 한 칸 올라가요. 위쪽 시간 막대가 다 줄어들면 떨어져요! 틀리면 시간이 줄어들어요.',
    balloon:'정답 풍선을 눌러 터뜨려요! 틀린 풍선을 누르거나 정답 풍선이 날아가면 하트가 줄어요. ❤️ 풍선은 하트를 채워 줘요.',
    tower:'시간 제한 없이 천천히 풀어요. 맞히면 블록이 하나씩 쌓이고, 틀리면 탑이 흔들려요. 3번 틀리면 와르르 무너져요!',
    match:'왼쪽과 오른쪽에서 짝을 하나씩 눌러 선으로 이어요. 5쌍씩 3판, 빨리 끝낼수록 좋은 기록이에요!'
  }[cfg.game];
  $('wordSet').querySelectorAll('.label')[1].hidden = $('modes').hidden = cfg.game==='match';
  if(fr||gk){ $('startBtn').disabled=false; $('hint').textContent=''; $('bestTxt').textContent = bestText(); return; }
  document.querySelectorAll('#ops .tog').forEach(function(b){ b.setAttribute('aria-pressed', cfg.ops.has(b.dataset.op)); });
  $('bestTxt').textContent = bestText();
  if(m){ $('startBtn').disabled = cfg.ops.size===0; $('hint').textContent = cfg.ops.size===0 ? '계산 종류를 하나 이상 골라 주세요.' : ''; }
  else syncLetters();
}
syncKind();

function show(id){ ['start','game','bgame','mgame','result'].forEach(function(s){ $(s).hidden = s!==id; }); }

/* ---------- helpers ---------- */
function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function lerp(a,b,t){ return a+(b-a)*t; }
function mix(c1,c2,t){ return 'rgb('+[0,1,2].map(function(i){ return Math.round(lerp(c1[i],c2[i],t)); }).join(',')+')'; }

/* ---------- stairs world ---------- */
var SKY = [ // floor, top colour, bottom colour
  [0,  [176,214,226],[241,232,208]],
  [20, [150,180,210],[236,214,190]],
  [40, [ 70, 90,150],[190,160,170]],
  [60, [ 22, 34, 74],[ 62, 66,112]],
  [90, [  8, 10, 30],[ 26, 28, 62]]
];
function skyAt(f){
  for(var i=0;i<SKY.length-1;i++){
    if(f<SKY[i+1][0]){ var t=(f-SKY[i][0])/(SKY[i+1][0]-SKY[i][0]); return [mix(SKY[i][1],SKY[i+1][1],t), mix(SKY[i][2],SKY[i+1][2],t), f/90]; }
  }
  var l=SKY[SKY.length-1]; return [mix(l[1],l[1],0), mix(l[2],l[2],0), 1];
}
var STEP_COL = ['#d9483f','#3f8a66','#e9b443','#f6ecd2','#b8322f','#5fa883'];
var stars = Array.from({length:60}, function(){ return [Math.random(), Math.random(), Math.random()*1.6+.4]; });
var clouds = Array.from({length:6}, function(){ return [Math.random(), Math.random()*3000, 40+Math.random()*50]; });

function makeSteps(n){
  var s=[{x:0}], dir=1;
  for(var i=1;i<n;i++){ if(Math.random()<0.35) dir=-dir; s.push({x:s[i-1].x+dir}); }
  return s;
}
function extendSteps(arr, upto){
  var dir = arr.length>1 ? arr[arr.length-1].x-arr[arr.length-2].x : 1;
  while(arr.length<upto){ if(Math.random()<0.35) dir=-dir; arr.push({x:arr[arr.length-1].x+dir}); }
}

function drawWorld(cv, w, opt){
  var dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  if(cv.width!==Math.round(W*dpr) || cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  var camF=w.camF, camX=w.camX;
  var sky=skyAt(camF);
  var g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,sky[0]); g.addColorStop(1,sky[1]); c.fillStyle=g; c.fillRect(0,0,W,H);
  // stars
  if(sky[2]>0.45){ c.fillStyle='rgba(255,255,255,'+Math.min(1,(sky[2]-.45)*2)+')'; stars.forEach(function(s){ c.beginPath(); c.arc(s[0]*W, ((s[1]*H + camF*3) % H), s[2], 0, 7); c.fill(); }); }
  // clouds
  if(sky[2]<0.7){ c.fillStyle='rgba(255,255,255,'+(0.75-sky[2])+')'; clouds.forEach(function(cl){
    var y = ((cl[1] + camF*26) % (H+200)) - 100, x = cl[0]*W;
    c.beginPath(); c.ellipse(x,y,cl[2],cl[2]*.38,0,0,7); c.ellipse(x+cl[2]*.5,y-cl[2]*.2,cl[2]*.55,cl[2]*.35,0,0,7); c.fill(); }); }
  var tnow=performance.now();
  if(XM){ c.fillStyle='rgba(255,255,255,.9)';
  stars.forEach(function(st,k){ var fx=(st[0]*W + Math.sin(tnow/1400+k)*10 + W)%W, fy=((st[1]*H*1.2 + tnow*0.018*(0.6+st[2]*0.4)) % (H+20))-10; c.beginPath(); c.arc(fx,fy,st[2]*1.1+0.6,0,7); c.fill(); }); }
  var SW = Math.min(64, W/6.2), SH = SW*0.52;
  var baseY = H*0.70, cx = W/2;
  var i0 = Math.max(0, Math.floor(camF)-8), i1 = Math.floor(camF)+Math.ceil(H/SH)+2;
  if(w.steps.length<=i1+2) extendSteps(w.steps, i1+40);
  for(var i=i1;i>=i0;i--){
    var st=w.steps[i]; if(!st) continue;
    var x = cx + (st.x - camX)*SW, y = baseY - (i - camF)*SH;
    if(y<-SH || y>H+SH) continue;
    var col = i===0 ? '#9a8a78' : STEP_COL[Math.floor(i/10)%STEP_COL.length];
    c.fillStyle='rgba(0,0,0,.18)'; c.fillRect(x-SW/2+3, y+4, SW, SH*.62);
    c.fillStyle=col; c.fillRect(x-SW/2, y, SW, SH*.62); if(XM){ c.strokeStyle='#1b1a17'; c.lineWidth=1.6; c.strokeRect(x-SW/2, y, SW, SH*.62); }
    c.fillStyle='rgba(255,255,255,.45)'; c.fillRect(x-SW/2, y, SW, 4);
    if(i>0 && i%10===0){ c.fillStyle=XM?'#1b1a17':'#fff'; c.font='800 '+Math.round(SH*.42)+'px Nunito, sans-serif'; c.textAlign='center'; c.fillText(i, x, y+SH*.5); }
  }
  // player
  var p=w.p, px = cx + (p.x - camX)*SW, py = baseY - (p.f - camF)*SH - p.jump;
  drawHero(c, px, py, SW*0.36, p.face, p.mood, p.rot);
}
function drawHero(c, x, y, r, face, mood, rot){
  c.save(); c.translate(x, y - r*0.95); c.rotate(rot||0);
  // body
  c.fillStyle='rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(0, r*0.98, r*.8, r*.18, 0,0,7); c.fill();
  var g=c.createRadialGradient(-r*.3,-r*.3,r*.2,0,0,r*1.1); g.addColorStop(0,'#fff3a8'); g.addColorStop(1,'#ffc93c');
  c.fillStyle=g; c.beginPath(); c.arc(0,0,r,0,7); c.fill();
  c.strokeStyle=XM?'#1b1a17':'#d99a12'; c.lineWidth=2; c.stroke();
  // leaf on head
  if(!XM){ c.fillStyle='#3fbf7f'; c.beginPath(); c.ellipse(r*.15,-r*1.05,r*.32,r*.14,-.6,0,7); c.fill(); }
  else { c.lineWidth=1.6; c.strokeStyle='#1b1a17';
  c.fillStyle='#c8312f'; c.beginPath(); c.moveTo(-r*.78,-r*.55); c.quadraticCurveTo(-r*.25,-r*1.95,r*1.02,-r*1.3); c.quadraticCurveTo(r*.55,-r*1.05,r*.78,-r*.55); c.closePath(); c.fill(); c.stroke();
  c.fillStyle='#fffaf0'; c.beginPath(); c.ellipse(0,-r*.58,r*.86,r*.21,0,0,7); c.fill(); c.stroke();
  c.beginPath(); c.arc(r*1.04,-r*1.3,r*.19,0,7); c.fill(); c.stroke(); }
  // feet
  c.fillStyle='#ff8a3d'; c.beginPath(); c.ellipse(-r*.38,r*.95,r*.26,r*.13,0,0,7); c.ellipse(r*.38,r*.95,r*.26,r*.13,0,0,7); c.fill();
  // eyes
  var ex=face*r*.18;
  c.fillStyle='#24323a';
  if(mood==='sad'){ c.lineWidth=2.4; c.strokeStyle='#24323a'; c.beginPath(); c.moveTo(ex-r*.48,-r*.18); c.lineTo(ex-r*.2,-r*.08); c.moveTo(ex+r*.48,-r*.18); c.lineTo(ex+r*.2,-r*.08); c.stroke(); }
  else{ c.beginPath(); c.arc(ex-r*.32,-r*.12,r*.13,0,7); c.arc(ex+r*.32,-r*.12,r*.13,0,7); c.fill();
    c.fillStyle='#fff'; c.beginPath(); c.arc(ex-r*.28,-r*.17,r*.045,0,7); c.arc(ex+r*.36,-r*.17,r*.045,0,7); c.fill(); }
  // cheeks
  c.fillStyle='rgba(255,120,120,.45)'; c.beginPath(); c.arc(ex-r*.55,r*.15,r*.13,0,7); c.arc(ex+r*.55,r*.15,r*.13,0,7); c.fill();
  // mouth
  c.strokeStyle='#24323a'; c.lineWidth=2.2; c.beginPath();
  if(mood==='sad') c.arc(ex, r*.38, r*.16, Math.PI*1.15, Math.PI*1.85); else c.arc(ex, r*.12, r*.18, Math.PI*.15, Math.PI*.85);
  c.stroke();
  c.restore();
}

/* hero preview on start screen */
var heroWorld = {steps:makeSteps(60), camF:0, camX:0, p:{x:0,f:0,jump:0,face:1,mood:'',rot:0}};
var heroT=0;
var HB=[0,1,2,3,4,5].map(function(i){ return {x:Math.random(), off:Math.random(), c:['#e0605a','#5fa883','#f0c25a','#f6ecd2','#f2a0a0','#d9483f'][i]}; });
function drawHeroBalloons(cv, ts){
  var dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  if(cv.width!==Math.round(W*dpr) || cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  var g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,XM?'#b0d6e2':'#8fd3ff'); g.addColorStop(1,XM?'#f1e8d0':'#e2f5ff'); c.fillStyle=g; c.fillRect(0,0,W,H);
  HB.forEach(function(b,i){
    var t=((ts/7000)+b.off)%1, r=Math.min(22,H*.16), x=b.x*W*.8+W*.1+Math.sin(ts/700+i)*6, y=H+r*2-t*(H+r*5);
    c.strokeStyle='rgba(60,70,80,.4)'; c.lineWidth=1.2; c.beginPath(); c.moveTo(x,y+r*1.15); c.quadraticCurveTo(x+4,y+r*1.8,x,y+r*2.6); c.stroke();
    c.fillStyle=b.c; c.beginPath(); c.ellipse(x,y,r,r*1.18,0,0,7); c.fill();
    c.fillStyle='rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(x-r*.35,y-r*.4,r*.18,r*.26,-.5,0,7); c.fill();
  });
}
function drawHeroTower(cv, ts){
  var dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  if(cv.width!==Math.round(W*dpr) || cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  var g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,XM?'#b0d6e2':'#8fd3ff'); g.addColorStop(1,XM?'#f1e8d0':'#e2f5ff'); c.fillStyle=g; c.fillRect(0,0,W,H);
  if(XM){ c.fillStyle='#ffffff'; c.fillRect(0,H-10,W,10); c.fillStyle='#1b1a17'; c.fillRect(0,H-10,W,1.5); } else { c.fillStyle='#7ccf6e'; c.fillRect(0,H-10,W,10); }
  var BH=Math.max(10,(H-20)/7), BW=BH*3, a=Math.sin(ts/500)*0.04;
  for(var i=0;i<5;i++){ var x=W*0.5+Math.sin(a)*(i+1)*BH, y=H-10-(i+1)*BH; c.fillStyle=TCOL[i]; rrect(c,x-BW/2,y,BW,BH-2,4); c.fill(); }
  drawHero(c, W*0.5+Math.sin(a)*5*BH, H-10-5*BH, BH*0.55, 1, '', a);
}
function drawHeroMatch(cv, ts){
  var dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  if(cv.width!==Math.round(W*dpr) || cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  c.fillStyle='#d6efeb'; c.fillRect(0,0,W,H);
  var rows=3, ch=(H-16)/rows-6, cw=Math.min(70,W*0.16), lx=W*0.36, rx=W*0.64, k=Math.floor(ts/900)%4, map=[2,0,1];
  for(var i=0;i<rows;i++){
    var ly=8+i*(ch+6), ry=8+map[i]*(ch+6);
    if(i<k){ c.strokeStyle='#178a7e'; c.lineWidth=3; c.beginPath(); c.moveTo(lx+cw/2,ly+ch/2); c.lineTo(rx-cw/2,ry+ch/2); c.stroke(); }
    c.fillStyle=i<k?'#dcf5e6':'#fff'; rrect(c,lx-cw/2,ly,cw,ch,6); c.fill(); c.strokeStyle='#cfe2de'; c.lineWidth=2; c.stroke();
    c.fillStyle=map.indexOf(i)<k?'#dcf5e6':'#fff'; rrect(c,rx-cw/2,8+i*(ch+6),cw,ch,6); c.fill(); c.stroke();
  }
}
function heroLoop(ts){
  if(!$('start').hidden && cfg.game==='tower'){ drawHeroTower($('heroCv'), ts); }
  else if(!$('start').hidden && cfg.game==='match'){ drawHeroMatch($('heroCv'), ts); }
  else if(!$('start').hidden && cfg.game==='balloon'){ drawHeroBalloons($('heroCv'), ts); }
  else if(!$('start').hidden){
    var f = Math.floor(ts/600)%40, t=(ts%600)/600;
    var a=heroWorld.steps[f], b=heroWorld.steps[f+1];
    var k = Math.min(1,t*2.2);
    heroWorld.p.f = f + k; heroWorld.p.x = lerp(a.x,b.x,k); heroWorld.p.jump = Math.sin(k*Math.PI)*8; heroWorld.p.face = b.x>a.x?1:-1;
    heroWorld.camF = lerp(heroWorld.camF, heroWorld.p.f, .08); heroWorld.camX = lerp(heroWorld.camX, heroWorld.p.x, .08);
    drawWorld($('heroCv'), heroWorld);
  }
  requestAnimationFrame(heroLoop);
}
requestAnimationFrame(heroLoop);

/* ---------- game state ---------- */
var G = null;
function newGame(){
  var pool = WORDS.filter(function(x){ return cfg.letters.has(GL(x)); }); if(cfg.kind==='word') preloadWords(pool);
  G = {
    kind:cfg.kind, pool:pool, deck:[], last:null,
    world:{steps:makeSteps(80), camF:0, camX:0, p:{x:0,f:0,jump:0,face:1,mood:'',rot:0}},
    floor:0, time:100, combo:0, maxCombo:0, wrong:[], q:null, locked:false, over:false,
    anim:null, lastTs:0, pauseUntil:0, falling:null, token:(G?G.token:0)+1,
    mode:cfg.game, lives:3, blocks:[], sway:{a:0,v:0}, collapse:null, cam:0
  };
  $('floorN').textContent='0'; $('combo').textContent=''; $('bannerBox').innerHTML='';
  var tw=cfg.game==='tower'; $('gauge').hidden=tw; $('tHearts').hidden=!tw; drawTHearts(3);
  invReset(cfg.game);
  show('game'); nextQ(); G.lastTs=performance.now();
  requestAnimationFrame(loop);
}
function drainRate(){ var f = G.kind==='math' ? [1,1,0.85,0.65][cfg.lv] : G.kind==='frac' ? 0.85 : GEN_CFG[G.kind] ? GEN_CFG[G.kind].drain : 1; return Math.min(14, 6 + G.floor*0.09)*f; } // percent per second
function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function makeMath(){
  var ops=Array.from(cfg.ops), op=ops[Math.floor(Math.random()*ops.length)], lv=cfg.lv, a, b, r;
  if(op==='+'){
    if(lv===1){ a=ri(1,9); b=ri(1,9); }
    else if(lv===2){ a=ri(10,89); b=ri(1,9); }
    else { a=ri(10,89); b=ri(10,99-a<10?10:Math.min(89,99-a)); if(a+b>99){ b=ri(10,99-a); } }
    r=a+b;
  }else if(op==='-'){
    if(lv===1){ a=ri(2,18); b=ri(1,Math.min(9,a-1)); }
    else if(lv===2){ a=ri(11,99); b=ri(1,9); }
    else { a=ri(20,99); b=ri(10,a-1); }
    r=a-b;
  }else{
    var lo=2, hi = lv===1 ? 5 : 9;
    var x=ri(lo,hi), y=ri(1,9);
    if(op==='x'){ if(Math.random()<.5){ a=x; b=y; } else { a=y; b=x; } r=a*b; }
    else { a=x*y; b=x; r=y; }
  }
  var sym={'+':'+','-':'−','x':'×','/':'÷'}[op];
  var cand=[r+1,r-1,r+2,r-2,r+10,r-10];
  if(op==='x'||op==='/'){ cand=cand.concat([r+(op==='x'?b:1), r-(op==='x'?b:1)]); }
  cand=shuffle(cand.filter(function(v,i,arr){ return v>=0 && v!==r && arr.indexOf(v)===i; }));
  return {math:true, text:a+' '+sym+' '+b, a:a, b:b, sym:sym, r:r, choices:shuffle([r,cand[0],cand[1]])};
}
function nextMath(){
  var q=makeMath(), tries=0;
  while(G.last && G.last.text===q.text && tries++<5) q=makeMath();
  G.last=q; G.q={m:q, type:3}; G.locked=false;
  $('pic').hidden=true; $('qInfo').hidden=true; $('expr').hidden=false;
  $('expr').innerHTML='<span>'+q.a+'</span><span class="o">'+q.sym+'</span><span>'+q.b+'</span><span class="o">=</span><span class="qm" id="qm">?</span>';
  var ans=$('answers'); ans.innerHTML='';
  q.choices.forEach(function(v){
    var b=document.createElement('button'); b.className='ans num'; b.textContent=v; b.dataset.v=v;
    b.onclick=function(){ var m=$('qm'); m.textContent=v; m.classList.add(v===q.r?'ok':'ng'); pick(v===q.r, b); };
    ans.appendChild(b);
  });
}
/* ---------- generic subjects: clock / money / length ---------- */

function pickN(arr,n){ var out=[]; shuffle(arr).forEach(function(x){ if(out.length<n && out.indexOf(x)<0) out.push(x); }); return out; }
function distinctKeys(ans, cands, n, keyFn){
  var seen={}; seen[keyFn(ans)]=1; var out=[];
  shuffle(cands).forEach(function(c){ var k=keyFn(c); if(out.length<n && !seen[k]){ seen[k]=1; out.push(c); } });
  return out;
}
/* clock */
function clockLabel(h,m){ return m===0 ? h+'시' : h+'시 '+m+'분'; }
function clockSVG(h,m,cls){
  var t='<svg class="'+(cls||'cpic')+' gpic" viewBox="0 0 120 120" role="img" aria-label="'+clockLabel(h,m)+'">';
  t+='<circle cx="60" cy="60" r="56" fill="#fff" stroke="#3b4a50" stroke-width="4"/>';
  for(var i=0;i<60;i++){ var a=i*6*Math.PI/180, r1=i%5===0?47:51, x1=60+Math.sin(a)*r1, y1=60-Math.cos(a)*r1, x2=60+Math.sin(a)*54, y2=60-Math.cos(a)*54;
    t+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="#3b4a50" stroke-width="'+(i%5===0?2.2:1)+'"/>'; }
  for(var n=1;n<=12;n++){ var b=n*30*Math.PI/180; t+='<text x="'+(60+Math.sin(b)*38).toFixed(1)+'" y="'+(60-Math.cos(b)*38+5).toFixed(1)+'" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="800" font-size="14" fill="#1d3b3a">'+n+'</text>'; }
  var ha=((h%12)+m/60)*30*Math.PI/180, ma=m*6*Math.PI/180;
  t+='<line x1="60" y1="60" x2="'+(60+Math.sin(ha)*27).toFixed(1)+'" y2="'+(60-Math.cos(ha)*27).toFixed(1)+'" stroke="#e0473c" stroke-width="6" stroke-linecap="round"/>';
  t+='<line x1="60" y1="60" x2="'+(60+Math.sin(ma)*44).toFixed(1)+'" y2="'+(60-Math.cos(ma)*44).toFixed(1)+'" stroke="#178a7e" stroke-width="4" stroke-linecap="round"/>';
  t+='<circle cx="60" cy="60" r="4.5" fill="#1d3b3a"/></svg>';
  return t;
}
function genClock(QM){
  var st=GSET.clock, lv=st.l, type=st.t===3?[1,2,4][ri(0,2)]:st.t, h=ri(1,12), m;
  if(type===4) return genClockCalc(QM, lv);
  m = lv===1 ? [0,30][ri(0,1)] : lv===2 ? 5*ri(0,11) : ri(0,59);
  var wrap=function(x){ return ((x-1+12)%12)+1; };
  var c=[];
  c.push([m>=30?wrap(h+1):wrap(h-1), m]);
  var sh = m===0 ? 12 : Math.round(m/5)||12; c.push([sh, (h%12)*5]);
  if(m%5===0 && m>0) c.push([h, m/5]);
  if(lv===1){ c.push([h, m===0?30:0]); c.push([wrap(h+1), m]); }
  else { c.push([h,(m+5)%60]); c.push([h,(m+55)%60]); c.push([h,(m+10)%60]); c.push([wrap(h+1),m]); }
  if(lv===3){ c.push([h,(m+1)%60]); c.push([h,(m+59)%60]); }
  var picks=distinctKeys([h,m], c.filter(function(x){ return x[0]>=1&&x[0]<=12&&x[1]>=0&&x[1]<60; }), 2, function(x){ return x[0]+':'+x[1]; });
  var lab=clockLabel(h,m), all=shuffle([[h,m]].concat(picks));
  var g={gen:'clock', h:h, m:m, label:lab, r:h+':'+m, text:'clock '+lab, ansHTML:lab, recHTML:clockSVG(h,m,'cpic')+'<span>'+lab+'</span>'};
  if(type===1){
    g.prompt=clockSVG(h,m)+'<span class="eq" style="font-family:var(--en);font-weight:900;font-size:32px;color:var(--teal)">=</span><span class="tbox" id="'+QM+'">?</span>';
    g.choices=all.map(function(x){ return {key:x[0]+':'+x[1], html:clockLabel(x[0],x[1])}; });
  }else{
    g.ansHTML=null;
    g.prompt='<div class="col"><span class="bigtxt">'+lab+'</span><span class="read" style="font-size:15px">알맞은 시계를 골라요</span></div>';
    g.choices=all.map(function(x){ return {key:x[0]+':'+x[1], html:clockSVG(x[0],x[1],'cpic'), pic:true}; });
  }
  return g;
}
/* money */
var COIN={10:{r:15,f:'#d9a066',s:'#9a6430'},50:{r:17,f:'#dfe3e6',s:'#8a949a'},100:{r:19,f:'#d4d9dc',s:'#7d878d'},500:{r:22,f:'#eceff1',s:'#7d878d'}};
var BILL={1000:{f:'#a9c8ec',s:'#4f77a6'},5000:{f:'#f2c08f',s:'#b0703a'}};
function won(v){ return v.toLocaleString('ko-KR')+'원'; }
function moneySVG(items){
  var W=300, x=4, y=4, rowH=0, parts=[];
  items.forEach(function(v){
    var w = BILL[v] ? 86 : COIN[v].r*2, hgt = BILL[v] ? 44 : COIN[v].r*2;
    if(x+w>W-4){ x=4; y+=rowH+6; rowH=0; }
    if(BILL[v]){ var bc=BILL[v];
      parts.push('<rect x="'+x+'" y="'+y+'" width="86" height="44" rx="5" fill="'+bc.f+'" stroke="'+bc.s+'" stroke-width="2"/><circle cx="'+(x+66)+'" cy="'+(y+22)+'" r="12" fill="none" stroke="'+bc.s+'" stroke-width="1.5" opacity=".6"/><text x="'+(x+30)+'" y="'+(y+28)+'" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="17" fill="#1d3b3a">'+v+'</text><text x="'+(x+66)+'" y="'+(y+27)+'" text-anchor="middle" font-size="12" font-family="sans-serif" fill="#1d3b3a">원</text>');
    }else{ var cc=COIN[v], cx=x+cc.r, cy=y+cc.r;
      parts.push('<circle cx="'+cx+'" cy="'+cy+'" r="'+(cc.r-1)+'" fill="'+cc.f+'" stroke="'+cc.s+'" stroke-width="2"/><circle cx="'+cx+'" cy="'+cy+'" r="'+(cc.r-5)+'" fill="none" stroke="'+cc.s+'" stroke-width="1" opacity=".5"/><text x="'+cx+'" y="'+(cy+5)+'" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="'+(v>=100?13:14)+'" fill="#1d3b3a">'+v+'</text>');
    }
    x+=w+6; rowH=Math.max(rowH,hgt);
  });
  var H=y+rowH+4, usedW = items.length && y===4 ? x-2 : W;
  return '<svg class="gpic" viewBox="0 0 '+usedW+' '+H+'" role="img" aria-label="동전과 지폐">'+parts.join('')+'</svg>';
}
function genMoney(QM){
  var st=GSET.money, lv=st.l, type=st.t===3?ri(1,2):st.t, g={gen:'money'};
  if(type===1){
    var kinds = lv===1 ? [10,50,100] : lv===2 ? [10,50,100,500,1000] : [10,50,100,500,1000,5000];
    var cnt = lv===1 ? ri(2,6) : ri(3,7), items=[], tot=0, guard=0;
    while(items.length<cnt && guard++<50){ var v=kinds[ri(0,kinds.length-1)]; if(lv===1 && tot+v>500) continue; items.push(v); tot+=v; }
    items.sort(function(a,b){ return b-a; });
    var c=[tot+10,tot-10,tot+50,tot-50,tot+100,tot-100];
    items.forEach(function(v){ c.push(tot-v); c.push(tot+v); });
    var picks=distinctKeys(tot, c.filter(function(v){ return v>0; }), 2, String);
    g.r=String(tot); g.text='money '+items.join('+'); g.ansHTML=won(tot); g.label=won(tot); g.svg=moneySVG(items);
    g.prompt='<div class="gcol">'+moneySVG(items)+'<div class="grow">모두 얼마일까요? <span class="tbox" id="'+QM+'">?</span></div></div>';
    g.recHTML=moneySVG(items).replace('class="gpic"','class="gpic" style="height:36px;width:auto"')+'<span>= '+won(tot)+'</span>';
    g.choices=shuffle([tot].concat(picks)).map(function(v){ return {key:String(v), html:won(v)}; });
  }else{
    var ITEMS=[['🍪','과자를'],['🍭','사탕을'],['🧃','주스를'],['✏️','연필을'],['🍦','아이스크림을'],['📒','공책을'],['🧸','인형을'],['🍞','빵을']];
    var it=ITEMS[ri(0,ITEMS.length-1)], pay, price;
    if(lv===1){ pay=[100,500][ri(0,1)]; price = pay===100 ? 10*ri(1,9) : 10*ri(5,45); }
    else if(lv===2){ pay=1000; price=10*ri(10,95); }
    else { pay=5000; price=10*ri(100,480); }
    var ch=pay-price;
    var c2=[price, ch+10, ch-10, ch+100, ch-100, ch+50, ch-50];
    var picks2=distinctKeys(ch, c2.filter(function(v){ return v>0; }), 2, String);
    g.r=String(ch); g.text='change '+pay+'-'+price; g.ansHTML=won(ch); g.label=won(ch);
    g.prompt='<span class="gemoji">'+it[0]+'</span><div class="gtext"><b>'+won(pay)+'</b>을 내고 <b>'+won(price)+'</b>짜리 '+it[1]+' 샀어요.<br>거스름돈은? <span class="tbox" id="'+QM+'">?</span></div>';
    g.recHTML='<span>'+it[0]+' '+won(pay)+' − '+won(price)+' = '+won(ch)+'</span>';
    g.choices=shuffle([ch].concat(picks2)).map(function(v){ return {key:String(v), html:won(v)}; });
  }
  return g;
}
/* length */
function rulerSVG(start,len,obj){
  var u=20, x0=12, W=x0*2+15*u, t='<svg class="gpic" viewBox="0 0 '+W+' 86" role="img" aria-label="자">';
  var a=x0+start*u, b=x0+(start+len)*u, col=['#ffd966','#7fd1c7','#ff8fa3','#a8c8ff'][obj%4];
  if(obj%2===0){ t+='<rect x="'+a+'" y="10" width="'+Math.max(4,b-a-12)+'" height="16" fill="'+col+'" stroke="#3b4a50" stroke-width="1.6"/><polygon points="'+(b-12)+',10 '+b+',18 '+(b-12)+',26" fill="#f4d7b5" stroke="#3b4a50" stroke-width="1.6"/><polygon points="'+(b-4)+',16 '+b+',18 '+(b-4)+',20" fill="#3b4a50"/>'; }
  else { t+='<rect x="'+a+'" y="10" width="'+(b-a)+'" height="16" rx="8" fill="'+col+'" stroke="#3b4a50" stroke-width="1.6"/>'; }
  t+='<line x1="'+a+'" y1="26" x2="'+a+'" y2="40" stroke="#e0473c" stroke-width="1.4" stroke-dasharray="3 2"/><line x1="'+b+'" y1="26" x2="'+b+'" y2="40" stroke="#e0473c" stroke-width="1.4" stroke-dasharray="3 2"/>';
  t+='<rect x="2" y="40" width="'+(W-4)+'" height="42" rx="4" fill="#fff3c4" stroke="#b8902e" stroke-width="1.6"/>';
  for(var i=0;i<=15;i++){ var x=x0+i*u; t+='<line x1="'+x+'" y1="40" x2="'+x+'" y2="56" stroke="#5a4100" stroke-width="1.4"/><text x="'+x+'" y="72" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="800" font-size="12" fill="#1d3b3a">'+i+'</text>';
    if(i<15) t+='<line x1="'+(x+u/2)+'" y1="40" x2="'+(x+u/2)+'" y2="49" stroke="#5a4100" stroke-width="1"/>'; }
  return t+'</svg>';
}
function genLength(QM){
  var st=GSET.length, lv=st.l, type=st.t===3?[1,2,4][ri(0,2)]:st.t, g={gen:'length'};
  if(type===4) return genLengthCalc(QM, lv);
  if(type===1){
    var start = lv===3 ? ri(1,5) : 0, len = lv===1 ? ri(1,10) : lv===2 ? ri(2,15) : ri(2,15-start), obj=ri(0,3);
    if(start+len>15) len=15-start;
    var c=[len+1,len-1,len+2,len-2]; if(start>0){ c.push(start+len); c.push(start+len); }
    var picks=distinctKeys(len, c.filter(function(v){ return v>0 && v<=15; }), 2, String);
    var name = obj%2===0 ? '연필' : '막대';
    g.r=String(len); g.text='ruler '+start+'+'+len; g.ansHTML=len+'cm'; g.label=len+'cm';
    g.prompt='<div class="gcol">'+rulerSVG(start,len,obj)+'<div class="grow">'+name+'의 길이는? <span class="tbox" id="'+QM+'">?</span></div></div>';
    g.recHTML=rulerSVG(start,len,obj).replace('class="gpic"','class="gpic" style="height:34px;width:auto"')+'<span>'+len+'cm</span>';
    g.choices=shuffle([len].concat(picks)).map(function(v){ return {key:String(v), html:v+'cm'}; });
  }else{
    var mode = lv===1 ? ri(1,2) : lv===2 ? 3 : ri(3,4), q, ans, cands, fmt;
    if(mode===1){ var mm=ri(1,9); q=mm+'m = ? cm'; ans=mm*100; cands=[mm*10, mm, mm*1000, mm*100+10]; fmt=function(v){ return v+'cm'; }; }
    else if(mode===2){ var mm2=ri(1,9); q=(mm2*100)+'cm = ? m'; ans=mm2; cands=[mm2*10, mm2*100, mm2+1, mm2-1].filter(function(v){ return v>0; }); fmt=function(v){ return v+'m'; }; }
    else if(mode===3){ var a1=ri(1,4), c1=ri(1,9)*10+ri(0,9); if(c1<10) c1+=10; q=a1+'m '+c1+'cm = ? cm'; ans=a1*100+c1; cands=[a1*1000+c1, a1*10+c1, ans+10, ans-10, ans+1, a1+c1]; fmt=function(v){ return v+'cm'; }; }
    else { var a2=ri(1,4), c2=ri(11,99); var tot=a2*100+c2; q=tot+'cm = ?'; ans=a2+'m '+c2+'cm';
      cands=[Math.floor(tot/10)+'m '+(tot%10)+'cm', a2+'m '+Math.floor(c2/10)+'cm', (a2*10)+'m '+c2+'cm', (a2+1)+'m '+c2+'cm']; fmt=function(v){ return v; }; }
    var picks2=distinctKeys(ans, cands, 2, String);
    var parts=q.split('?');
    g.r=String(ans); g.text='conv '+q; g.ansHTML=fmt(ans); g.label=fmt(ans);
    g.pa=q.split(' = ')[0]; g.pb=fmt(ans);
    var mm_=/(\d+)m(?!m)/.exec(g.pa.replace(/cm/g,'')), cc_=/(\d+)cm/.exec(g.pa); g.cm=(mm_?(+mm_[1])*100:0)+(cc_?+cc_[1]:0);
    g.prompt='<div class="bigtxt" style="font-size:30px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center">'+parts[0]+'<span class="tbox" id="'+QM+'">?</span>'+parts[1]+'</div>';
    g.recHTML='<span>'+q.replace('?', fmt(ans).replace(/(cm|m)$/,'').trim()===String(ans) ? String(ans) : fmt(ans))+'</span>';
    if(mode===4) g.recHTML='<span>'+tot+'cm = '+ans+'</span>';
    else g.recHTML='<span>'+parts[0]+ans+parts[1]+'</span>';
    g.choices=shuffle([ans].concat(picks2)).map(function(v){ return {key:String(v), html:fmt(v)}; });
  }
  return g;
}
function durTxt(d){ var a=Math.abs(d), hh=Math.floor(a/60), mm=a%60; return (hh?hh+'시간':'')+(hh&&mm?' ':'')+(mm?mm+'분':''); }
function genClockCalc(QM, lv){
  var h=ri(1,12), m, d;
  if(lv===1){ m=[0,30][ri(0,1)]; d=[30,60,90,120][ri(0,3)]; }
  else if(lv===2){ m=5*ri(0,11); d=(Math.random()<.65?1:-1)*5*ri(2,22); }
  else { m=ri(0,59); d=(Math.random()<.6?1:-1)*ri(5,150); }
  var t0=h*60+m, toHM=function(t){ t=((t%720)+720)%720; var hh=Math.floor(t/60); return [hh===0?12:hh, t%60]; };
  var ans=toHM(t0+d), wrap=function(x){ return ((x-1+12)%12)+1; };
  var c=[toHM(t0-d), [h, ans[1]], [wrap(ans[0]+1), ans[1]], [wrap(ans[0]-1), ans[1]], [ans[0], (ans[1]+10)%60], [ans[0], (ans[1]+50)%60]];
  if(lv===1) c.push([ans[0], ans[1]===0?30:0]);
  var picks=distinctKeys(ans, c, 2, function(x){ return x[0]+':'+x[1]; });
  var lab0=clockLabel(h,m), lab=clockLabel(ans[0],ans[1]), dt=durTxt(d)+(d>0?' 후':' 전');
  var g={gen:'clock', calc:true, h:ans[0], m:ans[1], label:lab, r:ans[0]+':'+ans[1], text:'calc '+lab0+' '+d, ansHTML:lab};
  g.recHTML=clockSVG(h,m,'cpic')+'<span>'+lab0+'에서 '+dt+' → '+lab+'</span>';
  g.prompt=clockSVG(h,m)+'<div class="gtext"><b>'+lab0+'</b>에서<br><b>'+dt+'</b>는 몇 시 몇 분?<br><span class="tbox" id="'+QM+'">?</span></div>';
  g.choices=shuffle([ans].concat(picks)).map(function(x){ return {key:x[0]+':'+x[1], html:clockLabel(x[0],x[1])}; });
  return g;
}
function fmtL(cm){ var mm=Math.floor(cm/100), cc=cm%100; return mm ? mm+'m'+(cc?' '+cc+'cm':'') : cc+'cm'; }
function genLengthCalc(QM, lv){
  var a, b, plus=Math.random()<.55, ans, c=[];
  if(lv===1){
    if(plus){ a=ri(10,80); b=ri(5,99-a); } else { a=ri(20,99); b=ri(5,a-5); }
  }else if(lv===2){
    var m1=ri(1,5), m2=ri(1,4), c1=ri(0,9)*10+ri(0,9), c2;
    if(plus){ c2=ri(0,99-c1); a=m1*100+c1; b=m2*100+c2; }
    else { if(m2>=m1) m2=m1-1>0?m1-1:0; if(m1<2){ m1=2; } c2=ri(0,c1); a=m1*100+c1; b=m2*100+c2; if(b<=0) b=ri(10,c1>10?c1:10); if(b>=a) b=a-ri(5,20); }
  }else{
    var n1=ri(1,6), n2=ri(1,5), d1=ri(10,95), d2;
    if(plus){ d2=ri(Math.max(5,100-d1+1),95); a=n1*100+d1; b=n2*100+d2; }
    else { if(n1<2) n1=2; n2=ri(0,n1-1); d2=ri(d1+1>95?95:d1+1,99); a=n1*100+d1; b=n2*100+d2; if(b>=a) b=a-ri(20,60); }
  }
  ans = plus ? a+b : a-b;
  var am=Math.floor(a/100), bm=Math.floor(b/100), ac=a%100, bc=b%100;
  if(plus){ c.push((am+bm)*100+((ac+bc)%100)); c.push(ans+100); c.push(ans-10); c.push(ans+10); c.push(a-b); }
  else { c.push((am-bm)*100+Math.abs(ac-bc)); c.push(ans+100); c.push(ans-100); c.push(ans+10); c.push(a+b); }
  var picks=distinctKeys(ans, c.filter(function(v){ return v>0; }), 2, String);
  while(picks.length<2){ var v=ans+10*ri(-5,5); if(v>0 && v!==ans && picks.indexOf(v)<0) picks.push(v); }
  var q=fmtL(a)+(plus?' + ':' − ')+fmtL(b);
  var g={gen:'length', r:String(ans), text:'lcalc '+q, ansHTML:fmtL(ans), label:fmtL(ans), pa:q, pb:fmtL(ans), cm:ans};
  g.prompt='<div class="bigtxt" style="font-size:clamp(22px,6vw,28px);display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;text-align:center">'+q+' =<span class="tbox" id="'+QM+'">?</span></div>';
  g.recHTML='<span>'+q+' = '+fmtL(ans)+'</span>';
  g.choices=shuffle([ans].concat(picks)).map(function(v){ return {key:String(v), html:fmtL(v)}; });
  return g;
}
function hzPool(){ var lv=GSET.hanja.l; return HANJA.filter(function(x){ return x.g<=lv; }); }
function hzSound(x){ return x.m.split(' ').pop(); }
function genHanja(QM){
  var st=GSET.hanja, type=st.t===3?ri(1,2):st.t, pool=hzPool(), x=pool[ri(0,pool.length-1)];
  var snd=hzSound(x), same=shuffle(pool.filter(function(y){ return y!==x && hzSound(y)===snd; }));
  var others=shuffle(pool.filter(function(y){ return y!==x && hzSound(y)!==snd; }));
  var picks=same.slice(0,1).concat(others).slice(0,2);
  var all=shuffle([x].concat(picks));
  var g={gen:'hanja', r:x.h, text:'hz '+x.h+type, label:x.h+' '+x.m, ansHTML: type===1 ? x.m : '<span class="hz">'+x.h+'</span>', hz:x};
  g.recHTML='<span class="hz">'+x.h+'</span><span>'+x.m+'</span>';
  if(type===1){
    g.prompt='<span class="hz hzbig">'+x.h+'</span><div class="gtext">이 한자의<br><b>뜻과 소리</b>는?<br><span class="tbox" id="'+QM+'">?</span></div>';
    g.choices=all.map(function(y){ return {key:y.h, html:y.m}; });
  }else{
    g.prompt='<div class="gtext" style="text-align:center"><span class="bigtxt">'+x.m+'</span><br>알맞은 한자는?</div><span class="tbox" id="'+QM+'" style="min-width:76px;min-height:76px;font-size:44px">?</span>';
    g.choices=all.map(function(y){ return {key:y.h, html:'<span class="hz">'+y.h+'</span>', hz:true}; });
  }
  return g;
}
var GEN = {clock:genClock, money:genMoney, length:genLength, hanja:genHanja};
function nextGeneric(){
  var g=GEN[G.kind]('qm'), tries=0;
  while(G.last && G.last.text===g.text && tries++<6) g=GEN[G.kind]('qm');
  G.last=g; G.q={m:g, type:3}; G.locked=false;
  $('pic').hidden=true; $('qInfo').hidden=true; $('expr').hidden=false;
  var ex=$('expr'); ex.className='fexpr'; ex.innerHTML=g.prompt;
  var ans=$('answers'); ans.innerHTML='';
  g.choices.forEach(function(c){
    var b=document.createElement('button'); b.className=c.pic?'ans pa':(c.hz?'ans ta hzans':'ans ta'); b.dataset.v=c.key; b.innerHTML=c.html;
    b.onclick=function(){ var m=$('qm'); if(m){ m.innerHTML=c.html; m.classList.add(c.key===g.r?'ok':'ng'); } pick(c.key===g.r, b); };
    ans.appendChild(b);
  });
}

/* ---------- fractions ---------- */
var F_ON='#ffb347', F_OFF='#ffffff', F_LINE='#3b4a50';
function fracSVG(k,n,shape){
  var h='';
  if(shape==='pie'){
    var R=46, C=50;
    if(n===1){ h='<circle cx="50" cy="50" r="46" fill="'+(k?F_ON:F_OFF)+'"/>'; }
    for(var i=0;i<n;i++){
      var a0=-Math.PI/2+i*2*Math.PI/n, a1=a0+2*Math.PI/n;
      var x0=(C+R*Math.cos(a0)).toFixed(2), y0=(C+R*Math.sin(a0)).toFixed(2), x1=(C+R*Math.cos(a1)).toFixed(2), y1=(C+R*Math.sin(a1)).toFixed(2);
      h+='<path d="M50 50 L'+x0+' '+y0+' A46 46 0 0 1 '+x1+' '+y1+' Z" fill="'+(i<k?F_ON:F_OFF)+'" stroke="'+F_LINE+'" stroke-width="2.2" stroke-linejoin="round"/>';
    }
    return '<svg class="fpic" viewBox="0 0 100 100" role="img" aria-label="'+n+'등분 중 '+k+'칸 색칠"><g>'+h+'</g><circle cx="50" cy="50" r="46" fill="none" stroke="'+F_LINE+'" stroke-width="3"/></svg>';
  }
  var W=140, H=56, x=4, w=(W-8)/n;
  for(var j=0;j<n;j++){ h+='<rect x="'+(x+j*w).toFixed(2)+'" y="4" width="'+w.toFixed(2)+'" height="'+(H-8)+'" fill="'+(j<k?F_ON:F_OFF)+'" stroke="'+F_LINE+'" stroke-width="2.2"/>'; }
  return '<svg class="fpic" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+n+'등분 중 '+k+'칸 색칠">'+h+'<rect x="4" y="4" width="'+(W-8)+'" height="'+(H-8)+'" fill="none" stroke="'+F_LINE+'" stroke-width="3" rx="3"/></svg>';
}
function fracHTML(k,n){ return '<span class="frac"><span>'+k+'</span><span>'+n+'</span></span>'; }
function equivSVG(a,b,d,showBottom){
  var W=160, bh=26, gap=10, H=showBottom ? bh*2+gap+8 : bh+8, h='';
  function bar(y,n,k){ var w=(W-8)/n, t=''; for(var j=0;j<n;j++) t+='<rect x="'+(4+j*w).toFixed(2)+'" y="'+y+'" width="'+w.toFixed(2)+'" height="'+bh+'" fill="'+(j<k?F_ON:F_OFF)+'" stroke="'+F_LINE+'" stroke-width="1.8"/>';
    return t+'<rect x="4" y="'+y+'" width="'+(W-8)+'" height="'+bh+'" fill="none" stroke="'+F_LINE+'" stroke-width="2.6" rx="2"/>'; }
  h+=bar(4,b,a);
  if(showBottom) h+=bar(4+bh+gap,d,0);
  return '<svg class="eqsvg fpic" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+b+'등분 중 '+a+'칸">'+h+'</svg>';
}
function makeEquiv(){
  var bs = cfg.flv===1 ? [2,3,4] : [2,3,4,5,6], maxD = cfg.flv===1 ? 8 : 12, b, m, d, tries=0;
  do{ b=bs[ri(0,bs.length-1)]; m=ri(2,4); d=b*m; }while(d>maxD && tries++<60);
  if(d>maxD){ b=2; m=2; d=4; }
  var a=ri(1,b-1), A=a*m, form=Math.random()<.5?'num':'pick';
  var o={frac:true, equiv:true, k:a, n:b, d:d, type:3, form:form, shape:'bar'};
  o.text='equiv '+a+'/'+b+'='+A+'/'+d+' '+form;
  o.label=a+'/'+b+'='+A+'/'+d;
  o.recHTML='<span style="display:flex;align-items:center;gap:6px">'+fracHTML(a,b)+'<b>=</b>'+fracHTML(A,d)+'</span><span>크기가 같은 분수</span>';
  if(form==='num'){
    o.r=String(A); o.ansHTML=String(A);
    var c=[a, A+1, A-1, a+m, d-A, A+2, b].filter(function(v){ return v>0 && v<d; });
    var picks=distinctKeys(A, c, 2, String);
    while(picks.length<2){ var v=ri(1,d-1); if(v!==A && picks.indexOf(v)<0) picks.push(v); }
    o.choices=shuffle([A].concat(picks)).map(function(v){ return {key:String(v), num:v, html:'<span class="mt-en" style="font-size:30px">'+v+'</span>'}; });
    o.promptHTML=function(QM){ return equivSVG(a,b,d,true)+'<div class="eqrow">'+fracHTML(a,b)+'<span>=</span><span class="frac"><span><span class="eqbox" id="'+QM+'">?</span></span><span>'+d+'</span></span></div>'; };
  }else{
    o.r=A+'/'+d; o.ansHTML=fracHTML(A,d);
    var val=a/b, cc=[[a,d],[A+1,d],[A-1,d],[a+m,b+m],[a+1,b+1],[A,d+1],[A,d-1]].filter(function(x){ return x[0]>=1 && x[0]<x[1] && x[1]<=12 && Math.abs(x[0]/x[1]-val)>1e-9; });
    var picks2=distinctKeys([A,d], cc, 2, function(x){ return x[0]+'/'+x[1]; });
    o.choices=shuffle([[A,d]].concat(picks2)).map(function(x){ return {key:x[0]+'/'+x[1], html:fracHTML(x[0],x[1])}; });
    o.promptHTML=function(){ return equivSVG(a,b,d,false)+'<div class="col"><span class="bigfrac">'+fracHTML(a,b)+'</span><span class="read" style="font-size:15px">와 크기가 같은 분수는?</span></div>'; };
  }
  return o;
}
function makeFrac(){
  var dens = cfg.flv===1 ? [2,3,4] : [2,3,4,5,6,8];
  var n = dens[Math.floor(Math.random()*dens.length)], k = ri(1,n-1);
  var type = cfg.fm===3 ? [1,2,3][ri(0,2)] : cfg.fm===4 ? 3 : cfg.fm;
  if(type===3) return makeEquiv();
  var shape = Math.random()<.55 ? 'pie' : 'bar';
  var val = k/n, cands=[];
  function add(a,b){ if(b>=2 && b<=8 && a>=1 && a<b) cands.push([a,b]); }
  add(n-k,n); add(k,n+1); add(k,n-1); add(k,n-k); add(k+1,n); add(k-1,n); add(n-k,n+1);
  dens.forEach(function(d){ add(ri(1,d-1),d); });
  var picks=[], vals=[val];
  shuffle(cands).forEach(function(c){
    var v=c[0]/c[1];
    if(picks.length<2 && !vals.some(function(x){ return Math.abs(x-v)<1e-9; })){ picks.push(c); vals.push(v); }
  });
  while(picks.length<2){ var d=dens[Math.floor(Math.random()*dens.length)], a=ri(1,d-1), v=a/d;
    if(!vals.some(function(x){ return Math.abs(x-v)<1e-9; })){ picks.push([a,d]); vals.push(v); } }
  return {frac:true, k:k, n:n, type:type, shape:shape, r:k+'/'+n, text:n+'분의 '+k,
          choices:shuffle([[k,n]].concat(picks))};
}
function nextFrac(){
  var q=makeFrac(), tries=0;
  while(G.last && G.last.r===q.r && G.last.type===q.type && tries++<5) q=makeFrac();
  G.last=q; G.q={m:q, type:3}; G.locked=false;
  $('pic').hidden=true; $('qInfo').hidden=true; $('expr').hidden=false;
  var ex=$('expr'); ex.className='fexpr';
  var ans=$('answers'); ans.innerHTML='';
  if(q.type===3){
    ex.innerHTML=q.promptHTML('qm');
    q.choices.forEach(function(c){
      var b=document.createElement('button'); b.className= q.form==='num' ? 'ans num' : 'ans fa'; b.dataset.v=c.key; b.innerHTML=c.html;
      b.onclick=function(){ var m=$('qm'); if(m){ m.textContent=c.key; m.classList.add(c.key===q.r?'ok':'ng'); } pick(c.key===q.r, b); };
      ans.appendChild(b);
    });
    return;
  }
  if(q.type===1){
    ex.innerHTML=fracSVG(q.k,q.n,q.shape)+'<span class="eq">=</span><span class="fbox" id="qm">?</span>';
    q.choices.forEach(function(c){
      var b=document.createElement('button'); b.className='ans fa'; b.dataset.v=c[0]+'/'+c[1]; b.innerHTML=fracHTML(c[0],c[1]);
      b.setAttribute('aria-label', c[1]+'분의 '+c[0]);
      b.onclick=function(){ var m=$('qm'); m.innerHTML=fracHTML(c[0],c[1]); m.classList.add(b.dataset.v===q.r?'ok':'ng'); pick(b.dataset.v===q.r, b); };
      ans.appendChild(b);
    });
  }else{
    ex.innerHTML='<div class="col"><span class="bigfrac">'+fracHTML(q.k,q.n)+'</span><span class="read">'+q.text+'</span></div><span class="read" style="font-size:16px">알맞은 그림을<br>골라요</span>';
    q.choices.forEach(function(c){
      var b=document.createElement('button'); b.className='ans pa'; b.dataset.v=c[0]+'/'+c[1]; b.innerHTML=fracSVG(c[0],c[1],q.shape);
      b.onclick=function(){ pick(b.dataset.v===q.r, b); };
      ans.appendChild(b);
    });
  }
}
function wordDistractors(w,n){
  var others = shuffle(WORDS.filter(function(x){ return x!==w; }));
  var same = others.filter(function(x){ return cfg.letters.has(GL(x)); });
  var picks=[]; if(same.length) picks.push(same[0]);
  others.forEach(function(x){ if(picks.length<n && picks.indexOf(x)<0) picks.push(x); });
  return picks.slice(0,n);
}
function nextQ(){
  $('expr').className='expr'; $('pic').classList.remove('listen');
  if(GEN[G.kind]){ nextGeneric(); return; }
  if(G.kind==='frac'){ nextFrac(); return; }
  if(G.kind==='math'){ nextMath(); return; }
  $('pic').hidden=false; $('qInfo').hidden=false; $('expr').hidden=true;
  if(!G.deck.length){ G.deck = shuffle(G.pool); if(G.deck[0]===G.last && G.deck.length>1) G.deck.push(G.deck.shift()); }
  var w = G.deck.shift(); G.last=w;
  var type = cfg.mode===3 ? [1,2,4][Math.floor(Math.random()*3)] : cfg.mode;
  G.q = {w:w, type:type}; G.locked=false;
  $('picImg').src = IMG[w.w]||''; $('picImg').alt = type===4 ? '' : w.ko;
  $('pic').classList.toggle('listen', type===4);
  $('qKo').textContent = type===4 ? '' : w.ko; $('qKo').style.fontSize = type===4 ? '15px' : '';
  var ans=$('answers'); ans.innerHTML='';
  if(type===4){
    $('qType').textContent='🔊 잘 듣고 알맞은 그림을 골라요';
    $('qKo').textContent='다시 들으려면 🔊를 눌러요';
    $('qBlank').hidden=true;
    shuffle([w].concat(wordDistractors(w,2))).forEach(function(o){
      var b=document.createElement('button'); b.className='ans pa'; b.dataset.w=o.w;
      b.innerHTML='<img src="'+(IMG[o.w]||'')+'" alt="" style="height:100%;width:auto;max-width:100%;object-fit:contain">';
      b.onclick=function(){ pick(o===w, b); };
      ans.appendChild(b);
    });
    var tk0=G.token; setTimeout(function(){ if(G.token===tk0 && G.q.w===w) speak(w.w); }, 250);
  }else if(type===1){
    $('qType').textContent='그림에 맞는 단어는?';
    $('qBlank').hidden=true;
    shuffle([w].concat(wordDistractors(w,2))).forEach(function(o){
      var b=document.createElement('button'); b.className='ans'; b.dataset.w=o.w;
      b.innerHTML='<span class="f">'+o.w[0]+'</span>'+o.w.slice(1);
      b.onclick=function(){ pick(o===w, b); };
      ans.appendChild(b);
    });
  }else{
    $('qType').textContent= w.l ? '빈칸에 들어갈 글자는? 🔊' : '첫 글자는? 🔊 그림을 눌러 들어 봐요';
    $('qBlank').hidden=false;
    $('qBlank').innerHTML=blankHTML(w,'slot','&nbsp;');
    var keyset=[GL(w)].concat(shuffle(LETTERS.filter(function(l){ return l!==GL(w); })).slice(0,3)).sort();
    keyset.forEach(function(k){
      var b=document.createElement('button'); b.className='ans key'; b.textContent=k; b.dataset.k=k;
      b.onclick=function(){ typeKey(k, b); };
      ans.appendChild(b);
    });
  }
}
function typeKey(k, btn){
  if(G.locked||G.over) return;
  var s=$('slot'); s.textContent=k;
  var ok = k===GL(G.q.w); s.classList.add(ok?'ok':'ng');
  pick(ok, btn);
}
function pick(ok, btn){
  if(G.locked||G.over) return; G.locked=true;
  var isM = G.kind!=='word', w=isM?null:G.q.w, mq=isM?G.q.m:null, tk=G.token;
  if(ok){
    btn.classList.add('ok'); sfx('ok'); if(!isM) speak(w.w);
    G.combo++; G.maxCombo=Math.max(G.maxCombo,G.combo);
    if(G.combo%5===0) giveItem();
    G.time = Math.min(100, G.time + 26 + Math.min(10, G.combo));
    G.mode==='tower' ? towerAdd() : climb();
    if(G.combo>=3){ var c=$('combo'); c.textContent=G.combo+' COMBO!'; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
    setTimeout(function(){ if(tk===G.token && !G.over) nextQ(); }, 380);
  }else{
    btn.classList.add('ng'); sfx('ng');
    G.combo=0; $('combo').textContent='';
    if(!useShield()){ G.time = Math.max(0, G.time - 18); if(G.mode==='tower') towerHit(); }
    var wk = isM ? mq : w; if(!G.wrong.some(function(x){ return isM ? (x.text===mq.text && x.r===mq.r) : x===w; })) G.wrong.push(wk);
    G.world.p.mood='sad';
    var q=$('quiz'); q.classList.remove('shake'); void q.offsetWidth; q.classList.add('shake');
    document.querySelectorAll('.ans').forEach(function(b){ if(isM ? String(b.dataset.v)===String(mq.r) : (b.dataset.w===w.w || b.dataset.k===GL(w))) b.classList.add('ok'); });
    if(isM) setTimeout(function(){ if(tk===G.token){ var m=$('qm'); if(m){ m.classList.remove('ng'); m.classList.add('ok'); if(mq.gen) m.innerHTML=mq.ansHTML||''; else if(mq.frac) m.innerHTML=(mq.equiv?mq.ansHTML:fracHTML(mq.k,mq.n)); else m.textContent=mq.r; } } }, 500);
    if(G.q.type===2){ setTimeout(function(){ if(tk===G.token){ var s=$('slot'); if(s){ s.className='slot ok'; s.textContent=GL(w); } } }, 500); }
    if(!isM) setTimeout(function(){ if(tk===G.token) speak(w.w); }, 300);
    G.pauseUntil = performance.now() + 1300;
    setTimeout(function(){ if(tk===G.token && !G.over){ G.world.p.mood=''; nextQ(); } }, 1400);
  }
}
function drawTHearts(n){ var h=''; for(var i=0;i<3;i++) h+='<span class="'+(i<n?'':'off')+'">❤️</span>'; $('tHearts').innerHTML=h; }
function qLabel(){
  if(G.kind==='word') return G.q.w.w;
  var q=G.q.m; if(q.label) return q.label;
  if(q.frac) return q.k+'/'+q.n;
  return (q.text+'='+q.r).replace(/ /g,'');
}
var TCOL=['#e0605a','#5fa883','#f0c25a','#f6ecd2','#f2a0a0','#9fc7e0'];
function towerAdd(){
  G.floor++; $('floorN').textContent=G.floor;
  G.blocks.push({label:qLabel(), col: G.floor%10===0 ? '#ffc21a' : TCOL[G.floor%TCOL.length], off:(Math.random()*2-1)*7, drop:performance.now()});
  G.sway.v += (Math.random()*2-1)*0.08;
  if(G.floor%10===0){ sfx('lvl'); banner(G.floor+'층 탑 완성!'); }
}
function towerHit(){
  G.lives--; drawTHearts(G.lives);
  var h=$('tHearts'); h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit');
  G.sway.v += (Math.random()<.5?-1:1)*(0.55+0.25*(3-G.lives));
  if(G.lives<=0){ var tk=G.token; setTimeout(function(){ if(G.token===tk) gameOver(); }, 450); }
}
function rrect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function towerStep(ts,dt){
  var sw=G.sway; sw.v += (-22*sw.a - 2.6*sw.v)*dt; sw.a += sw.v*dt;
  var cv=$('cv'), dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  if(cv.width!==Math.round(W*dpr) || cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  var n=G.blocks.length, BW=Math.min(150, W*0.46), BH=Math.max(28, Math.min(38, H/12));
  var sky=skyAt(Math.min(90, n*1.5)), g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,sky[0]); g.addColorStop(1,sky[1]); c.fillStyle=g; c.fillRect(0,0,W,H);
  if(sky[2]>0.45){ c.fillStyle='rgba(255,255,255,'+Math.min(1,(sky[2]-.45)*2)+')'; stars.forEach(function(st){ c.beginPath(); c.arc(st[0]*W, st[1]*H, st[2], 0, 7); c.fill(); }); }
  var target=Math.max(0, (n+2)*BH - H*0.62); G.cam += (target-G.cam)*0.12;
  var groundY=H-26+G.cam, cx=W/2;
  if(groundY<H){ if(XM){ c.fillStyle='#ffffff'; c.fillRect(0,groundY,W,H-groundY+2); c.fillStyle='#1b1a17'; c.fillRect(0,groundY,W,2); } else { c.fillStyle='#7ccf6e'; c.fillRect(0,groundY,W,H-groundY+2); c.fillStyle='#5fb653'; c.fillRect(0,groundY,W,5); } }
  var col=G.collapse ? (ts-G.collapse.t0)/1000 : 0, topX=cx, topY=groundY;
  c.textAlign='center'; c.textBaseline='middle';
  for(var i=0;i<n;i++){
    var b=G.blocks[i], by=groundY-(i+1)*BH, hgt=(i+1)*BH;
    var dk=Math.min(1,(ts-b.drop)/380); if(dk<1){ by -= Math.pow(1-dk,2)*220; }
    var dx=Math.sin(sw.a)*hgt*0.85, rot=sw.a*0.5;
    if(G.collapse){ dx += b.vx*col*70*(0.4+i/Math.max(1,n)); by += 0.5*1100*col*col*(0.35+0.65*i/Math.max(1,n)); rot += b.vr*col; }
    var x=cx+b.off+dx;
    if(by<-BH*2 || by>H+BH*2) { if(i===n-1){ topX=x; topY=by; } continue; }
    c.save(); c.translate(x, by+BH/2); c.rotate(rot);
    c.fillStyle='rgba(0,0,0,.15)'; rrect(c,-BW/2+3,-BH/2+4,BW,BH-2,7); c.fill();
    c.fillStyle=b.col; rrect(c,-BW/2,-BH/2,BW,BH-2,7); c.fill();
    if(XM){ var rib = (b.col==='#e0605a'||b.col==='#f2a0a0') ? '#f6ecd2' : '#c8312f';
    c.fillStyle=rib; c.fillRect(-BW/2+14,-BH/2,8,BH-2);
    c.beginPath(); c.ellipse(-BW/2+12,-BH/2+1,7,4,-.5,0,7); c.ellipse(-BW/2+24,-BH/2+1,7,4,.5,0,7); c.fill();
    c.strokeStyle='#1b1a17'; c.lineWidth=1.6; rrect(c,-BW/2,-BH/2,BW,BH-2,7); c.stroke(); }
    c.fillStyle='rgba(255,255,255,.45)'; rrect(c,-BW/2+4,-BH/2+3,BW-8,5,3); c.fill();
    c.fillStyle='#1d3b3a'; var fs=15; c.font='800 '+fs+'px Nunito, "Apple SD Gothic Neo", sans-serif';
    while(fs>10 && c.measureText(b.label).width>BW-14){ fs--; c.font='800 '+fs+'px Nunito, "Apple SD Gothic Neo", sans-serif'; }
    c.fillText(b.label, 0, 1);
    if((i+1)%10===0){ c.font='900 11px Nunito, sans-serif'; c.textAlign='left'; c.fillText((i+1)+'', -BW/2+6, 1); c.textAlign='center'; }
    c.restore();
    if(i===n-1){ topX=x; topY=by; }
  }
  var hy=topY, hx=topX, hrot=0;
  if(G.collapse){ hy += 0.5*1300*col*col; hx += 40*col; hrot=col*5; }
  drawHero(c, hx, hy, Math.min(26, BW*0.17), 1, G.world.p.mood, hrot + (G.collapse?0:sw.a*0.6));
}
function climb(){
  var p=G.world.p, from={x:p.x,f:p.f}, toF=G.floor+1, to={x:G.world.steps[toF].x, f:toF};
  p.face = to.x>from.x?1:-1;
  G.floor=toF; $('floorN').textContent=G.floor;
  G.anim={from:from,to:to,t0:performance.now(),dur:170};
  if(G.floor%10===0){ sfx('lvl'); banner(G.floor+'층 돌파!'); }
}
function banner(t){ var b=document.createElement('div'); b.className='banner'; b.textContent=t; $('bannerBox').innerHTML=''; $('bannerBox').appendChild(b); }

function loop(ts){
  if(!G || G.token===undefined) return;
  var tk=G.token;
  var dt=Math.min(.1,(ts-G.lastTs)/1000); G.lastTs=ts;
  var p=G.world.p;
  if(G.mode==='tower'){
    towerStep(ts,dt);
    if(G.collapse && ts-G.collapse.t0>1900){ finish(); return; }
    if(tk===G.token && !$('game').hidden) requestAnimationFrame(loop);
    return;
  }
  if(!G.over){
    if(ts>G.pauseUntil && !G.locked) G.time -= drainRate()*dt;
    else if(ts>G.pauseUntil && G.locked) G.time -= drainRate()*dt*0.3;
    if(G.time<=0){ G.time=0; gameOver(); }
  }
  if(G.anim){
    var k=Math.min(1,(ts-G.anim.t0)/G.anim.dur);
    p.x=lerp(G.anim.from.x,G.anim.to.x,k); p.f=lerp(G.anim.from.f,G.anim.to.f,k); p.jump=Math.sin(k*Math.PI)*10;
    if(k>=1){ G.anim=null; p.jump=0; }
  }
  if(G.falling){
    var t=(ts-G.falling.t0)/1000;
    p.f = G.falling.f - t*t*9; p.x = G.falling.x + p.face*t*1.2; p.rot = t*6*p.face;
  }else{
    G.world.camF = lerp(G.world.camF, p.f, .15); G.world.camX = lerp(G.world.camX, p.x, .12);
  }
  var gf=$('gaugeFill'); gf.style.width=G.time+'%'; gf.style.background = G.time<25?'#ff5d4f':G.time<50?'#ffc93c':'#4fd187';
  $('gauge').classList.toggle('low', G.time<25 && !G.over);
  drawWorld($('cv'), G.world);
  if(G.falling && (ts-G.falling.t0)>1300){ finish(); return; }
  if(tk===G.token && !$('game').hidden) requestAnimationFrame(loop);
}
function gameOver(){
  if(G.mode==='tower' && !G.over){
    G.over=true; G.locked=true; sfx('fall'); G.world.p.mood='sad';
    G.blocks.forEach(function(b){ b.vx=(Math.random()*2-1)*3; b.vr=(Math.random()*2-1)*4; });
    G.collapse={t0:performance.now()};
    document.querySelectorAll('.ans').forEach(function(b){ b.disabled=true; });
    return;
  }
  if(G.over) return; G.over=true; G.locked=true;
  G.world.p.mood='sad'; sfx('fall');
  G.falling={t0:performance.now(), f:G.world.p.f, x:G.world.p.x};
  document.querySelectorAll('.ans').forEach(function(b){ b.disabled=true; });
}
function finish(){
  var best=getBest(), rec = G.floor>best && G.floor>0;
  if(rec) setBest(G.floor);
  saveScore(G.mode, G.kind, G.floor, G.wrong.length);
  $('stampBox').innerHTML = rec ? '<div class="stamp"><span>신기록!</span><em>참 잘했어요</em></div>'
                          : G.floor>=20 ? '<div class="stamp"><span>참</span><em style="font-size:32px">잘했어요</em></div>' : '';
  $('resFloor').innerHTML = G.floor+'<small>층</small>';
  $('resSub').textContent = rec ? '새로운 최고 기록이에요! 🎉' : '최고 기록 '+Math.max(best,G.floor)+'층 · 최대 콤보 '+G.maxCombo;
  if(rec) $('resSub').textContent += ' · 최대 콤보 '+G.maxCombo;
  var w=$('wrongs'); w.innerHTML='';
  var isM=G.kind!=='word';
  $('wrongsT').textContent = G.wrong.length ? (isM ? '틀린 문제와 정답' : '틀린 단어 (누르면 소리가 나와요)') : (isM ? '한 문제도 안 틀리고 올라갔어요!' : '틀린 단어 없이 올라갔어요!');
  G.wrong.forEach(function(q){
    var b=document.createElement('button');
    if(q.recHTML){ b.className='fq'; b.innerHTML=q.recHTML; }
    else if(q.frac){ b.className='fq'; b.innerHTML=fracSVG(q.k,q.n,q.shape)+fracHTML(q.k,q.n)+'<span>'+q.text+'</span>'; }
    else if(isM){ b.className='mq'; b.textContent=q.text+' = '+q.r; }
    else { b.innerHTML='<img src="'+(IMG[q.w]||'')+'" alt="">'+q.w; b.onclick=function(){ speak(q.w); }; }
    w.appendChild(b);
  });
  $('bestTxt').textContent = bestText();
  $('againBtn').textContent= G.mode==='tower' ? '다시 쌓기 ↻' : '다시 오르기 ↻';
  G.token++;
  show('result');
}

/* ================= ITEMS ================= */
var ITEM_DEF={hint:{ic:'💡',name:'힌트'}, time:{ic:'⏰',name:'시간 회복'}, heart:{ic:'❤️',name:'하트'}, shield:{ic:'🛡️',name:'방패'}};
var INV=null;
function invReset(game){ ['toastS','toastB'].forEach(function(id){ $(id).textContent=''; $(id).className='itoast'; }); INV={game:game, hint:game==='match'?2:1, time:0, heart:0, shield:0, shieldOn:false}; renderItems(); }
function allowedItems(){ return {stairs:['hint','time'], tower:['hint','heart'], balloon:['hint','heart'], match:['hint']}[INV.game]; }
function itemBoxId(){ return {stairs:'itemsS', tower:'itemsS', balloon:'itemsB', match:'itemsM'}[INV.game]; }
function renderItems(got){
  var id=itemBoxId(); ['itemsS','itemsB','itemsM'].forEach(function(x){ if(x!==id) $(x).innerHTML=''; });
  var box=$(id); box.innerHTML='';
  allowedItems().forEach(function(k){
    var n=INV[k], b=document.createElement('button');
    b.className='item'+(n?'':' empty')+(k==='shield'&&INV.shieldOn?' on':'')+(got===k?' got':'');
    b.innerHTML=ITEM_DEF[k].ic+'<i>'+n+'</i>'; b.setAttribute('aria-label', ITEM_DEF[k].name+' '+n+'개');
    b.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
    b.onclick=function(e){ e.stopPropagation(); useItem(k); };
    box.appendChild(b);
  });
}
function itemToast(t){
  var el=$(INV.game==='balloon' ? 'toastB' : 'toastS'); if(INV.game==='match') el=$('mNote');
  el.textContent=t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function giveItem(){
  var al=allowedItems().filter(function(k){ return INV[k]<3; }); if(!al.length) return;
  var k=al[ri(0,al.length-1)]; INV[k]++; renderItems(k); itemToast(ITEM_DEF[k].ic+' '+ITEM_DEF[k].name+' 획득!'); sfx('lvl'); buzz(40);
}
function isCorrectBtn(b){
  if(G.kind==='word'){ var w=G.q.w.w; return b.dataset.w===w || b.dataset.k===GL(G.q.w); }
  return String(b.dataset.v)===String(G.q.m.r);
}
function hintStairs(){
  if(!G || G.locked || G.over) return false;
  var wrong=Array.from(document.querySelectorAll('#answers .ans:not(.off)')).filter(function(b){ return !isCorrectBtn(b); });
  if(wrong.length<1) return false;
  var n = wrong.length>=3 ? 2 : 1; if(wrong.length===1) n=1;
  shuffle(wrong).slice(0, Math.min(n, wrong.length)).forEach(function(b){ b.classList.add('off'); b.disabled=true; });
  return true;
}
function hintBalloon(){
  if(!B || B.fever || B.resolved || B.over) return false;
  var w=B.balloons.filter(function(o){ return !o.dead && !o.it.ok && !o.it.heart && !o.it.fv; });
  if(!w.length) return false;
  w.forEach(function(o){ burst(o,'💨'); bKill(o,true); });
  return true;
}
function hintMatch(){
  if(!MG || MG.over) return false;
  var lefts=Array.from(document.querySelectorAll('#mLeft .mcard:not(.done)')); if(!lefts.length) return false;
  var l=lefts[ri(0,lefts.length-1)], r=document.querySelector('#mRight .mcard[data-i="'+l.dataset.i+'"]');
  [l,r].forEach(function(x){ x.classList.remove('hint'); void x.offsetWidth; x.classList.add('hint'); setTimeout(function(){ x.classList.remove('hint'); }, 1900); });
  return true;
}
function useItem(k){
  if(!INV || !INV[k]) { sfx('ng'); return; }
  var ok=false;
  if(INV.game==='stairs' || INV.game==='tower'){
    if(!G || G.over) return;
    if(k==='hint') ok=hintStairs();
    if(k==='time'){ G.time=100; ok=true; itemToast('⏰ 시간이 가득 찼어요!'); }
    if(k==='heart' && G.lives<3){ G.lives++; drawTHearts(G.lives); ok=true; }
    if(k==='shield' && !INV.shieldOn){ INV.shieldOn=true; ok=true; itemToast('🛡️ 다음 실수 한 번은 괜찮아요!'); }
  }else if(INV.game==='balloon'){
    if(!B || B.over) return;
    if(k==='hint') ok=hintBalloon();
    if(k==='heart' && B.hearts<3){ B.hearts++; drawHearts(); ok=true; }
    if(k==='shield' && !INV.shieldOn){ INV.shieldOn=true; ok=true; itemToast('🛡️ 다음 실수 한 번은 괜찮아요!'); }
  }else if(k==='hint'){ ok=hintMatch(); }
  if(ok){ INV[k]--; sfx('ok'); buzz(20); renderItems(); } else sfx('ng');
}
function useShield(){
  if(INV && INV.shieldOn){ INV.shieldOn=false; renderItems(); itemToast('🛡️ 방패가 막아줬어요!'); return true; }
  return false;
}

/* ================= MATCH GAME ================= */
var MG=null;
function wrongChip(q){
  var b=document.createElement('button');
  if(typeof q.w==='string'){ b.innerHTML='<img src="'+(IMG[q.w]||'')+'" alt="">'+q.w; b.onclick=function(){ speak(q.w); }; }
  else if(q.recHTML){ b.className='fq'; b.innerHTML=q.recHTML; }
  else if(q.frac){ b.className='fq'; b.innerHTML=fracSVG(q.k,q.n,q.shape)+fracHTML(q.k,q.n)+'<span>'+q.text+'</span>'; }
  else { b.className='mq'; b.textContent=q.text+' = '+q.r; }
  return b;
}
function pairItem(kind){
  if(kind==='word'){ var pool=WORDS.filter(function(x){ return cfg.letters.has(GL(x)); }); var w=pool[ri(0,pool.length-1)];
    return {key:w.w, uniq:w.w, a:'<img src="'+(IMG[w.w]||'')+'" alt="'+w.ko+'">', b:'<span class="mt-en">'+w.w+'</span>', say:w.w, rec:w}; }
  if(kind==='math'){ var m=makeMath(); return {key:m.text, uniq:String(m.r), a:'<span class="mt-en">'+m.text+'</span>', b:'<span class="mt-en mt-big">'+m.r+'</span>', rec:m}; }
  if(kind==='frac'){
    if(cfg.fm===4 || (cfg.fm===3 && Math.random()<.4)){ var e=makeEquiv(); var A=e.k*(e.d/e.n);
      return {key:'e'+e.k+'/'+e.n, uniq:(e.k/e.n).toFixed(6), a:'<span style="font-size:30px">'+fracHTML(e.k,e.n)+'</span>', b:'<span style="font-size:30px">'+fracHTML(A,e.d)+'</span>', rec:e}; }
    var f=makeFrac(); while(f.type===3) f=makeFrac(); return {key:f.r, uniq:(f.k/f.n).toFixed(6), a:fracSVG(f.k,f.n,f.shape), b:fracHTML(f.k,f.n), rec:f}; }
  if(kind==='clock'){ var g=GEN.clock('x'); return {key:g.r, uniq:g.r, a:clockSVG(g.h,g.m,'cpic'), b:'<span class="mt-ko">'+g.label+'</span>', rec:g}; }
  if(kind==='money'){ var sv=GSET.money.t; GSET.money.t=1; var g2=GEN.money('x'); GSET.money.t=sv; return {key:g2.text, uniq:g2.r, a:g2.svg, b:'<span class="mt-ko">'+g2.label+'</span>', rec:g2}; }
  if(kind==='hanja'){ var hp=hzPool(), hx=hp[ri(0,hp.length-1)]; return {key:hx.h, uniq:hx.m, a:'<span class="hz" style="font-size:44px">'+hx.h+'</span>', b:'<span class="mt-ko">'+hx.m+'</span>', rec:{recHTML:'<span class="hz">'+hx.h+'</span><span>'+hx.m+'</span>', text:'hz '+hx.h, r:hx.h}}; }
  var sv2=GSET.length.t; GSET.length.t=2; var g3=GEN.length('x'); GSET.length.t=sv2;
  return {key:g3.text, uniq:String(g3.cm), a:'<span class="mt-ko">'+g3.pa+'</span>', b:'<span class="mt-ko">'+g3.pb+'</span>', rec:g3};
}
/* 고른 단어의 그림·음성을 6개씩 차례로 미리 받아 둠 (한꺼번에 받으면 오히려 느려짐) */
var PRELOADED={}, PQ=[], pumping=false;
function preloadWords(pool){
  pool.forEach(function(w){ if(!PRELOADED[w.w]){ PRELOADED[w.w]=1; PQ.push(w); } });
  if(pumping) return; pumping=true;
  (function step(){
    var batch=PQ.splice(0,6); if(!batch.length){ pumping=false; return; }
    Promise.all(batch.map(function(w){
      var a=new Promise(function(r){ var im=new Image(); im.onload=im.onerror=r; im.src=IMG[w.w]; });
      var b=AUDIO[w.w] ? fetch(AUDIO[w.w]).catch(function(){}) : null;
      return Promise.all([a,b]);
    })).then(function(){ setTimeout(step,60); });
  })();
}
function newMatch(){
  if(cfg.kind==='word') preloadWords(WORDS.filter(function(x){ return cfg.letters.has(GL(x)); }));
  if(MG) MG.token++;
  MG={kind:cfg.kind, round:0, rounds:3, per:5, mistakes:0, t0:performance.now(), sel:null, done:0, wrong:[], token:(MG?MG.token:0)+1, over:false};
  $('mNote').textContent=''; $('mNote').className='bnote';
  show('mgame'); invReset('match'); mRound();
  var tk=MG.token;
  (function tick(){ if(!MG || MG.token!==tk || MG.over) return; $('mTime').textContent=fmtTime((performance.now()-MG.t0)/1000); setTimeout(tick, 250); })();
}
function mRound(){
  MG.round++; MG.done=0; MG.sel=null;
  if(MG.round>1 && INV && INV.hint<3){ INV.hint++; renderItems('hint'); }
  $('mRound').textContent=MG.round+' / '+MG.rounds+'판';
  $('mLines').innerHTML='';
  var pairs=[], uq={}, guard=0;
  while(pairs.length<MG.per && guard++<400){ var it=pairItem(MG.kind); if(uq[it.uniq]||uq['k'+it.key]) continue; uq[it.uniq]=1; uq['k'+it.key]=1; pairs.push(it); }
  MG.pairs=pairs;
  ['mLeft','mRight'].forEach(function(id,side){
    var col=$(id); col.innerHTML='';
    shuffle(pairs.map(function(_,i){ return i; })).forEach(function(i){
      var p=pairs[i], c=document.createElement('button'); c.className='mcard'; c.innerHTML= side===0 ? p.a : p.b;
      c.dataset.i=i; c.dataset.side=side;
      c.onclick=function(){ mTap(c); };
      col.appendChild(c);
    });
  });
}
function mLine(a,b){
  var bd=$('board').getBoundingClientRect(), ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
  var L = ra.left<rb.left ? ra : rb, R = ra.left<rb.left ? rb : ra;
  var x1=L.right-bd.left, y1=L.top+L.height/2-bd.top, x2=R.left-bd.left, y2=R.top+R.height/2-bd.top;
  var ns='http://www.w3.org/2000/svg', ln=document.createElementNS(ns,'line');
  ln.setAttribute('x1',x1); ln.setAttribute('y1',y1); ln.setAttribute('x2',x2); ln.setAttribute('y2',y2);
  ln.setAttribute('stroke','#22a35a'); ln.setAttribute('stroke-width','4'); ln.setAttribute('stroke-linecap','round');
  $('mLines').appendChild(ln);
  [[x1,y1],[x2,y2]].forEach(function(pt){ var c=document.createElementNS(ns,'circle'); c.setAttribute('cx',pt[0]); c.setAttribute('cy',pt[1]); c.setAttribute('r','5'); c.setAttribute('fill','#22a35a'); $('mLines').appendChild(c); });
}
function mTap(c){
  if(MG.over || c.classList.contains('done')) return;
  var s=MG.sel;
  if(!s){ MG.sel=c; c.classList.add('sel'); return; }
  if(s===c){ c.classList.remove('sel'); MG.sel=null; return; }
  if(s.dataset.side===c.dataset.side){ s.classList.remove('sel'); MG.sel=c; c.classList.add('sel'); return; }
  s.classList.remove('sel'); MG.sel=null;
  if(s.dataset.i===c.dataset.i){
    var p=MG.pairs[+c.dataset.i];
    s.classList.add('done'); c.classList.add('done'); s.disabled=c.disabled=true; mLine(s,c); sfx('ok');
    if(p.say) speak(p.say);
    MG.done++;
    if(MG.done>=MG.pairs.length){
      var n=$('mNote'); n.textContent = MG.round<MG.rounds ? MG.round+'판 성공! 🎉' : '모두 성공! 🎉'; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show'); sfx('lvl');
      var tk=MG.token; setTimeout(function(){ if(MG.token!==tk) return; if(MG.round<MG.rounds) mRound(); else mFinish(); }, 1100);
    }
  }else{
    MG.mistakes++; sfx('ng');
    [s,c].forEach(function(x){ x.classList.remove('bad'); void x.offsetWidth; x.classList.add('bad'); });
    var r=MG.pairs[+s.dataset.i].rec; if(MG.wrong.indexOf(r)<0) MG.wrong.push(r);
  }
}
function mFinish(quit){
  MG.over=true;
  var sec=Math.max(1,Math.round((performance.now()-MG.t0)/1000)), best=getBest(), rec=!quit && (!best || sec<best);
  if(rec) setBest(sec);
  if(!quit) saveScore('match', MG.kind, sec, MG.mistakes);
  $('stampBox').innerHTML = rec ? '<div class="stamp"><span>신기록!</span><em>참 잘했어요</em></div>'
                          : (!quit && MG.mistakes===0) ? '<div class="stamp"><span>참</span><em style="font-size:32px">잘했어요</em></div>' : '';
  $('resFloor').innerHTML = quit ? MG.round-1+'<small>판 완료</small>' : fmtTime(sec);
  var bt=getBest();
  $('resSub').textContent = (quit ? '중간에 그만뒀어요 · ' : rec ? '새로운 최고 기록이에요! 🎉 · ' : '최고 기록 '+(bt?fmtTime(bt):'-')+' · ') + '실수 '+MG.mistakes+'번';
  var w=$('wrongs'); w.innerHTML='';
  $('wrongsT').textContent = MG.wrong.length ? '헷갈렸던 문제' : '한 번도 안 틀렸어요!';
  MG.wrong.forEach(function(q){ w.appendChild(wrongChip(q)); });
  $('bestTxt').textContent = bestText();
  $('againBtn').textContent='다시 하기 ↻';
  MG.token++;
  show('result');
}
$('mQuit').onclick=function(){ if(MG && !MG.over) mFinish(true); };

/* ================= BALLOON GAME ================= */
var B=null, BCOL=[['#e0605a','#f6b3ab'],['#5fa883','#bfe0cb'],['#f0c25a','#fbe6ad'],['#f6ecd2','#ffffff'],['#f2a0a0','#fde0dc'],['#9fc7e0','#e1eff6']];
function bQuestion(){
  var q={};
  if(cfg.kind==='word'){
    if(!B.deck.length){ B.deck=shuffle(B.pool); if(B.deck[0]===B.lastW && B.deck.length>1) B.deck.push(B.deck.shift()); }
    var w=B.deck.shift(); B.lastW=w;
    var type = cfg.mode===3 ? [1,2,4][Math.floor(Math.random()*3)] : cfg.mode;
    q={word:w, type:type, key:w.w, rec:w, say:w.w};
    if(type===1){
      q.prompt='<img class="bimg" data-say="1" src="'+(IMG[w.w]||'')+'" alt=""><div class="bcol"><div class="bt">그림에 맞는 단어 풍선을 터뜨려요</div><div class="bko">'+w.ko+'</div></div>';
      q.choices=shuffle([w].concat(wordDistractors(w,2))).map(function(o){ return {key:o.w, html:'<span class="bl-t" style="font-size:'+(o.w.length>7?17:o.w.length>5?20:24)+'px">'+o.w+'</span>'}; });
    }else if(type===2){
      var letters=shuffle(LETTERS.filter(function(l){ return l!==GL(w); })).slice(0,2).concat([GL(w)]);
      q.key=GL(w);
      q.prompt='<img class="bimg" data-say="1" src="'+(IMG[w.w]||'')+'" alt=""><div class="bcol"><div class="bt">'+(w.l?'빈칸 글자 풍선을 터뜨려요':'첫 글자 풍선을 터뜨려요')+'</div><div class="q-blank">'+blankHTML(w,'bqm','?')+'</div></div>';
      q.choices=shuffle(letters).map(function(l){ return {key:l, html:'<span class="bl-t" style="font-size:40px">'+l+'</span>'}; });
    }else{
      q.prompt='<button class="bsay" data-say="1" aria-label="다시 듣기">🔊</button><div class="bcol"><div class="bt">잘 듣고 알맞은 그림 풍선을 터뜨려요</div><div class="bko" style="font-size:16px;color:var(--muted)">다시 들으려면 🔊를 눌러요</div></div>';
      q.choices=shuffle([w].concat(wordDistractors(w,2))).map(function(o){ return {key:o.w, html:'<img class="bl-img" src="'+(IMG[o.w]||'')+'" alt="">'}; });
      q.autoSay=true;
    }
  }else if(GEN[cfg.kind]){
    var g=GEN[cfg.kind]('bqm'), t3=0; while(B.lastG && B.lastG.text===g.text && t3++<6) g=GEN[cfg.kind]('bqm'); B.lastG=g;
    q={key:g.r, rec:g, gen:g, prompt:g.prompt};
    q.choices=g.choices.map(function(c){
      if(c.pic) return {key:c.key, html:'<span class="bl-svg clk">'+c.html.replace('class="cpic gpic"','class="gpic" style="width:100%;height:auto"')+'</span>'};
      if(c.hz) return {key:c.key, html:c.html};
      var L=c.html.length; return {key:c.key, html:'<span class="bl-k" style="font-size:'+(L>8?15:L>6?17:L>4?20:23)+'px">'+c.html+'</span>'};
    });
  }else if(cfg.kind==='math'){
    var m=makeMath(), t=0; while(B.lastM && B.lastM.text===m.text && t++<5) m=makeMath(); B.lastM=m;
    q={key:String(m.r), rec:m, math:m};
    q.prompt='<div class="expr"><span>'+m.a+'</span><span class="o">'+m.sym+'</span><span>'+m.b+'</span><span class="o">=</span><span class="qm" id="bqm">?</span></div>';
    q.choices=m.choices.map(function(v){ return {key:String(v), html:'<span class="bl-t" style="font-size:'+(String(v).length>2?28:34)+'px">'+v+'</span>'}; });
  }else{
    var f=makeFrac(), t2=0; while(B.lastF && B.lastF.r===f.r && t2++<5) f=makeFrac(); B.lastF=f;
    q={key:f.r, rec:f, frac:f};
    if(f.type===3){
      q.prompt=f.promptHTML('bqm');
      q.choices=f.choices.map(function(c){ return {key:c.key, html: f.form==='num' ? '<span class="bl-t" style="font-size:34px">'+c.key+'</span>' : '<span class="bl-t">'+c.html+'</span>'}; });
    }else if(f.type===1){
      q.prompt=fracSVG(f.k,f.n,f.shape)+'<span class="eq" style="font-family:var(--en);font-weight:900;font-size:32px;color:var(--teal)">=</span><span class="fbox" id="bqm" style="min-height:84px">?</span>';
      q.choices=f.choices.map(function(c){ return {key:c[0]+'/'+c[1], html:'<span class="bl-t">'+fracHTML(c[0],c[1])+'</span>'}; });
    }else{
      q.prompt='<span class="bigfrac">'+fracHTML(f.k,f.n)+'</span><div class="bcol"><div class="bt">알맞은 그림 풍선을 터뜨려요</div><div class="bko">'+f.text+'</div></div>';
      q.choices=f.choices.map(function(c){ return {key:c[0]+'/'+c[1], html:'<span class="bl-svg">'+fracSVG(c[0],c[1],f.shape)+'</span>'}; });
    }
  }
  return q;
}
function newBalloon(){
  var pool = WORDS.filter(function(x){ return cfg.letters.has(GL(x)); }); if(cfg.kind==='word') preloadWords(pool);
  if(B) B.token++;
  B={kind:cfg.kind, pool:pool, deck:[], hearts:3, score:0, correct:0, combo:0, maxCombo:0, wrong:[], balloons:[], q:null, resolved:false,
     over:false, token:(B?B.token:0)+1, lastTs:performance.now()};
  $('field').querySelectorAll('.balloon,.burst').forEach(function(e){ e.remove(); });
  $('bScore').textContent='0'; $('bCombo').textContent='';
  $('bNote').textContent=''; $('bNote').className='bnote'; $('field').classList.remove('fever'); $('bPrompt').classList.remove('fever');
  drawHearts(); invReset('balloon'); show('bgame');
  setTimeout(function(){ bWave(); requestAnimationFrame(bLoop); }, 50);
}
function drawHearts(){ var h=''; for(var i=0;i<3;i++) h+='<span class="'+(i<B.hearts?'':'off')+'">❤️</span>'; $('hearts').innerHTML=h; }
function bDuration(){
  var d = 8 * Math.max(0.55, 1 - 0.06*Math.floor(B.correct/5));
  if(B.kind==='math') d *= [1,1,1.1,1.3][cfg.lv];
  if(B.kind==='frac') d *= 1.1;
  if(GEN_CFG[B.kind]) d *= GEN_CFG[B.kind].bdur;
  return d;
}
function bWave(){
  if(B.over) return;
  var q=bQuestion(); B.q=q; B.resolved=false;
  $('bPrompt').innerHTML=q.prompt;
  $('bPrompt').querySelectorAll('[data-say]').forEach(function(e){ e.onclick=function(){ speak(q.say); }; });
  if(q.autoSay){ var tk=B.token; setTimeout(function(){ if(B.token===tk && B.q===q) speak(q.say); }, 250); }
  var field=$('field'), W=field.clientWidth, H=field.clientHeight;
  var bw=Math.max(74, Math.min(104, W/4.3)), bh=bw*1.18, pad=bw/2+6; B.W=W; B.bw=bw;
  var dur=bDuration(), speed=(H+bh+60)/dur;
  var items=q.choices.map(function(c){ return {key:c.key, html:c.html, ok:c.key===q.key}; });
  if(B.hearts<3 && Math.random()<0.2) items.push({heart:true, html:'<span class="bl-t">❤️</span>'});
  var gold = Math.random()<0.12;
  var nL=items.length, lanes=shuffle(items.map(function(_,i){ return i; }));
  var order=shuffle(items.map(function(_,i){ return i; }));
  items.forEach(function(it,i){
    var el=document.createElement('button'); el.className='balloon'+(it.heart?' heart':'')+(it.ok&&gold?' gold':'');
    var col=BCOL[Math.floor(Math.random()*BCOL.length)];
    el.style.setProperty('--bc', it.heart?'#ff6f91':col[0]); el.style.setProperty('--bc2', it.heart?'#ffd1dc':col[1]); el.style.setProperty('--bw', bw+'px');
    el.innerHTML=it.html;
    var lane=lanes[i];
    var b={el:el, it:it, x:pad+lane*(W-2*pad)/Math.max(1,nL-1), y:H+20+order[i]*(bh*0.55), speed:speed*(0.92+Math.random()*0.16), ph:Math.random()*6, gold:it.ok&&gold, h:bh, dead:false};
    el.addEventListener('pointerdown', function(e){ e.preventDefault(); bTap(b); });
    field.appendChild(el); B.balloons.push(b);
  });
}
function bPos(b,ts){ var w=b.bw||B.bw; var x=Math.max(w/2+3, Math.min(B.W-w/2-3, b.x+Math.sin(ts/650+b.ph)*7)); b.cx=x; b.el.style.transform='translate('+x+'px,'+b.y+'px)'; }
function burst(b, text){
  var f=$('field'), d=document.createElement('div'); d.className='burst';
  d.style.left=(b.cx||b.x)+'px'; d.style.top=(b.y+b.h*0.45)+'px';
  var h='';
  for(var i=0;i<10;i++){ var a=i/10*Math.PI*2, r=40+Math.random()*20; h+='<i style="--c:'+getComputedStyle(b.el).getPropertyValue('--bc')+';--dx:'+(Math.cos(a)*r).toFixed(0)+'px;--dy:'+(Math.sin(a)*r).toFixed(0)+'px"></i>'; }
  if(text) h+='<b>'+text+'</b>';
  d.innerHTML=h; f.appendChild(d); setTimeout(function(){ d.remove(); }, 900);
}
function bKill(b, fade){
  b.dead=true;
  if(fade){ b.el.classList.add('gone'); setTimeout(function(){ b.el.remove(); }, 260); } else b.el.remove();
}
function bShowAnswer(){
  var q=B.q, m=$('bqm'); if(!m) return;
  m.classList.remove('ng'); m.classList.add('ok');
  if(q.gen) m.innerHTML=q.gen.ansHTML||''; else if(q.frac) m.innerHTML=(q.frac.equiv?q.frac.ansHTML:fracHTML(q.frac.k,q.frac.n)); else m.textContent = q.word ? GL(q.word) : q.key;
}
function bRecordWrong(){
  var r=B.q.rec, isM=!!(B.q.math||B.q.frac);
  if(!B.wrong.some(function(x){ return isM ? (x.text===r.text && x.r===r.r) : x===r; })) B.wrong.push(r);
}
function buzz(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} }
function bTap(b){
  if(B.over || b.dead) return;
  if(b.it.fv){
    if(!B.fever) return;
    if(b.it.ok){
      sfx('pop'); buzz(15); B.fever.hits++; B.score+=5; $('bScore').textContent=B.score;
      var fh=$('fvHits'); if(fh) fh.textContent=B.fever.hits+'개';
      burst(b,'+5'); bKill(b);
    }else{
      sfx('ng'); B.fever.miss++; b.el.classList.add('bad'); var fb=b; setTimeout(function(){ if(!fb.dead){ burst(fb,'✕'); bKill(fb); } }, 200);
    }
    return;
  }
  if(b.it.heart){
    sfx('pop'); burst(b,'+❤️'); bKill(b); B.hearts=Math.min(3,B.hearts+1); drawHearts(); return;
  }
  if(B.resolved) return;
  if(b.it.ok){
    B.resolved=true; sfx('pop'); sfx('ok'); buzz(25);
    B.combo++; B.maxCombo=Math.max(B.maxCombo,B.combo); B.correct++;
    if(B.combo%5===0) giveItem();
    var pts = 10 + Math.min(10, (B.combo-1)*2) + (b.gold?30:0);
    B.score+=pts; $('bScore').textContent=B.score;
    burst(b, b.gold ? '+'+pts+' ✨' : '+'+pts); bKill(b);
    bShowAnswer();
    if(B.q.word) speak(B.q.word.w);
    if(B.combo>=3){ var c=$('bCombo'); c.textContent=B.combo+' COMBO!'; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
    if(B.correct%5===0){ var n=$('bNote'); n.textContent='풍선이 빨라져요!'; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show'); sfx('lvl'); }
    B.balloons.forEach(function(o){ if(!o.dead && !o.it.heart){ o.flee=true; } });
    var tk=B.token; setTimeout(function(){ if(B.token===tk && !B.over) bNext(); }, 750);
  }else{
    sfx('ng'); b.el.classList.add('bad'); var bb=b; setTimeout(function(){ if(!bb.dead){ burst(bb,'✕'); bKill(bb); } }, 260);
    B.combo=0; $('bCombo').textContent='';
    bRecordWrong(); bLoseHeart();
  }
}
function bLoseHeart(){
  if(useShield()) return;
  B.hearts--; drawHearts();
  var h=$('hearts'); h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit');
  var p=$('bPrompt'); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake');
  if(B.hearts<=0) bGameOver();
}
function bNext(){
  B.balloons.forEach(function(o){ if(!o.dead) bKill(o,true); });
  B.balloons=[];
  if(B.correct>0 && B.correct%6===0 && B.lastFever!==B.correct){ B.lastFever=B.correct; startFever(); return; }
  bWave();
}
var FEVER_MS=8000;
function startFever(){
  var tgt=null, letters=Array.from(cfg.letters);
  if(B.kind==='word'){ tgt=letters[ri(0,letters.length-1)]; }
  B.fever={t0:performance.now(), tgt:tgt, hits:0, miss:0, last:0};
  B.resolved=true;
  var p=$('bPrompt'); p.classList.add('fever');
  p.innerHTML='<div class="fv-t">🔥 피버 타임! 🔥</div>'+
    (tgt ? '<div class="fv-q"><b>'+tgt+'</b>'+(tgt==='x'?'가 들어간':'로 시작하는')+' 단어를 모두 터뜨려요!</div>' : '<div class="fv-q">⭐ 별 풍선을 최대한 많이 터뜨려요!</div>')+
    '<div class="fv-row"><div class="fv-bar"><i id="fvBar"></i></div><span class="fv-hits" id="fvHits">0개</span></div>';
  $('field').classList.add('fever'); sfx('lvl'); buzz(60);
}
function feverSpawn(){
  var field=$('field'), W=field.clientWidth, H=field.clientHeight, bw=B.bw*0.8, bh=bw*1.18, it;
  if(B.fever.tgt){
    var hit=Math.random()<0.55, cand=WORDS.filter(function(x){ return hit ? GL(x)===B.fever.tgt : GL(x)!==B.fever.tgt; });
    var w=cand[ri(0,cand.length-1)];
    it={fv:true, ok:hit, html:'<span class="bl-t" style="font-size:'+(w.w.length>7?14:w.w.length>5?16:19)+'px">'+w.w+'</span>'};
  }else{
    it={fv:true, ok:true, html:'<span class="bl-t" style="font-size:34px">⭐</span>'};
  }
  var el=document.createElement('button'); el.className='balloon fv';
  var col=BCOL[ri(0,BCOL.length-1)];
  el.style.setProperty('--bc',col[0]); el.style.setProperty('--bc2',col[1]); el.style.setProperty('--bw',bw+'px');
  el.innerHTML=it.html;
  var dur=4.8, nL=Math.max(2,Math.floor((W-8)/(bw+16))), lw=(W-8)/nL;
  B.fLanes=B.fLanes||[];
  var free=[]; for(var L=0;L<nL;L++){ var lb=B.fLanes[L]; if(!lb || lb.dead || lb.y < H-bh*1.25-30) free.push(L); }
  if(!free.length) return;
  var lane=free[ri(0,free.length-1)];
  var b={el:el, it:it, x:4+lw*(lane+0.5)+(Math.random()*6-3), y:H+10, speed:(H+bh+60)/dur, ph:Math.random()*6, h:bh, bw:bw, dead:false};
  B.fLanes[lane]=b;
  el.addEventListener('pointerdown', function(e){ e.preventDefault(); bTap(b); });
  field.appendChild(el); B.balloons.push(b);
}
function endFever(){
  var f=B.fever; B.fever=null;
  B.balloons.forEach(function(o){ if(!o.dead) o.flee=true; });
  $('field').classList.remove('fever'); $('bPrompt').classList.remove('fever');
  var n=$('bNote'); n.textContent='피버 보너스 +'+(f.hits*5)+'점!'; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show');
  sfx('lvl');
  var tk=B.token; setTimeout(function(){ if(B.token===tk && !B.over){ B.balloons.forEach(function(o){ if(!o.dead) bKill(o,true); }); B.balloons=[]; bWave(); } }, 1300);
}
function bMiss(){
  B.resolved=true; sfx('ng'); B.combo=0; $('bCombo').textContent='';
  bRecordWrong(); bShowAnswer();
  var n=$('bNote'); n.textContent='날아가 버렸어요!'; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show');
  if(B.q.word) speak(B.q.word.w);
  bLoseHeart();
  if(!B.over){ var tk=B.token; setTimeout(function(){ if(B.token===tk && !B.over) bNext(); }, 1300); }
}
function bLoop(ts){
  if(!B || $('bgame').hidden) return;
  var tk=B.token, dt=Math.min(.1,(ts-B.lastTs)/1000); B.lastTs=ts;
  if(B.fever && !B.over){
    var el_=ts-B.fever.t0, bar=$('fvBar');
    if(bar) bar.style.width=Math.max(0,100-el_/FEVER_MS*100)+'%';
    if(el_<FEVER_MS-700 && ts-B.fever.last>230){ B.fever.last=ts; feverSpawn(); }
    if(el_>=FEVER_MS) endFever();
  }
  if(B.balloons.length>40) B.balloons=B.balloons.filter(function(o){ return !o.dead; });
  B.balloons.forEach(function(b){
    if(b.dead) return;
    b.y -= b.speed*dt*(b.flee?4:1);
    bPos(b,ts);
    if(b.y < -b.h-50){
      if(b.it.ok && !b.it.fv && !B.resolved && !B.over){ bKill(b); bMiss(); }
      else bKill(b);
    }
  });
  if(!B.over && B.token===tk) requestAnimationFrame(bLoop);
}
function bGameOver(){
  if(B.over) return; B.over=true; sfx('fall');
  B.balloons.forEach(function(o){ if(!o.dead){ o.el.classList.add('bad'); } });
  var tk=B.token; setTimeout(function(){ if(B.token===tk) bFinish(); }, 1100);
}
function bFinish(){
  var best=getBest(), rec = B.score>best && B.score>0;
  if(rec) setBest(B.score);
  saveScore('balloon', B.kind, B.score, B.wrong.length);
  $('stampBox').innerHTML = rec ? '<div class="stamp"><span>신기록!</span><em>참 잘했어요</em></div>'
                          : B.correct>=20 ? '<div class="stamp"><span>참</span><em style="font-size:32px">잘했어요</em></div>' : '';
  $('resFloor').innerHTML = B.score+'<small>점</small>';
  $('resSub').textContent = (rec ? '새로운 최고 기록이에요! 🎉 · ' : '최고 기록 '+Math.max(best,B.score)+'점 · ') + '풍선 '+B.correct+'개 · 최대 콤보 '+B.maxCombo;
  var w=$('wrongs'); w.innerHTML='';
  var isM=B.kind!=='word';
  $('wrongsT').textContent = B.wrong.length ? (isM ? '틀린 문제와 정답' : '틀린 단어 (누르면 소리가 나와요)') : '하나도 안 틀렸어요!';
  B.wrong.forEach(function(q){
    var b=document.createElement('button');
    if(q.recHTML){ b.className='fq'; b.innerHTML=q.recHTML; }
    else if(q.frac){ b.className='fq'; b.innerHTML=fracSVG(q.k,q.n,q.shape)+fracHTML(q.k,q.n)+'<span>'+q.text+'</span>'; }
    else if(isM){ b.className='mq'; b.textContent=q.text+' = '+q.r; }
    else { b.innerHTML='<img src="'+(IMG[q.w]||'')+'" alt="">'+q.w; b.onclick=function(){ speak(q.w); }; }
    w.appendChild(b);
  });
  $('bestTxt').textContent = bestText();
  $('againBtn').textContent='다시 하기 ↻';
  B.token++;
  show('result');
}
$('bQuit').onclick=function(){ if(B && !B.over){ B.hearts=0; drawHearts(); bGameOver(); } };
document.addEventListener('visibilitychange', function(){ if(B && !document.hidden){ B.lastTs=performance.now(); } });

$('pic').onclick=function(){ if(G&&G.q&&G.q.w) speak(G.q.w.w); };
function startGame(){ cfg.game==='balloon' ? newBalloon() : cfg.game==='match' ? newMatch() : newGame(); }
$('startBtn').onclick=function(){ sfx('none'); startGame(); };
$('againBtn').onclick=function(){ startGame(); };
$('homeBtn').onclick=function(){ show('start'); };
$('quitBtn').onclick=function(){ if(G && !G.over){ G.time=0; G.lives=0; drawTHearts(0); gameOver(); } };
document.addEventListener('keydown', function(e){
  if($('game').hidden || !G || G.locked) return;
  if((G.q.type===1||G.q.type===3||G.q.type===4) && /^[123]$/.test(e.key)){ var b=document.querySelectorAll('.ans')[+e.key-1]; if(b) b.click(); }
  if(G.q.type===2 && /^[a-z]$/i.test(e.key)){ var k=document.querySelector('.ans[data-k="'+e.key.toLowerCase()+'"]'); if(k) k.click(); }
});
document.addEventListener('visibilitychange', function(){ if(G && !document.hidden){ G.lastTs=performance.now(); } });
