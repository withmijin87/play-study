/* ================= SKIN (basic / christmas) ================= */
var XM=true;
var PAL={
  basic:{step:['#ffb347','#7fd1c7','#ff8fa3','#a8c8ff','#ffd966'],
    sky:[[0,[110,196,255],[200,236,255]],[20,[255,170,120],[255,224,170]],[40,[120,80,170],[255,150,140]],[60,[20,30,80],[70,60,140]],[90,[5,5,25],[25,20,70]]],
    tcol:['#ff8fa3','#7fd1c7','#ffd966','#a8c8ff','#c3a6ff','#ffb347'],
    bcol:[['#ff8fa3','#ffd0da'],['#7fd1c7','#d2f3ee'],['#ffd966','#fff2c2'],['#a8c8ff','#e1ecff'],['#c3a6ff','#ece3ff'],['#ffb347','#ffe2bd']],
    hb:['#ff8fa3','#7fd1c7','#ffd966','#a8c8ff','#c3a6ff','#ffb347']},
  xmas:{step:STEP_COL.slice(), sky:SKY.map(function(x){ return x.slice(); }), tcol:TCOL.slice(), bcol:BCOL.map(function(x){ return x.slice(); }), hb:HB.map(function(b){ return b.c; })}
};
function setArr(a,b){ a.length=0; b.forEach(function(x){ a.push(x); }); }
function applySkin(sk){
  if(!PAL[sk]) sk='xmas';
  XM = sk==='xmas'; document.documentElement.classList.toggle('xm', XM);
  var P=PAL[sk]; setArr(STEP_COL,P.step); setArr(SKY,P.sky); setArr(TCOL,P.tcol); setArr(BCOL,P.bcol);
  HB.forEach(function(b,i){ b.c=P.hb[i%P.hb.length]; });
  document.querySelectorAll('#skin button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.s===sk); });
  try{ localStorage.setItem('skin', sk); }catch(e){}
}
document.querySelectorAll('#skin button').forEach(function(b){
  b.addEventListener('pointerdown', function(e){ e.stopPropagation(); });
  b.onclick=function(e){ e.stopPropagation(); applySkin(b.dataset.s);
    if(typeof FB!=='undefined' && FB.ok && FB.isAdmin){ FB.db.doc('config/site').set({skin:b.dataset.s, updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(function(){}); } };
});
(function(){ var sk='xmas'; try{ sk=localStorage.getItem('skin')||'xmas'; }catch(e){} applySkin(sk); })();
