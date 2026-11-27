/* ================= CHRISTMAS SCRATCH EVENT ================= */
var EV_ID='xmas2026', SITE_URL='https://withmijin87.github.io/play-study/';
var EV={cfg:null, st:null, busy:false};
function evRef(){ return FB.db.doc('users/'+FB.user.uid+'/event/'+EV_ID); }
function evActive(){
  var c=EV.cfg; if(!c || !c.on) return false;
  if(FB.user && (c.excluded||[]).indexOf(FB.user.uid)>=0) return false;
  if(c.end){ var e=new Date(c.end+'T23:59:59'); if(!isNaN(e) && new Date()>e) return false; }
  return true;
}
function evTickets(){ return EV.st ? Math.max(0,(EV.st.earned||0)-(EV.st.used||0)) : 0; }
function evAdminName(){ return (EV.cfg && EV.cfg.admin) || '이미진'; }
function evWeekId(d){
  d=new Date(d||Date.now()); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7));
  return dayId(d);
}
function evDday(){
  var c=EV.cfg; if(!c || !c.end) return '';
  var e=new Date(c.end+'T00:00:00'), t=new Date(); t.setHours(0,0,0,0);
  var d=Math.round((e-t)/864e5); return isNaN(d) ? '' : d>0 ? 'D-'+d : d===0 ? 'D-DAY' : '끝';
}
function evWatch(){
  if(!FB.ok) return;
  FB.db.doc('config/event').onSnapshot(function(d){ EV.cfg=d.exists?d.data():null; evRender(); }, function(){ EV.cfg=null; evRender(); });
}
async function evLoad(){
  EV.st=null;
  if(FB.ok && FB.user){
    try{ var d=await evRef().get(); EV.st=d.exists?d.data():{earned:0, used:0, hist:[]}; }catch(e){ EV.st=null; }
  }
  evRender();
}
function evRender(){
  var b=$('btnEvent'); if(!b) return;
  b.hidden=!evActive();
  var n=evTickets(); b.textContent='🎁'+(FB.user && n>0 ? ' '+n : '');
  b.classList.toggle('glow', !!FB.user && n>0);
  if(!$('evModal').hidden && $('evScratch').hidden) evDraw();
}

