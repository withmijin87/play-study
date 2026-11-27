/* ================= LOGIN & SCORES (Firebase) ================= */
var FB={ok:false, user:null, name:'', bests:{}};
function fbInit(){
  if(!FIREBASE_CONFIG || !window.firebase) return;
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    FB.auth=firebase.auth(); FB.db=firebase.firestore(); FB.ok=true;
    FB.auth.onAuthStateChanged(onUser);
    (function(){ var k='visit_'+dayId(new Date()); var seen=false; try{ seen=!!localStorage.getItem(k); localStorage.setItem(k,'1'); }catch(e){} if(!seen) statInc('visits'); })();
    if(typeof evWatch==='function') evWatch();
    FB.db.doc('config/site').onSnapshot(function(d){ if(d.exists && d.data().skin) applySkin(d.data().skin); }, function(){});
  }catch(e){ FB.ok=false; }
}
async function sha(t){ var b=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map(function(x){ return x.toString(16).padStart(2,'0'); }).join(''); }
function validBirth(b){
  if(/^\d{4}$/.test(b)){ var mm=+b.slice(0,2), dd=+b.slice(2,4), t=new Date(2024,mm-1,dd); return mm>=1 && mm<=12 && t.getMonth()===mm-1 && t.getDate()===dd; }
  if(!/^\d{8}$/.test(b)) return false;
  var y=+b.slice(0,4), m=+b.slice(4,6), d=+b.slice(6,8), dt=new Date(y,m-1,d);
  return y>=1900 && y<=new Date().getFullYear() && dt.getMonth()===m-1 && dt.getDate()===d;
}
async function doLogin(name, birth, age){
  var h=await sha(name+'|'+birth), email='u'+h.slice(0,28)+'@play-study.app', pw='ps-'+birth+'!';
  try{ var cr=await FB.auth.signInWithEmailAndPassword(email,pw); FB.name=name; FB.db.doc('users/'+cr.user.uid).set({birth:birth, age:age},{merge:true}).catch(function(){}); }
  catch(e){
    if(['auth/invalid-credential','auth/user-not-found','auth/invalid-login-credentials','auth/wrong-password'].indexOf(e.code)<0) throw e;
    var c=await FB.auth.createUserWithEmailAndPassword(email,pw);
    await FB.db.doc('users/'+c.user.uid).set({name:name, birth:birth, age:age, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    FB.name=name; FB.isNew=true;
  }
}
async function onUser(u){
  FB.user=u; FB.bests={};
  if(u){
    try{
      var d=await FB.db.doc('users/'+u.uid).get(); if(d.exists && d.data().name) FB.name=d.data().name;
      var qs=await FB.db.collection('users/'+u.uid+'/scores').get(); qs.forEach(function(x){ FB.bests[x.id]=x.data(); });
      try{ var ad=await FB.db.doc('admins/'+u.uid).get(); FB.isAdmin=ad.exists; }catch(e){ FB.isAdmin=false; }
    }catch(e){}
  }else{ FB.name=''; FB.isAdmin=false; }
  if(typeof evLoad==='function') await evLoad();
  if(typeof rvLoad==='function') await rvLoad();
  if(u && FB.pending){ var pd=FB.pending; FB.pending=null; saveScore(pd[0],pd[1],pd[2],pd[3],true); }
  renderAcct(); if(!$('start').hidden) syncKind();
}
function renderAcct(){
  var on=!!FB.user;
  $('acctName').textContent = on ? (FB.isAdmin?'👑 ':'👤 ')+(FB.name||'친구')+' 님'+(FB.isAdmin?' (관리자)':'') : '👤 손님 (기록은 이 기기에만)';
  $('skin').hidden = FB.ok && !FB.isAdmin;
  $('btnStats').hidden = !(on && FB.isAdmin);
  $('btnLogin').textContent = on ? '로그아웃' : '로그인';
  $('btnRec').hidden = !on;
}
function saveScore(game, kind, score, wrong, noStat){
  if(!noStat) statInc('plays');
  if(FB.ok && !FB.user && game && kind){ FB.pending=[game,kind,score,wrong]; if(typeof evGuestNudge==='function') evGuestNudge(); return; }
  if(!FB.ok || !FB.user || !game || !kind){ if(typeof evOnScore==='function') evOnScore(false); return; }
  var id=game+'_'+kind, prev=FB.bests[id]||{}, better = game==='match' ? (!prev.best || score<prev.best) : score>(prev.best||0);
  var inc=firebase.firestore.FieldValue.increment(1), now=firebase.firestore.FieldValue.serverTimestamp();
  var data={game:game, kind:kind, plays:inc, last:score, updatedAt:now}; if(better) data.best=score;
  FB.bests[id]={game:game, kind:kind, best: better?score:prev.best, plays:(prev.plays||0)+1, last:score};
  if(typeof evOnScore==='function') evOnScore(better && score>0);
  var base='users/'+FB.user.uid;
  FB.db.doc(base+'/scores/'+id).set(data,{merge:true}).catch(function(){});
  FB.db.collection(base+'/plays').add({game:game, kind:kind, score:score, wrong:wrong||0, at:now, expireAt:firebase.firestore.Timestamp.fromDate(new Date(Date.now()+365*864e5))}).catch(function(){});
}
var LG_KEY='ps_login';
function lgSaved(){ try{ return JSON.parse(localStorage.getItem(LG_KEY)||'null'); }catch(e){ return null; } }
function lgAge(a){ document.querySelectorAll('#lgAges button').forEach(function(b){ b.classList.toggle('on', +b.dataset.age===a); }); $('lgAges').dataset.age=a||''; }
function openLogin(){
  $('lgErr').textContent = FB.ok ? '' : '로그인 기능은 아직 준비 중이에요. (Firebase 설정이 필요해요)';
  $('lgGo').disabled=!FB.ok; $('loginModal').hidden=false;
  var sv=lgSaved();
  if(sv){ $('lgName').value=sv.n||''; lgSetBirth(sv.b); lgAge(+sv.a||0); $('lgRemember').checked=true; }
  else { lgAge(0); }
  if(FB.ok && !sv) setTimeout(function(){ try{ $('lgName').focus(); }catch(e){} }, 50);
}
document.querySelectorAll('#lgAges button').forEach(function(b){ b.onclick=function(){ lgAge(+b.dataset.age); }; });
$('btnLogin').onclick=function(){ if(FB.user){ FB.auth.signOut(); return; } openLogin(); };
$('lgCancel').onclick=function(){ $('loginModal').hidden=true; };
function lgFillDays(){
  var m=+$('lgMon').value, cur=$('lgDay').value, n=m?new Date(2024,m,0).getDate():31, h='<option value="">일</option>';
  for(var d=1; d<=n; d++) h+='<option value="'+String(d).padStart(2,'0')+'">'+d+'일</option>';
  $('lgDay').innerHTML=h; if(cur && +cur<=n) $('lgDay').value=cur;
}
function lgBdMode(text){
  $('lgBdSel').hidden=text; $('lgBirth').hidden=!text;
  $('lgBdSw').textContent = text ? '월·일 고르기로 입력' : '숫자로 직접 입력';
}
function lgSetBirth(b){
  b=String(b||'');
  if(b.length===8){ lgBdMode(true); $('lgBirth').value=b; return; }
  lgBdMode(false); $('lgMon').value=b.slice(0,2); lgFillDays(); $('lgDay').value=b.slice(2,4);
}
function lgGetBirth(){ return $('lgBirth').hidden ? ($('lgMon').value && $('lgDay').value ? $('lgMon').value+$('lgDay').value : '') : $('lgBirth').value.trim(); }
$('lgMon').onchange=lgFillDays; lgFillDays();
$('lgBdSw').onclick=function(){ var t=!$('lgBirth').hidden; lgBdMode(!t); };
$('lgBirth').addEventListener('input', function(){ this.value=this.value.replace(/\D/g,'').slice(0,8); });
$('lgGo').onclick=async function(){
  var name=$('lgName').value.trim().replace(/\s+/g,''), birth=lgGetBirth(), age=+$('lgAges').dataset.age||0;
  if(!name){ $('lgErr').textContent='이름을 써 주세요.'; return; }
  if(!validBirth(birth)){ $('lgErr').textContent = $('lgBirth').hidden ? '생일의 월과 일을 골라 주세요.' : '생일을 숫자로 써 주세요. 예) 2월 28일 → 0228'; return; }
  if(!age){ $('lgErr').textContent='몇 살인지 골라 주세요.'; return; }
  $('lgGo').disabled=true; $('lgErr').textContent='들어가는 중…';
  try{ await doLogin(name,birth,age); FB.age=age; statInc('logins'); $('loginModal').hidden=true;
    try{ if($('lgRemember').checked) localStorage.setItem(LG_KEY, JSON.stringify({n:name,b:birth,a:age})); else { localStorage.removeItem(LG_KEY); $('lgName').value=''; $('lgBirth').value=''; lgSetBirth(''); } }catch(e){}
    if(FB.isNew){ FB.isNew=false; renderAcct(); } }
  catch(e){ $('lgErr').textContent='로그인하지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요. ('+(e.code||'오류')+')'; }
  $('lgGo').disabled=false;
};
var REC_KINDS=[['word','영어'],['math','수학'],['frac','분수'],['clock','시계'],['money','돈'],['length','길이'],['hanja','한자']];
var REC_GAMES=[['stairs','🪜 계단','층'],['balloon','🎈 풍선','점'],['tower','🧱 블록','층'],['match','🔗 짝','']];
$('btnRec').onclick=function(){
  var h='<table><tr><th>과목</th>'+REC_GAMES.map(function(g){ return '<th>'+g[1]+'</th>'; }).join('')+'</tr>';
  REC_KINDS.forEach(function(k){
    h+='<tr><td>'+k[1]+'</td>'+REC_GAMES.map(function(g){
      var r=FB.bests[g[0]+'_'+k[0]];
      if(!r || !r.best) return '<td class="none">-</td>';
      var v = g[0]==='match' ? fmtTime(r.best) : r.best+g[2];
      return '<td>'+v+'<br><small style="color:var(--muted)">'+(r.plays||0)+'판</small></td>';
    }).join('')+'</tr>';
  });
  $('recBody').innerHTML=h+'</table>';
  $('recTitle').textContent=(FB.name||'')+' 님의 최고 기록';
  $('myId').textContent='내 ID: '+(FB.user?FB.user.uid:'');
  $('recModal').hidden=false;
};
$('recClose').onclick=function(){ $('recModal').hidden=true; };

/* ================= ADMIN STATS ================= */
function dayId(d){ return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'); }
function statInc(f){
  if(!FB.ok) return;
  var o={}; o[f]=firebase.firestore.FieldValue.increment(1);
  FB.db.doc('stats/d_'+dayId(new Date())).set(o,{merge:true}).catch(function(){});
}
function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function tsDate(t){ return t && t.toDate ? t.toDate() : (typeof t==='number' ? new Date(t) : null); }
function fmtDT(d){ return d ? (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') : '-'; }
var GNAME={stairs:'🪜 계단',balloon:'🎈 풍선',tower:'🧱 블록',match:'🔗 짝'};
var KNAME={word:'영어',math:'수학',frac:'분수',clock:'시계',money:'돈',length:'길이',hanja:'한자'};
function fmtAge(a){ return a>=99?'어른':a>=11?'11살+':a+'살'; }
function fmtBirth(b){ b=String(b||''); if(b.length===8) b=b.slice(4); return b.length===4 ? '('+(+b.slice(0,2))+'/'+(+b.slice(2))+')' : ''; }
function fmtScore(g,v){ return g==='match' ? fmtTime(v) : v+(g==='balloon'?'점':'층'); }
var STATS_DAYS=30;
async function openStats(){
  $('statsModal').hidden=false; $('statsBody').textContent='불러오는 중…';
  try{
    var days=[]; for(var i=6;i>=0;i--){ var d=new Date(); d.setDate(d.getDate()-i); days.push(dayId(d)); }
    var stats=await Promise.all(days.map(function(id){ return FB.db.doc('stats/d_'+id).get().then(function(x){ return x.exists?x.data():{}; }); }));
    var us=await FB.db.collection('users').get(), users={};
    us.forEach(function(x){ users[x.id]={name:x.data().name||'?', birth:x.data().birth||'', age:x.data().age||0, created:tsDate(x.data().createdAt), plays:0, last:null, kinds:{}}; });
    /* 사용자별 합계: 최고기록 문서(scores)의 판수로 집계 → 기록이 쌓여도 읽기 양 일정 */
    var sc=await FB.db.collectionGroup('scores').get();
    sc.forEach(function(x){ var uid=x.ref.parent.parent.id, d=x.data(), u=users[uid], at=tsDate(d.updatedAt); if(!u) return;
      u.plays+=(d.plays||0); if(at && (!u.last||at>u.last)) u.last=at; if(d.kind) u.kinds[d.kind]=(u.kinds[d.kind]||0)+(d.plays||0); });
    /* 최근 30일 플레이 기록만 읽기 (사용자별 쿼리라 추가 색인 설정 필요 없음) */
    var since=new Date(); since.setDate(since.getDate()-STATS_DAYS); since.setHours(0,0,0,0);
    var plays=[], sinceTs=firebase.firestore.Timestamp.fromDate(since);
    await Promise.all(Object.keys(users).map(function(uid){
      return FB.db.collection('users/'+uid+'/plays').where('at','>=',sinceTs).orderBy('at','desc').limit(500).get().then(function(ps){
        ps.forEach(function(x){ var d=x.data(); plays.push({uid:uid, game:d.game, kind:d.kind, score:d.score, wrong:d.wrong, at:tsDate(d.at)}); });
      }).catch(function(){});
    }));
    plays.sort(function(a,b){ return (b.at||0)-(a.at||0); });
    var today=stats[6], ucount=Object.keys(users).length, todayStart=new Date(); todayStart.setHours(0,0,0,0);
    var todayActive=Object.keys(users).filter(function(k){ return users[k].last && users[k].last>=todayStart; }).length;
    var h='<div class="kpis">'+
      '<div class="kpi"><b>'+(today.visits||0)+'</b><span>오늘 방문(기기)</span></div>'+
      '<div class="kpi"><b>'+(today.plays||0)+'</b><span>오늘 게임 판수</span></div>'+
      '<div class="kpi"><b>'+todayActive+'</b><span>오늘 기록 남긴 사람</span></div>'+
      '<div class="kpi"><b>'+ucount+'</b><span>전체 가입자</span></div></div>';
    var mx=Math.max(1,Math.max.apply(null,stats.map(function(x){ return x.plays||0; })));
    h+='<h3>최근 7일</h3><div class="tw"><table><tr><th>날짜</th><th>방문</th><th>로그인</th><th>게임 판수</th></tr>';
    days.forEach(function(id,i){ var x=stats[i]; h+='<tr><td>'+id.slice(4,6)+'/'+id.slice(6)+'</td><td>'+(x.visits||0)+'</td><td>'+(x.logins||0)+'</td><td>'+(x.plays||0)+'<span class="bar" style="width:'+Math.round((x.plays||0)/mx*80)+'px"></span></td></tr>'; });
    h+='</table></div>';
    var kc={}; plays.forEach(function(p){ kc[p.kind]=(kc[p.kind]||0)+1; });
    var kmax=Math.max(1,Math.max.apply(null,Object.keys(kc).map(function(k){ return kc[k]; }).concat([0])));
    h+='<h3>과목별 인기 (최근 '+STATS_DAYS+'일)</h3><div class="tw"><table><tr><th>과목</th><th>판수</th></tr>';
    Object.keys(KNAME).forEach(function(k){ h+='<tr><td>'+KNAME[k]+'</td><td>'+(kc[k]||0)+'<span class="bar" style="width:'+Math.round((kc[k]||0)/kmax*120)+'px"></span></td></tr>'; });
    h+='</table></div>';
    var exl=(EV.cfg&&EV.cfg.excluded)||[];
    h+='<h3>사용자별</h3><div class="tw"><table><tr><th>이름 (생일·나이)</th><th>가입</th><th>판수</th><th>마지막</th><th>많이 한 과목</th><th>이벤트</th></tr>';
    Object.keys(users).sort(function(a,b){ return (users[b].last||0)-(users[a].last||0); }).forEach(function(k){
      var u=users[k], top=Object.keys(u.kinds).sort(function(a,b){ return u.kinds[b]-u.kinds[a]; })[0];
      var ex=exl.indexOf(k)>=0;
      h+='<tr><td>'+esc(u.name)+' <small class="muted">'+fmtBirth(u.birth)+(u.age?' '+fmtAge(u.age):'')+'</small></td><td>'+(u.created?(u.created.getMonth()+1)+'/'+u.created.getDate():'-')+'</td><td>'+u.plays+'</td><td>'+fmtDT(u.last)+'</td><td>'+(top?KNAME[top]||top:'-')+'</td><td><button class="acct-btn ex-tog'+(ex?' on':'')+'" data-uid="'+esc(k)+'">'+(ex?'🚫 제외':'참여')+'</button></td></tr>'; });
    h+='</table></div>';
    if(typeof rvAdminHTML==='function') h+=await rvAdminHTML(users);
    h+='<h3>최근 기록 30개</h3><div class="tw"><table><tr><th>시간</th><th>이름</th><th>게임</th><th>과목</th><th>기록</th><th>틀림</th></tr>';
    plays.slice(0,30).forEach(function(p){ var u=users[p.uid]; h+='<tr><td>'+fmtDT(p.at)+'</td><td>'+esc(u?u.name:'?')+'</td><td>'+(GNAME[p.game]||esc(p.game))+'</td><td>'+(KNAME[p.kind]||esc(p.kind))+'</td><td>'+fmtScore(p.game,+p.score||0)+'</td><td>'+(p.wrong||0)+'</td></tr>'; });
    h+='</table></div><p class="muted">방문 수는 기기 기준으로 하루 한 번만 셉니다. 게임 판수는 손님 포함, 사용자별 판수는 전체 기간, 과목별 인기·최근 기록은 최근 '+STATS_DAYS+'일 로그인 기록입니다.</p>';
    if(typeof evAdminHTML==='function') h=(await evAdminHTML(users))+h;
    $('statsBody').innerHTML=h;
    if(typeof evAdminBind==='function') evAdminBind();
    document.querySelectorAll('.ex-tog').forEach(function(b){ b.onclick=function(){
      var on=!b.classList.contains('on'), F=firebase.firestore.FieldValue;
      b.disabled=true;
      FB.db.doc('config/event').set({excluded: on ? F.arrayUnion(b.dataset.uid) : F.arrayRemove(b.dataset.uid)},{merge:true})
        .then(function(){ b.classList.toggle('on',on); b.textContent=on?'🚫 제외':'참여'; }, function(e){ alert('저장 실패 ('+(e.code||'오류')+')'); })
        .then(function(){ b.disabled=false; });
    }; });
  }catch(e){ $('statsBody').textContent='통계를 불러오지 못했어요. Firestore 보안 규칙을 확인해 주세요. ('+(e.code||e.message||'오류')+')'; }
}
$('btnStats').onclick=openStats;
$('statsClose').onclick=function(){ $('statsModal').hidden=true; };

