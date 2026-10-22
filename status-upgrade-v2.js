(()=>{
  'use strict';
  const PARTY_KEY='our-rpg-party-v1';
  const q=(d,...ids)=>ids.map(id=>d.getElementById(id)).find(Boolean)||null;
  const value=(d,ids,fallback='')=>{const el=q(d,...ids);return el?String(el.value??'').trim():fallback};
  const number=(d,ids)=>{const n=Number(value(d,ids,'0'));return Number.isFinite(n)?n:0};
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch(_){return fallback}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function install(d){
    if(!d||!d.body||d.getElementById('statusUpgradeV2'))return;
    const form=d.querySelector('.form');
    const dashboard=d.getElementById('statusDashboard');
    if(!form||!dashboard)return;

    const style=d.createElement('style');
    style.id='statusUpgradeV2Style';
    style.textContent=`
      #statusUpgradeV2{border:1px solid #80682f;background:linear-gradient(135deg,#17231e,#0b1512);padding:15px;margin:14px 0}
      .su-head,.su-actions,.su-stats{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.su-head{justify-content:space-between}.su-head h2{margin:0;color:#f0cf7c;font-size:20px}.su-head p{margin:3px 0 0;color:#9eb0a8;font-size:12px}
      .su-score{font-size:25px;font-weight:900;color:#7dd5a5}.su-progress{height:9px;background:#07100d;border-radius:99px;overflow:hidden;margin:11px 0}.su-progress span{display:block;height:100%;background:linear-gradient(90deg,#58c791,#d8ac55);transition:width .2s}
      .su-stats{display:grid;grid-template-columns:repeat(5,1fr)}.su-stat{border:1px solid #30483e;background:#0a1310;padding:10px}.su-stat b,.su-stat small{display:block}.su-stat b{color:#f5dda0;font-size:17px}.su-stat small{color:#9eb0a8;font-size:11px}
      .su-warnings{margin:10px 0 0;padding:0;list-style:none}.su-warnings li{border-left:3px solid #d8ac55;background:#211c11;padding:7px 9px;margin-top:5px;color:#f4dfac;font-size:12px}.su-warnings .ok{border-color:#58c791;background:#10231b;color:#bfe9d3}
      .su-actions{margin-top:11px}.su-actions button,.su-search{min-height:42px;border:1px solid #49665a;background:#112019;color:#e8f0ec;padding:8px 11px;font:inherit;font-weight:800}.su-actions button.primary{border-color:#80682f;background:#352a14;color:#f6dfa5}.su-search{flex:1;min-width:190px;font-weight:500}
      .status-section.su-collapsed>.body{display:none}.status-section.su-match{box-shadow:0 0 0 2px #d8ac55}.su-toggle{float:right;min-height:34px!important;border:1px solid #49665a!important;background:#112019!important;color:#dce8e2!important;padding:4px 9px!important;font-size:12px!important}
      @media(max-width:760px){.su-stats{grid-template-columns:1fr 1fr}.su-stat:last-child{grid-column:1/-1}.su-actions>*{flex:1 1 45%}.su-search{flex-basis:100%}}
    `;
    d.head.appendChild(style);

    const box=d.createElement('section');
    box.id='statusUpgradeV2';
    box.innerHTML=`<div class="su-head"><div><h2>🧭 내 모험 준비도</h2><p>현황표의 필수 기록·전투 수치·파티 상태를 한눈에 확인해.</p></div><strong class="su-score" id="suScore">0%</strong></div><div class="su-progress"><span id="suProgress"></span></div><div class="su-stats"><div class="su-stat"><b id="suPower">0</b><small>전투 참고 합계</small></div><div class="su-stat"><b id="suHp">0 / 0</b><small>현재 HP</small></div><div class="su-stat"><b id="suGear">0 / 4</b><small>장비 착용</small></div><div class="su-stat"><b id="suBag">0 / 20</b><small>인벤토리</small></div><div class="su-stat"><b id="suParty">없음</b><small>현재 파티</small></div></div><ul class="su-warnings" id="suWarnings"></ul><div class="su-actions"><input class="su-search" id="suSearch" type="search" placeholder="현황표 항목 찾기"><button type="button" id="suFindEmpty">다음 빈칸 찾기</button><button type="button" id="suCollapse">모두 접기</button><button type="button" class="primary" id="suCopy">디스코드 현황 복사</button></div>`;
    dashboard.insertAdjacentElement('afterend',box);

    const sections=[...form.querySelectorAll('.status-section')];
    sections.forEach((section,index)=>{
      const head=section.querySelector('.section-head');
      if(!head||head.querySelector('.su-toggle'))return;
      const button=d.createElement('button');const form=d.getElementById('form')||d.querySelector('.form');
      button.type='button';button.className='su-toggle';button.textContent='접기';button.setAttribute('aria-expanded','true');
      button.addEventListener('click',()=>{const off=section.classList.toggle('su-collapsed');button.textContent=off?'펼치기':'접기';button.setAttribute('aria-expanded',String(!off))});
      head.appendChild(button);section.dataset.suIndex=String(index);
    });

    let emptyIndex=0;
    function fields(){return [...form.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(el=>!el.disabled)}
    function filled(el){return el.tagName==='SELECT'?el.selectedIndex>0:String(el.value||'').trim()!==''}
    function refresh(){
      const essentials=[q(d,'playerName'),q(d,'characterName'),q(d,'race'),q(d,'job'),q(d,'hpMax'),q(d,'attack'),q(d,'defense'),q(d,'speed'),q(d,'region')].filter(Boolean);
      const done=essentials.filter(filled).length,score=essentials.length?Math.round(done/essentials.length*100):0;
      d.getElementById('suScore').textContent=score+'%';d.getElementById('suProgress').style.width=score+'%';
      const hp=number(d,['hpCurrent','currentHp']),hpMax=number(d,['hpMax','maxHp']);
      const power=['attack','defense','magic','speed','luck'].reduce((sum,id)=>sum+number(d,[id]),0);
      const gear=['weapon','armor','necklace','ring1'].filter(id=>value(d,[id])).length;
      const used=number(d,['usedSlots','inventoryUsed']),max=number(d,['maxSlots','inventoryMax'])||20;
      const party=read(PARTY_KEY,null),members=Array.isArray(party?.members)?party.members.length:0;
      d.getElementById('suPower').textContent=String(power);d.getElementById('suHp').textContent=hp+' / '+hpMax;d.getElementById('suGear').textContent=gear+' / 4';d.getElementById('suBag').textContent=used+' / '+max;d.getElementById('suParty').textContent=party?esc(party.name)+' · '+members+'명':'없음';
      const warnings=[];
      if(hpMax>0&&hp>hpMax)warnings.push('현재 HP가 최대 HP보다 높아. 값을 확인해 줘.');
      if(hp<0)warnings.push('현재 HP는 0보다 낮을 수 없어.');
      if(used>max)warnings.push('인벤토리가 최대 칸을 초과했어.');
      if(!value(d,['characterName']))warnings.push('캐릭터 이름을 입력하면 다른 기록과 구분하기 쉬워.');
      if(!value(d,['job']))warnings.push('m��재 직업이 비어 있어.');
      if(!warnings.length)warnings.push('현재 입력값에서 발견된 경고가 없어.');
      d.getElementById('suWarnings').innerHTML=warnings.map((w,i)=>'<li class="'+(!i&&warnings.length===1?'ok':'')+'">'+esc(w)+'</li>').join('');
    }
    form.addEventListener('input',()=>setTimeout(refresh,0));form.addEventListener('change',()=>setTimeout(refresh,0));
    d.getElementById('suFindEmpty').addEventListener('click',()=>{const list=fields().filter(el=>!filled(el));if(!list.length)return;emptyIndex%=list.length;const el=list[emptyIndex++];sections.forEach(s=>{if(s.contains(el)){s.classList.remove('su-collapsed');const b=s.querySelector('.su-toggle');if(b){b.textContent='접기';b.setAttribute('aria-expanded','true')}}});el.scrollIntoView({behavior:'smooth',block:'center'});el.focus()});
    d.getElementById('suCollapse').addEventListener('click',e=>{const collapse=e.currentTarget.textContent==='모두 접기';sections.forEach(s=>{s.classList.toggle('su-collapsed',collapse);const b=s.querySelector('.su-toggle');if(b){b.textContent=collapse?'펼치기':'접기';b.setAttribute('aria-expanded',String(!collapse))}});e.currentTarget.textContent=collapse?'모두 펼치기':'모두 접기'});
    d.getElementById('suCopy').addEventListener('click',()=>d.getElementById('copyStatus')?.click());
    d.getElementById('suSearch').addEventListener('input',e=>{const term=e.target.value.trim().toLocaleLowerCase('ko');sections.forEach(s=>{const match=term&&s.textContent.toLocaleLowerCase('ko').includes(term);s.classList.toggle('su-match',!!match);if(match){s.classList.remove('su-collapsed');s.querySelector('.su-toggle').textContent='접기'}})});
    window.addEventListener('storage',refresh);refresh();
  }
  function boot(){const frame=document.getElementById('embeddedFrame'),run=()=>{try{install(frame.contentDocument)}catch(_){}};if(frame){frame.addEventListener('load',()=>setTimeout(run,40));setTimeout(run,40)}}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