/* 손님: 게임 끝나면 로그인 유도 (로그인하면 방금 기록도 저장) */
function evGuestNudge(){
  var note=$('evNote'); if(!note) return;
  note.classList.remove('ticket'); note.classList.add('nudge');
  note.innerHTML='<div class="ng"><span class="ng-ic">🔐</span><div class="ng-t"><b>로그인하고 기록 지키기!</b>'+
    '<span>지금 로그인하면 <u>방금 기록도 저장</u>돼요.<br>이름이랑 생일 4자리면 끝!</span>'+
    (evActive()?'<span class="ng-ev">🎟️ 신기록 깨면 <b>행운의 즉석복권</b>도 받아요!</span>':'')+
    '</div></div><div class="ng-btn">로그인하기 ▶</div>';
  note.onclick=function(){ openLogin(); };
  note.hidden=false;
}
/* 게임 끝 → 최고 기록이면 복권 1장 */
function evOnScore(isBest){
  var note=$('evNote'); if(!note) return;
  note.hidden=true; note.classList.remove('nudge');
  if(!evActive() || !isBest) return;
  if(!EV.st) return;
  EV.st.earned=(EV.st.earned||0)+1;
  evRef().set({earned:firebase.firestore.FieldValue.increment(1)},{merge:true}).catch(function(){});
  var no=String(1000+Math.floor(Math.random()*9000));
  note.innerHTML='<div class="lt"><i class="lt-sp s1">✦</i><i class="lt-sp s2">★</i><i class="lt-sp s3">✦</i><i class="lt-sp s4">★</i>'+
    '<div class="lt-top"><span>LUCKY</span><b>🍀 행운의 즉석복권 🍀</b><span>No.'+no+'</span></div>'+
    '<div class="lt-mid"><span class="lt-coin">🪙</span><div class="lt-silver"><em>여기를 긁어요!</em></div><span class="lt-gift">🎁</span></div>'+
    '<div class="lt-bot">🎉 신기록 보상! <b>눌러서 긁어 보기 ✨</b></div></div>';
  note.classList.add('ticket');
  if(typeof sfx==='function') setTimeout(function(){ sfx('ok'); }, 350);
  note.onclick=function(){ note.hidden=true; evOpen(true); };
  note.hidden=false;
  evRender();
}
function evOpen(direct){
  if(!FB.user){ openLogin(); $('lgErr').textContent='🎄 이벤트는 로그인하면 참여할 수 있어요!'; return; }
  $('evModal').hidden=false; evBack();
  if(direct===true && evTickets()>0) evScratchStart();
}
function evDraw(){
  var c=EV.cfg||{}, s=EV.st, h='';
  $('evDday').textContent=evDday();
  if(!s){ $('evBody').innerHTML='<p class="msub">불러오는 중이에요… 잠시 뒤에 다시 열어 주세요.</p>'; return; }
  var n=evTickets();
  h+='<p class="msub">게임에서 <b>최고 기록</b>을 깨면 긁기 복권이 1장 나와요.<br>대부분 꽝이지만… 가끔 <b>랜덤 선물</b>이 숨어 있어요! 🎅</p>';
  h+='<div class="ev-tk"><div class="ev-tk-n">🎟️ <b>'+n+'</b>장</div>'+
     '<button class="big" id="evGo"'+(n>0&&!EV.busy?'':' disabled')+'>'+(n>0?'복권 긁으러 가기 ✨':'신기록을 내면 생겨요')+'</button></div>';
  var hist=(s.hist||[]).slice().reverse(), wins=hist.filter(function(r){ return r.win; });
  if(wins.length){
    h+='<h3 class="ev-h">🎉 내 당첨</h3><div class="ev-wins">';
    wins.forEach(function(r,i){ h+='<button class="ev-win" data-i="'+i+'">🎁 '+esc(r.prize||'선물')+' <small>'+fmtDT(new Date(r.at))+' · 다시 공유하기</small></button>'; });
    h+='</div>';
  }
  if(hist.length) h+='<h3 class="ev-h">긁은 복권 '+hist.length+'장</h3><div class="ev-hist">'+hist.slice(0,12).map(function(r){ return '<span class="'+(r.win?'win':'')+'">'+(r.win?'🎉':'🍀')+'</span>'; }).join('')+'</div>';
  $('evBody').innerHTML=h;
  var go=$('evGo'); if(go) go.onclick=evScratchStart;
  $('evBody').querySelectorAll('.ev-win').forEach(function(b){ b.onclick=function(){ evShare(wins[+b.dataset.i]); }; });
}
function evCode(){ var a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s=''; for(var i=0;i<6;i++) s+=a[Math.floor(Math.random()*a.length)]; return s; }
function evPrizePick(c){
  var list=String(c.prizes||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
  return list.length ? list[Math.floor(Math.random()*list.length)] : '🎁 랜덤 선물';
}
async function evRoll(){
  var c=EV.cfg||{}, prob=Math.max(0,Math.min(100,c.prob!=null?+c.prob:10));
  if(!(Math.random()*100<prob)) return false;
  var ref=FB.db.doc('config/event'), wk=evWeekId();
  try{
    return await FB.db.runTransaction(async function(tx){
      var d=await tx.get(ref), x=d.exists?d.data():{}, cap=x.weekly!=null?+x.weekly:1;
      var ww = x.weekId===wk ? (x.weekWon||0) : 0;
      if(!x.on || ww>=cap) return false;
      tx.update(ref,{weekId:wk, weekWon:ww+1, won:(x.won||0)+1}); return true;
    });
  }catch(e){ return false; }
}
async function evScratchStart(){
  if(EV.busy || evTickets()<=0) return;
  EV.busy=true; var go=$('evGo'); if(go){ go.disabled=true; go.textContent='복권 준비 중…'; }
  var s=EV.st; s.used=(s.used||0)+1;
  try{ await evRef().set({used:firebase.firestore.FieldValue.increment(1)},{merge:true}); }
  catch(e){ s.used--; EV.busy=false; evDraw(); return; }
  var win=await evRoll(), r={win:win, at:Date.now()};
  if(win){
    r.prize=evPrizePick(EV.cfg||{}); r.code=evCode(); r.name=FB.name||'친구';
    FB.db.collection('winners').add({uid:FB.user.uid, name:r.name, prize:r.prize, code:r.code, given:false, ev:EV_ID, at:firebase.firestore.FieldValue.serverTimestamp()}).catch(function(){});
  }
  s.hist=(s.hist||[]).concat([r]);
  evRef().set({hist:s.hist},{merge:true}).catch(function(){});
  EV.busy=false;
  evScratchShow(r);
}
function evScratchShow(r){
  var box=$('evScratch'), card=$('evCard'); box.hidden=false; $('evBody').hidden=true; $('evClose').hidden=true;
  card.className='ev-card '+(r.win?'win':'lose');
  card.innerHTML = r.win
    ? '<div class="big-ic">🎁</div><b>당첨!!</b><span>'+esc(r.prize)+'</span><small>당첨 번호 '+esc(r.code)+'</small>'
    : '<div class="big-ic">🍀</div><b>아쉬워요!</b><span>다음 복권엔 행운이 올 거예요</span><small>신기록을 또 깨고 다시 긁어 봐요</small>';
  $('evDone').hidden=true; $('evShareBtn').hidden=true; $('evReveal').hidden=false;
  var cv=$('evCanvas'), rc=card.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(rc.width*dpr); cv.height=Math.round(rc.height*dpr); cv.style.opacity='1';
  var x=cv.getContext('2d'); x.globalCompositeOperation='source-over';
  var g=x.createLinearGradient(0,0,cv.width,cv.height); g.addColorStop(0,'#c9ccd1'); g.addColorStop(.5,'#eef0f2'); g.addColorStop(1,'#aeb3ba');
  x.fillStyle=g; x.fillRect(0,0,cv.width,cv.height);
  x.textAlign='center'; x.textBaseline='middle';
  x.fillStyle='rgba(255,255,255,.55)'; x.font=(14*dpr)+'px sans-serif';
  for(var yy=12*dpr; yy<cv.height; yy+=26*dpr) for(var xx=(yy/dpr%52?14:40)*dpr; xx<cv.width; xx+=52*dpr) x.fillText('★', xx, yy);
  x.fillStyle='#4a4f57'; x.font=(30*dpr)+'px Jua, sans-serif'; x.fillText('🍀 LUCKY 🍀', cv.width/2, cv.height/2-18*dpr);
  x.font=(18*dpr)+'px Jua, sans-serif'; x.fillText('손가락으로 쓱쓱 긁어 보세요!', cv.width/2, cv.height/2+20*dpr);
  x.globalCompositeOperation='destination-out'; x.lineCap='round'; x.lineJoin='round'; x.lineWidth=44*dpr;
  var down=false, last=null, moves=0, revealed=false;
  function pt(e){ var b=cv.getBoundingClientRect(); return {x:(e.clientX-b.left)*dpr, y:(e.clientY-b.top)*dpr}; }
  function check(){
    var d=x.getImageData(0,0,cv.width,cv.height).data, clear=0, tot=0;
    for(var i=3;i<d.length;i+=64){ tot++; if(d[i]<40) clear++; }
    if(clear/tot>0.5) reveal();
  }
  function reveal(){
    if(revealed) return; revealed=true; cv.style.opacity='0'; $('evReveal').hidden=true;
    if(typeof sfx==='function') sfx(r.win?'ok':'pop');
    if(r.win && typeof buzz==='function') buzz([60,40,60]);
    $('evDone').hidden=false;
    if(r.win){ $('evShareBtn').hidden=false; $('evShareBtn').textContent='💌 '+evAdminName()+' 님께 공유하고 선물 받기'; $('evShareBtn').onclick=function(){ evShare(r); }; }
  }
  cv.onpointerdown=function(e){ down=true; last=pt(e); try{ cv.setPointerCapture(e.pointerId); }catch(_){} x.beginPath(); x.arc(last.x,last.y,22*dpr,0,7); x.fill(); };
  cv.onpointermove=function(e){ if(!down||revealed) return; var p=pt(e); x.beginPath(); x.moveTo(last.x,last.y); x.lineTo(p.x,p.y); x.stroke(); last=p; if(++moves%8===0) check(); };
  cv.onpointerup=cv.onpointercancel=function(){ down=false; if(!revealed) check(); };
  $('evReveal').onclick=reveal;
}

/* ---- 당첨 페이지 공유 ---- */
function evWinUrl(r){
  var o={n:r.name||FB.name||'친구', p:r.prize, c:r.code, t:r.at};
  var b=btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return SITE_URL+'?win='+b;
}
function evShare(r){
  if(!r) return;
  var url=evWinUrl(r), title='🎉 크리스마스 복권 당첨!',
      text=(r.name||FB.name||'')+' 님이 놀이 공부방 크리스마스 복권에 당첨됐어요! 🎁 '+r.prize+' (당첨 번호 '+r.code+')\n'+evAdminName()+' 님, 선물 주세요~ 🎅';
  if(navigator.share){ navigator.share({title:title, text:text, url:url}).catch(function(){}); return; }
  var all=text+'\n'+url;
  try{ navigator.clipboard.writeText(all).then(function(){ evToast('당첨 페이지 주소를 복사했어요! 카톡에 붙여 넣어 보내 주세요.'); }, function(){ prompt('복사해서 보내 주세요', all); }); }
  catch(e){ prompt('복사해서 보내 주세요', all); }
}
function evToast(t){ var n=$('evToast'); n.textContent=t; n.hidden=false; clearTimeout(evToast.tm); evToast.tm=setTimeout(function(){ n.hidden=true; }, 2600); }
function evShowCert(){
  var m=location.search.match(/[?&]win=([^&]+)/); if(!m) return;
  try{
    var s=m[1].replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='=';
    var o=JSON.parse(decodeURIComponent(escape(atob(s))));
    $('certName').textContent=String(o.n||'').slice(0,20);
    $('certPrize').textContent=String(o.p||'').slice(0,40);
    $('certCode').textContent=String(o.c||'').slice(0,10);
    $('certDate').textContent=o.t ? fmtDT(new Date(+o.t)) : '';
    $('certModal').hidden=false;
  }catch(e){}
  $('certClose').onclick=function(){ $('certModal').hidden=true; history.replaceState(null,'',location.pathname); };
}
$('btnEvent').onclick=evOpen;
$('evClose').onclick=function(){ $('evModal').hidden=true; evBack(); };
function evBack(){ $('evScratch').hidden=true; $('evBody').hidden=false; $('evClose').hidden=false; evDraw(); }
$('evDone').onclick=evBack;
evShowCert();

/* ---- admin: event settings + winners (inside stats) ---- */
async function evAdminHTML(users){
  var c=EV.cfg||{}, wk=evWeekId(), ww=c.weekId===wk?(c.weekWon||0):0, h='<h3>🎄 크리스마스 복권 이벤트</h3>';
  h+='<div class="ev-adm">'+
    '<label class="chk"><input type="checkbox" id="eaOn"'+(c.on?' checked':'')+'> 이벤트 켜기</label>'+
    '<label>한 장 당첨 확률(%)<input id="eaProb" inputmode="decimal" value="'+(c.prob!=null?c.prob:10)+'"></label>'+
    '<label>일주일 최대 당첨<input id="eaWeekly" inputmode="numeric" value="'+(c.weekly!=null?c.weekly:1)+'"></label>'+
    '<label>마감일<input id="eaEnd" type="date" value="'+esc(c.end||'2026-12-25')+'"></label>'+
    '<label class="full">랜덤 선물 목록 (쉼표로 구분)<input id="eaPrizes" value="'+esc(c.prizes||'🍫 초콜릿, 🧸 인형, 📒 예쁜 공책, 🍦 아이스크림')+'"></label>'+
    '<label class="full">공유받을 관리자 이름<input id="eaAdmin" value="'+esc(c.admin||'이미진')+'"></label>'+
    '<div class="ev-adm-b"><button class="acct-btn" id="eaSave">저장</button></div>'+
    '<p class="muted full" id="eaMsg">이번 주 당첨 '+ww+' / '+(c.weekly!=null?c.weekly:1)+' · 전체 당첨 '+(c.won||0)+'</p></div>';
  var ws=[];
  try{ var q=await FB.db.collection('winners').get(); q.forEach(function(x){ var d=x.data(); d.id=x.id; d.atD=tsDate(d.at); ws.push(d); }); }catch(e){}
  ws.sort(function(a,b){ return (b.atD||0)-(a.atD||0); });
  h+='<h4>당첨자 '+ws.length+'명</h4><div class="tw"><table><tr><th>시간</th><th>이름</th><th>선물</th><th>당첨 번호</th><th>지급</th></tr>';
  if(!ws.length) h+='<tr><td colspan="5" class="muted">아직 당첨자가 없어요.</td></tr>';
  ws.forEach(function(w){ h+='<tr><td>'+fmtDT(w.atD)+'</td><td>'+esc(w.name)+'</td><td>'+esc(w.prize)+'</td><td><b>'+esc(w.code)+'</b></td><td><button class="acct-btn ea-give" data-id="'+esc(w.id)+'" data-g="'+(w.given?1:0)+'">'+(w.given?'✅ 줬음':'안 줬음')+'</button></td></tr>'; });
  h+='</table></div>';
  var evs={};
  try{ var g=await FB.db.collectionGroup('event').get(); g.forEach(function(x){ if(x.id===EV_ID) evs[x.ref.parent.parent.id]=x.data(); }); }catch(e){}
  var ks=Object.keys(evs);
  if(ks.length){
    h+='<h4>참여 현황</h4><div class="tw"><table><tr><th>이름</th><th>받은 복권</th><th>긁음</th><th>당첨</th></tr>';
    ks.sort(function(a,b){ return (evs[b].earned||0)-(evs[a].earned||0); }).forEach(function(k){
      var e=evs[k], wn=(e.hist||[]).filter(function(r){ return r.win; }).length;
      h+='<tr><td>'+esc(users[k]?users[k].name:'?')+'</td><td>'+(e.earned||0)+'</td><td>'+(e.used||0)+'</td><td>'+wn+'</td></tr>'; });
    h+='</table></div>';
  }
  return h;
}
function evAdminBind(){
  if(!$('eaSave')) return;
  function msg(t){ $('eaMsg').textContent=t; }
  $('eaSave').onclick=function(){
    var d={on:$('eaOn').checked, prob:Math.max(0,Math.min(100,+$('eaProb').value||0)), weekly:Math.max(0,parseInt($('eaWeekly').value,10)||0),
      end:$('eaEnd').value||'', prizes:$('eaPrizes').value.trim().slice(0,200), admin:$('eaAdmin').value.trim().slice(0,10)||'이미진'};
    FB.db.doc('config/event').set(d,{merge:true}).then(function(){ msg('저장했어요! ✅'); }, function(e){ msg('저장 실패 ('+(e.code||'오류')+')'); });
  };
  document.querySelectorAll('.ea-give').forEach(function(b){ b.onclick=function(){
    var g=b.dataset.g!=='1';
    FB.db.doc('winners/'+b.dataset.id).update({given:g}).then(function(){ b.dataset.g=g?1:0; b.textContent=g?'✅ 줬음':'안 줬음'; });
  }; });
}

renderAcct(); fbInit();
