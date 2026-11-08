(() => {
 'use strict';
 const profilesKey='our-rpg-player-profiles-v2';
 const eventKey='our-rpg-public-events-static-v1';
 const frame=document.getElementById('embeddedFrame');
 const dayFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
 const today=()=>dayFormat.format(new Date());
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
 const format=record=>'D6 '+record.face+' · +'+record.rate+'% · 보너스 '+record.bonus.toLocaleString('ko-KR')+' 골드';
 const summary=record=>record&&Number.isFinite(record.bonus)?format(record):'아직 출석 기록 없음';
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
   '<p><strong>행운의 동전 · 골드 출석</strong> '+escape(summary(profile?.data?.dailyCoinGold))+'</p>'+
   '<p><strong>방치 보상</strong> · 출석·방치에서 보상 범위 확인</p>'+
   '<p><strong>진행 이벤트</strong> · '+(names.length?escape(names.join(' · ')):'표시할 진행 이벤트 없음')+'</p>'+
   '<nav aria-label="현황표 연결 메뉴">'+links.map(([label,slug])=>link(label,slug)).join('')+'</nav>';
 }
 function setupDaily(doc){
  const button=doc.querySelector('#attendance #roll');
  if(!button)return;
  const amountInput=doc.getElementById('amount');
  const {profile}=current();
  const balance=Number(profile?.data?.gold||0);
  const record=profile?.data?.dailyCoinGold;
  const claimed=record?.day===today();
  button.textContent=claimed?'오늘 출석 완료':'골드로 D6 굴리기';
  button.disabled=claimed;
  amountInput.max=String(balance);
  let wallet=doc.getElementById('dailyGoldBalance');
  if(!wallet){
   wallet=doc.createElement('p');wallet.id='dailyGoldBalance';
   doc.querySelector('#attendance .tool').before(wallet);
  }
  wallet.textContent=(profile?.data?.characterName||'선택된 캐릭터')+' · 보유 골드 '+balance.toLocaleString('ko-KR')+(claimed?' · '+format(record):'');
  if(button.dataset.statusLinked)return;
  button.dataset.statusLinked='1';
  amountInput.placeholder='맡길 골드 수량';
  amountInput.setAttribute('aria-label','맡길 골드 수량');
  const info=doc.createElement('p');
  info.id='dailyCurrentProfile';
  info.innerHTML=link('현황표 열기','our-rpg-player-status-sheet')+link('진행 이벤트 보기','our-rpg-events');
  doc.querySelector('#attendance').append(info);
  const tip=doc.createElement('p');
  tip.textContent='현재 캐릭터의 골드를 사용해요. 한국 시간 기준 캐릭터마다 하루 한 번, 원금은 돌아오고 보너스는 1골드 단위로 버림해 지갑에 더해요.';
  doc.querySelector('#attendance .tool').before(tip);
  button.onclick=async()=>{
   const result=doc.getElementById('result'),amount=Number(amountInput.value),id=current().profile?.id;
   result.classList.add('show');
   const roll=()=>{
    const {store,profile}=current();
    if(!profile?.data?.characterName?.trim()||profile.id!==id)throw Error('현황표에서 캐릭터를 먼저 선택해 줘.');
    const day=today();
    if(profile.data.dailyCoinGold?.day===day)throw Error('이 캐릭터는 오늘 이미 출석했어.');
    const gold=Number(profile.data.gold||0);
    if(!Number.isSafeInteger(amount)||amount<=0)throw Error('맡길 골드를 양의 정수로 입력해 줘.');
    if(!Number.isSafeInteger(gold)||gold<amount)throw Error('보유 골드 이내로 입력해 줘.');
    const face=doc.defaultView.secureRandomInt(6)+1;
    const rate=[10,20,30,40,45,50][face-1],bonus=Number(BigInt(amount)*BigInt(rate)/100n);
    if(!Number.isSafeInteger(gold+bonus))throw Error('지갑에 보너스를 저장할 수 없어.');
    const record={day,face,rate,amount,bonus,at:new Date().toISOString()};
    profile.data.gold=String(gold+bonus);
    profile.data.dailyCoinGold=record;
    profile.updatedAt=record.at;
    localStorage.setItem(profilesKey,JSON.stringify(store));
    result.textContent=format(record)+' 획득 · 현재 '+profile.data.gold+' 골드';
    window.dispatchEvent(new CustomEvent('our-rpg:profiles-updated',{detail:{characterId:id}}));
   };
   button.disabled=true;
   try{
    if(navigator.locks)await navigator.locks.request('our-rpg-daily-gold:'+id,roll);
    else roll();
   }catch(error){result.textContent=error.name==='QuotaExceededError'?'기기 공간이 부족해. 골드는 변경되지 않았어.':error.message}
   finally{setupDaily(doc)}
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
