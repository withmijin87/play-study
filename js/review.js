/* ================= 오답 복습 (틀린 문제 다시 내기) =================
   - 틀린 문제를 과목별로 저장 (로그인: users/{uid}/wrongs/{kind}, 손님: localStorage)
   - 다음 판부터 문제 3개 중 1개꼴로 다시 출제, 2번 연속 맞히면 졸업
   - 수학·시계 등 랜덤 문제는 seed + 설정(ctx)만 저장해서 똑같이 다시 만듦 */
var RV_MAX=50, RV_RATE=1/3, RV_GRAD=2, RV_LOCAL='ps_wrongs';
var RV_KINDS=['word','math','frac','clock','money','length','hanja'];
var RV={data:{}, dirty:{}, sess:{}, start:0, only:false, onlyNext:null, stat:{asked:0, grad:0, added:0}, uid:null};

/* ---------- seeded random ---------- */
function rvRng(seed){ var a=seed>>>0; return function(){ a=(a+0x6D2B79F5)>>>0; var t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
function rvCtx(kind){
  if(kind==='math') return {ops:Array.from(cfg.ops), lv:cfg.lv};
  if(kind==='frac') return {fm:cfg.fm, flv:cfg.flv};
  if(GSET[kind]) return {t:GSET[kind].t, l:GSET[kind].l};
  return null;
}
function rvWith(seed, kind, ctx, fn){
  var R=Math.random, sv=null;
  if(ctx){
    if(kind==='math'){ sv={ops:cfg.ops, lv:cfg.lv}; cfg.ops=new Set(ctx.ops); cfg.lv=ctx.lv; }
    else if(kind==='frac'){ sv={fm:cfg.fm, flv:cfg.flv}; cfg.fm=ctx.fm; cfg.flv=ctx.flv; }
    else if(GSET[kind]){ sv={t:GSET[kind].t, l:GSET[kind].l}; GSET[kind].t=ctx.t; GSET[kind].l=ctx.l; }
  }
  Math.random=rvRng(seed);
  try{ return fn(); }
  finally{
    Math.random=R;
    if(sv){ if(kind==='math'){ cfg.ops=sv.ops; cfg.lv=sv.lv; } else if(kind==='frac'){ cfg.fm=sv.fm; cfg.flv=sv.flv; } else { GSET[kind].t=sv.t; GSET[kind].l=sv.l; } }
  }
}
function rvGen(kind){
  if(kind==='math') return makeMath;
  if(kind==='frac') return makeFrac;
  return function(){ return GEN[kind]('x'); };
}

/* ---------- 출제 ---------- */
function rvList(kind){ return RV.data[kind] || (RV.data[kind]=[]); }
function rvKey(kind, q){ return kind==='word' ? (q && q.w) : (q && q.text); }
function rvDue(kind, filter){
  var now=RV.start;
  var list=rvList(kind).filter(function(it){ return !RV.sess[it.k] && (RV.only || it.at<now) && (!filter || filter(it)); });
  if(!list.length) return null;
  list.sort(function(a,b){ return (b.n-a.n) || (a.at-b.at); });
  return list[Math.floor(Math.random()*Math.min(3,list.length))];
}
function rvShouldServe(){ return RV.only || Math.random()<RV_RATE; }
/* 랜덤 문제 과목: fn()을 seed로 감싸서 실행 */
function rvMake(kind, fn){
  if(rvShouldServe()){
    var it=rvDue(kind);
    if(it){ RV.sess[it.k]=1; var q=rvWith(it.s, kind, it.c, fn); q._s=it.s; q._c=it.c; q._rv=it; RV.stat.asked++; return q; }
    if(RV.only) rvOnlyDone();
  }
  var seed=(Math.random()*4294967296)>>>0, ctx=rvCtx(kind), q2=rvWith(seed, kind, ctx, fn);
  q2._s=seed; q2._c=ctx; return q2;
}
/* 영어: 고른 글자 범위(pool) 안의 오답 단어 */
function rvWord(pool){
  if(!rvShouldServe()) return null;
  var keys={}; (RV.only?WORDS:pool).forEach(function(w){ keys[w.w]=w; });
  var it=rvDue('word', function(x){ return !!keys[x.k]; });
  if(!it){ if(RV.only) rvOnlyDone(); return null; }
  RV.sess[it.k]=1; RV.stat.asked++;
  return {w:keys[it.k], it:it};
}
function rvOnlyDone(){
  if(!RV.only) return; RV.only=false;
  rvToast('🎉 오답 복습 끝! 이제 새 문제가 나와요');
}

/* ---------- 결과 기록 ---------- */
function rvWrong(kind, q){
  var k=rvKey(kind,q); if(!k) return;
  RV.sess[k]=1;
  var list=rvList(kind), it=null;
  for(var i=0;i<list.length;i++) if(list[i].k===k){ it=list[i]; break; }
  if(it){ it.n++; it.ok=0; it.at=Date.now(); }
  else{
    it={k:k, n:1, ok:0, at:Date.now()};
    if(kind!=='word'){ it.s=q._s; it.c=q._c; if(it.s==null) return; }
    list.push(it); RV.stat.added++;
    if(list.length>RV_MAX){ list.sort(function(a,b){ return (b.n-a.n) || (b.at-a.at); }); list.length=RV_MAX; }
  }
  RV.dirty[kind]=1;
}
function rvRight(kind, q, rvItem){
  var k=rvKey(kind,q); if(!k) return;
  var list=rvList(kind), idx=-1;
  for(var i=0;i<list.length;i++) if(list[i].k===k){ idx=i; break; }
  if(idx<0) return;
  var it=list[idx]; it.ok++; RV.dirty[kind]=1;
  if(it.ok>=RV_GRAD){ list.splice(idx,1); RV.stat.grad++; rvToast('🎓 오답 졸업!'); sfx('lvl'); }
  else if(rvItem) rvToast('🔁 복습 성공! 한 번 더 맞히면 졸업');
}
function rvToast(t){
  if(!$('game').hidden){ banner(t); return; }
  if(!$('bgame').hidden){ var n=$('bNote'); n.textContent=t; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show'); }
}
function rvTag(on, host){
  var tg=$('rvTag'); if(!tg){ tg=document.createElement('div'); tg.id='rvTag'; tg.className='rv-tag'; tg.textContent='🔁 복습'; }
  if(!on){ tg.hidden=true; return; }
  if(host && tg.parentNode!==host) host.appendChild(tg);
  tg.hidden=false; tg.classList.remove('pop'); void tg.offsetWidth; tg.classList.add('pop');
}

/* ---------- 게임 시작 / 끝 ---------- */
function rvStart(){
  RV.sess={}; RV.start=Date.now(); RV.stat={asked:0, grad:0, added:0};
  RV.only=!!RV.onlyNext; RV.onlyNext=null;
  rvTag(false);
}
function rvResult(){
  var el=$('rvNote'); if(!el) return;
  var s=RV.stat, parts=[];
  if(s.asked) parts.push('🔁 복습 '+s.asked+'문제');
  if(s.grad) parts.push('🎓 졸업 '+s.grad+'개');
  if(s.added) parts.push('📒 오답노트에 '+s.added+'개 추가');
  el.textContent=parts.join(' · '); el.hidden=!parts.length;
}

/* ---------- 저장 / 불러오기 ---------- */
function rvLocalLoad(){ try{ return JSON.parse(localStorage.getItem(RV_LOCAL)||'{}')||{}; }catch(e){ return {}; } }
function rvLocalSave(){ try{ localStorage.setItem(RV_LOCAL, JSON.stringify(RV.data)); }catch(e){} }
function rvFlush(){
  var ks=Object.keys(RV.dirty); if(!ks.length) return; RV.dirty={};
  if(FB.ok && FB.user){
    ks.forEach(function(k){ FB.db.doc('users/'+FB.user.uid+'/wrongs/'+k).set({items:rvList(k), updatedAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(function(){}); });
  }else rvLocalSave();
}
async function rvLoad(){
  var uid=FB.user?FB.user.uid:null;
  if(!uid){ RV.uid=null; RV.data=rvLocalLoad(); return; }
  if(RV.uid===uid) return;
  RV.uid=uid; var cloud={};
  try{ var qs=await FB.db.collection('users/'+uid+'/wrongs').get(); qs.forEach(function(d){ cloud[d.id]=(d.data().items||[]); }); }catch(e){}
  /* 손님일 때 쌓인 오답은 로그인 계정으로 합치기 */
  var local=rvLocalLoad(), merged=false;
  Object.keys(local).forEach(function(k){
    var c=cloud[k]||(cloud[k]=[]), have={}; c.forEach(function(x){ have[x.k]=1; });
    (local[k]||[]).forEach(function(x){ if(!have[x.k]){ c.push(x); merged=true; } });
    if(c.length>RV_MAX){ c.sort(function(a,b){ return (b.n-a.n) || (b.at-a.at); }); c.length=RV_MAX; }
    RV.dirty[k]=1;
  });
  RV.data=cloud;
  if(Object.keys(local).length){ try{ localStorage.removeItem(RV_LOCAL); }catch(e){} rvFlush(); }
}
function rvCount(kind){ return rvList(kind).length; }

/* ---------- 📒 오답노트 ---------- */
function rvItemQ(kind, it){
  if(kind==='word'){ for(var i=0;i<WORDS.length;i++) if(WORDS[i].w===it.k) return {w:WORDS[i].w, word:WORDS[i]}; return null; }
  try{ return rvWith(it.s, kind, it.c, rvGen(kind)); }catch(e){ return null; }
}
function rvOpen(){
  var h='<p class="msub">틀린 문제는 다음 판에 다시 나와요.<br><b>2번 연속</b> 맞히면 졸업 🎓</p><div class="rv-kinds">', total=0;
  REC_KINDS.forEach(function(k){
    var n=rvCount(k[0]); total+=n;
    h+='<div class="rv-row'+(n?'':' empty')+'" data-k="'+k[0]+'"><button class="rv-open" data-k="'+k[0]+'"'+(n?'':' disabled')+'><span class="rv-nm">'+k[1]+'</span><span class="rv-n">'+(n?n+'개':'없음 ✨')+'</span></button>'+
       (n?'<button class="acct-btn rv-go" data-k="'+k[0]+'">오답만 풀기 ▶</button>':'')+'</div><div class="rv-list wrongs" id="rvL_'+k[0]+'" hidden></div>';
  });
  h+='</div>';
  if(!total) h+='<p class="msub" style="text-align:center">아직 오답이 없어요. 게임을 해 보세요! 🎮</p>';
  $('rvBody').innerHTML=h;
  $('rvBody').querySelectorAll('.rv-open').forEach(function(b){ b.onclick=function(){ rvShowList(b.dataset.k); }; });
  $('rvBody').querySelectorAll('.rv-go').forEach(function(b){ b.onclick=function(){ rvPlayOnly(b.dataset.k); }; });
  $('recModal').hidden=true; $('rvModal').hidden=false;
}
function rvShowList(kind){
  var box=$('rvL_'+kind); if(!box) return;
  if(!box.hidden){ box.hidden=true; return; }
  box.innerHTML='';
  rvList(kind).slice().sort(function(a,b){ return (b.n-a.n) || (b.at-a.at); }).forEach(function(it){
    var q=rvItemQ(kind,it); if(!q) return;
    var row=document.createElement('div'); row.className='rv-item';
    var chip=wrongChip(kind==='word' ? q.word : q); chip.classList.add('rv-chip');
    var meta=document.createElement('span'); meta.className='rv-meta';
    meta.innerHTML='✖'+it.n+(it.ok?'<br><b>✔'+it.ok+'/'+RV_GRAD+'</b>':'');
    row.appendChild(chip); row.appendChild(meta); box.appendChild(row);
  });
  box.hidden=false;
}
function rvPlayOnly(kind){
  $('rvModal').hidden=true;
  cfg.kind=kind; cfg.game='stairs';
  if(kind==='math' && !cfg.ops.size) cfg.ops=new Set(['+','-']);
  try{ syncKind(); }catch(e){}
  RV.onlyNext=kind;
  startGame();
}
$('rvClose').onclick=function(){ $('rvModal').hidden=true; };
$('btnRv').onclick=rvOpen;

/* ---------- 관리자: 아이별 자주 틀리는 문제 TOP 5 ---------- */
async function rvAdminHTML(users){
  var per={};
  try{
    var g=await FB.db.collectionGroup('wrongs').get();
    g.forEach(function(x){ var uid=x.ref.parent.parent.id, kind=x.id;
      (x.data().items||[]).forEach(function(it){ (per[uid]=per[uid]||[]).push({kind:kind, it:it}); }); });
  }catch(e){ return '<h3>자주 틀리는 문제 (아이별 TOP 5)</h3><p class="muted">불러오지 못했어요. Firestore 규칙에 wrongs 읽기 권한을 추가해 주세요. ('+esc(e.code||'오류')+')</p>'; }
  var uids=Object.keys(per).filter(function(u){ return users[u]; });
  var h='<h3>자주 틀리는 문제 (아이별 TOP 5)</h3>';
  if(!uids.length) return h+'<p class="muted">아직 쌓인 오답이 없어요.</p>';
  uids.sort(function(a,b){ return per[b].length-per[a].length; });
  h+='<div class="rv-adm">';
  uids.forEach(function(uid){
    var list=per[uid].sort(function(a,b){ return (b.it.n-a.it.n) || (b.it.at-a.it.at); }), top=list.slice(0,5), u=users[uid];
    var kc={}; list.forEach(function(x){ kc[x.kind]=(kc[x.kind]||0)+1; });
    h+='<div class="rv-adm-u"><div class="rv-adm-h"><b>'+esc(u.name)+'</b><span>오답 '+list.length+'개 · '+Object.keys(kc).map(function(k){ return (KNAME[k]||k)+' '+kc[k]; }).join(', ')+'</span></div><div class="rv-adm-l">';
    top.forEach(function(x){
      var q=rvItemQ(x.kind, x.it), body;
      if(!q) return;
      if(x.kind==='word') body='<img src="'+(IMG[q.w]||'')+'" alt="">'+esc(q.w)+' <small>'+esc(q.word.ko)+'</small>';
      else if(q.recHTML) body=q.recHTML;
      else if(q.frac) body=fracHTML(q.k,q.n)+'<span>'+esc(q.text)+'</span>';
      else body='<span>'+esc(q.text)+' = '+esc(q.r)+'</span>';
      h+='<div class="rv-adm-i"><span class="rv-adm-k">'+(KNAME[x.kind]||x.kind)+'</span><span class="rv-adm-q">'+body+'</span><span class="rv-adm-n">✖'+x.it.n+'</span></div>';
    });
    h+='</div></div>';
  });
  return h+'</div>';
}
