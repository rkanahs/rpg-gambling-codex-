(() => {
  'use strict';
  const API='https://rpg-market-casino.spicy-wren-9157.chatgpt.site/api/hidden-job-actions', PK='our-rpg-player-profiles-v2', SK='RPG_CLOUD_DEVICE_SESSION_V1', MK='our-rpg-last-movement-result-v1';
  let busy=false, identity='', sent='', records=[];
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}}, esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function context(){const s=read(SK),store=read(PK),p=store?.profiles?.find(x=>x.id===store.activeId);return s?.enabled&&s.expiresAt>Date.now()&&p?{p,s,key:p.id+':'+s.token}:null}
  function doc(){const d=document.getElementById('embeddedFrame')?.contentDocument;return d?.getElementById('move')&&d.getElementById('region')?d:null}
  function signature(c){const d=c.p.data,m=read(MK);return JSON.stringify([c.key,m?.characterId===c.p.id?m.id:null,(d.battleXpReceipts||[]).map(x=>x.id),(d.craftedEquipmentReceipts||[]).map(x=>x.receipt)])}
  function say(text){const node=doc()?.getElementById('hiddenJobAutoStatus');if(node)node.textContent=text}
  function draw(){const d=doc();if(!d)return;const c=context();if(c?.key!==identity){identity=c?.key||'';sent='';records=[]}const list=d.getElementById('hiddenJobAutoRecords');if(list)list.innerHTML=records.map(x=>'<p><strong>'+esc(x.message)+'</strong><br><small>'+esc(x.action)+' · '+esc(new Date(x.createdAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))+'</small></p>').join('');const latest=read(MK),result=d.getElementById('result');if(c&&latest?.characterId===c.p.id&&records.some(x=>(x.movementId===latest.id||x.movementId==='AUTO-MOVE:'+latest.id)&&x.status==='approved')&&result?.textContent.startsWith('[우리들의 RPG · 이동 결과]')&&!result.textContent.includes('??? · 히든 직업 조건 달성'))result.textContent+='\n??? · 히든 직업 조건 달성';if(!c)say('기기간 연동을 연결하면 플레이 기록이 자동으로 전달돼.');const b=d.getElementById('hiddenJobAutoRefresh');if(b)b.disabled=busy||!c}
  async function refresh(force=false){
    const c=context();draw();if(!c||busy)return;const key=signature(c),capture=force||key!==sent;busy=true;draw();say(capture?'이동·전투·제작 기록을 자동으로 연결하고 있어.':'조건 확인 결과를 불러오고 있어.');
    try{
      if(capture){if(!globalThis.RpgCloudSyncState?.flush)throw Error('최신본 다시 불러오기를 눌러 줘.');await globalThis.RpgCloudSyncState.flush()}
      if(context()?.key!==c.key)return;
      const r=await fetch(API+(capture?'':'?characterId='+encodeURIComponent(c.p.id)),{method:capture?'POST':'GET',headers:{Authorization:'Bearer '+c.s.token,...(capture?{'Content-Type':'application/json'}:{})},...(capture?{body:JSON.stringify({characterId:c.p.id,automatic:true})}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)}),out=await r.json();
      if(context()?.key!==c.key)return;if(!r.ok)throw Error(out.error||'기록 연결 실패');if(capture)sent=key;records=out.records||[];draw();say('플레이 기록 자동 전달 · 별도 행동 입력 없음 · 운영자가 조건을 확인해.');
    }catch(e){say('기록 연결 대기 · '+e.message+' · 자동으로 재시도해.')}finally{busy=false;draw()}
  }
  function install(){const d=doc();if(!d||d.getElementById('hiddenJobAutoPanel'))return;d.getElementById('hiddenJobActionPanel')?.remove();const box=d.createElement('section');box.id='hiddenJobAutoPanel';box.style.cssText='border:1px solid #80682f;padding:14px;margin-top:14px;border-radius:8px;line-height:1.65';box.innerHTML='<h3>탐험 기록 자동 확인</h3><p>이동·몬스터 전투·제작 완료 기록을 자동으로 전달해. 무엇을 했는지 따로 선택하거나 적을 필요 없어.</p><button type="button" id="hiddenJobAutoRefresh">기록 연결 다시 확인</button><p id="hiddenJobAutoStatus" role="status"></p><div id="hiddenJobAutoRecords"></div><p>운영자가 조건을 확인하면 ??? · 히든 직업 조건 달성으로 알려 줘. 발견·시련·전직·보상은 각 단계별로 확인해.</p>';d.getElementById('petMovementSummary')?.closest('.pet')?.after(box);if(!box.parentNode)d.getElementById('judge').closest('section')?.append(box);d.getElementById('hiddenJobAutoRefresh').onclick=()=>refresh(true);d.getElementById('judge').addEventListener('click',()=>setTimeout(()=>refresh(),100),true);draw();refresh()}
  const frame=document.getElementById('embeddedFrame');frame?.addEventListener('load',()=>setTimeout(install,150));addEventListener('our-rpg:profiles-updated',()=>setTimeout(()=>refresh(),150));addEventListener('storage',e=>{if(e.key===SK||e.key===PK||e.key===MK)setTimeout(()=>refresh(),150)});setTimeout(install,150);setTimeout(()=>refresh(),500);setInterval(()=>{if(!document.hidden)refresh()},20000);
})();
