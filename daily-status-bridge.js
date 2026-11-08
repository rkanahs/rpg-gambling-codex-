(() => {
 'use strict';
 const profilesKey='our-rpg-player-profiles-v2';
 const eventKey='our-rpg-public-events-static-v1';
 const frame=document.getElementById('embeddedFrame');
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
 const current=()=>{
  const store=read(profilesKey,{});
  return {store,profile:store.profiles?.find(p=>p.id===store.activeId)};
 };
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const links=[
  ['출석·방치','our-rpg-daily-events-open'],
  ['진행 이벤트','our-rpg-events'],
  ['이동 결과판','our-rpg-movement-results'],
  ['퀘스트 진행판','our-rpg-quest-tracker'],
  ['제작 공방','our-rpg-crafting-codex'],
  ['스킬 도감','our-rpg-skill-codex-open']
 ];
 const link=(label,slug)=>'<a href="../'+slug+'/" style="display:inline-block;margin:4px 8px 4px 0;padding:8px 10px;border:1px solid #607b5e;border-radius:7px;color:inherit">'+escape(label)+'</a>';
 const format=record=>'D6 '+record.face+' · +'+record.rate+'% · '+record.amount.toLocaleString('ko-KR')+' → '+record.total.toLocaleString('ko-KR',{maximumFractionDigits:2});
 const won=record=>record&&Number.isFinite(record.amount)&&Number.isFinite(record.total)?format(record):'아직 계산 기록 없음';
 function renderStatus(doc){
  const dashboard=doc.getElementById('statusDashboard');
  if(!dashboard)return;
  let panel=doc.getElementById('dailyStatusConnections');
  if(!panel){
   panel=doc.createElement('section');
   panel.id='dailyStatusConnections';
   panel.style.cssText='margin:14px 0;padding:14px;border:1px solid #607b5e;border-radius:10px;background:#13221a;color:#e9f4e9';
   dashboard.after(panel);
  }
  const {profile}=current(),events=read(eventKey,[]);
  const names=Array.isArray(events)?events.map(e=>e?.title).filter(Boolean):[];
  panel.innerHTML='<h2 style="margin-top:0">출석·방치·이벤트</h2>'+
   '<p><strong>행운의 동전 · 최근 계산</strong> '+escape(won(profile?.data?.dailyCoinPreview))+'</p>'+
   '<p><strong>방치 보상</strong> · 출석·방치에서 보상 범위 확인</p>'+
   '<p><strong>진행 이벤트</strong> · '+(names.length?escape(names.join(' · ')):'표시할 진행 이벤트 없음')+'</p>'+
   '<nav aria-label="현황표 연결 메뉴">'+links.map(([label,slug])=>link(label,slug)).join('')+'</nav>';
 }
 function setupDaily(doc){
  const button=doc.querySelector('#attendance #roll');
  if(!button||button.dataset.statusLinked)return;
  button.dataset.statusLinked='1';
  const info=doc.createElement('p');
  info.id='dailyCurrentProfile';
  info.innerHTML=link('현황표 열기','our-rpg-player-status-sheet')+link('진행 이벤트 보기','our-rpg-events');
  doc.querySelector('#attendance').append(info);
  const tip=doc.createElement('p');
  tip.textContent='D6 계산 결과만 현재 캐릭터 현황표에 기록해요. 화폐는 지급하거나 차감하지 않아요.';
  doc.querySelector('#attendance .tool').before(tip);
  button.onclick=()=>{
   const result=doc.getElementById('result'),amount=Number(doc.getElementById('amount').value);
   result.classList.add('show');
   if(!Number.isSafeInteger(amount)||amount<=0){result.textContent='계산할 화폐 수량을 양의 정수로 입력해 줘.';return;}
   const {store,profile}=current();
   let face;
   try{face=doc.defaultView.secureRandomInt(6)+1}
   catch{result.textContent='안전한 주사위 판정을 사용할 수 없어.';return;}
   const rate=[10,20,30,40,45,50][face-1];
   const record={face,rate,amount,total:amount*(1+rate/100),at:new Date().toISOString()};
   result.textContent=format(record);
   if(!profile?.data){result.textContent+=' · 현황표 캐릭터를 선택하면 결과가 저장돼.';return;}
   profile.data.dailyCoinPreview=record;
   profile.updatedAt=record.at;
   try{localStorage.setItem(profilesKey,JSON.stringify(store))}
   catch{result.textContent+=' · 기기 공간 부족으로 현황표에 저장하지 못했어.';return;}
   result.textContent+=' · '+(profile.data.characterName||'현재 캐릭터')+' 현황표에 계산 결과 저장';
   window.dispatchEvent(new CustomEvent('our-rpg:profiles-updated',{detail:{characterId:profile.id}}));
  };
 }
 function refresh(){
  const doc=frame?.contentDocument;
  if(!doc)return;
  renderStatus(doc);
  setupDaily(doc);
 }
 frame?.addEventListener('load',refresh);
 for(const name of ['our-rpg:profiles-updated','our-rpg:status-rendered','our-rpg:events-updated','storage'])window.addEventListener(name,refresh);
 refresh();
})();
