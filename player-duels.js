(()=>{'use strict';
const PK='our-rpg-player-profiles-v2',SK='RPG_CLOUD_DEVICE_SESSION_V1',API='https://rpg-market-casino.spicy-wren-9157.chatgpt.site/api/duels';
let doc,panel,state=null,incoming=[],opponents=[],busy=false,key='',requestId=0,controller=null,inboxMarkup='';
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}},ctx=()=>{const a=read(PK),p=a?.profiles?.find(x=>x.id===a.activeId),s=read(SK);return p&&s?.enabled&&s.expiresAt>Date.now()?{p,s,key:p.id+':'+s.token}:null};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),$=id=>doc?.getElementById(id);
const live=()=>state&&['active','pending'].includes(state.phase);
function say(message){if($('duelMsg'))$('duelMsg').textContent=message}
function openArena(){const link=document.querySelector('a[href="our-rpg-pvp-arena/"]');if(link)link.click();else location.hash='our-rpg-pvp-arena'}
function resetContext(){const next=ctx()?.key||'';if(next===key)return;controller?.abort();controller=null;requestId++;busy=false;key=next;state=null;incoming=[];opponents=[];inboxMarkup='';if($('duelOpponent'))$('duelOpponent').innerHTML='<option value="">이름을 검색해 상대를 선택해 줘.</option>';say('');render()}
function notification(){
 if(!document.body)return;let badge=document.getElementById('duelNotice');
 if(!badge){badge=document.createElement('button');badge.id='duelNotice';badge.type='button';badge.style.cssText='position:fixed;right:12px;bottom:18px;z-index:1100;padding:12px 16px;max-width:calc(100vw - 24px);border:1px solid #e0b85d;border-radius:10px;background:#352719;color:#ffebae;font:700 14px/1.5 sans-serif;box-shadow:0 4px 20px #0008';badge.onclick=openArena;document.body.append(badge)}
 badge.hidden=!ctx()||(!incoming.length&&state?.phase!=='active');
 badge.textContent=incoming.length?'⚔️ 받은 PvP 신청 '+incoming.length+'건 · 확인':'⚔️ PvP 진행 중 · '+(state?.turnId===ctx()?.p.id?'내 차례':'상대 차례');
}
function render(){
 notification();if(!panel?.isConnected)return;const c=ctx(),p=state,active=p?.phase==='active',waiting=p?.phase==='pending',mine=p?.turnId===c?.p.id;
 $('duelWho').textContent=c?'현재 캐릭터 · '+(c.p.data.characterName||'이름 미정'):'통합 도감 상단의 기기간 연동을 먼저 연결하고 현황표에서 캐릭터를 선택해 줘.';
 $('duelSetup').hidden=!!live();$('duelConsent').hidden=!!live();$('duelRoom').hidden=!p;
 const markup=incoming.map(x=>'<article class="duel-invite"><strong>'+esc(x.challenger.name)+' · Lv.'+esc(x.challenger.level)+'</strong><p>대결 신청을 보냈어. 수락해야 전투가 시작돼.</p><button data-duel-accept="'+esc(x.id)+'" data-revision="'+x.revision+'">수락하고 전투 시작</button><button data-duel-decline="'+esc(x.id)+'" data-revision="'+x.revision+'">거절</button></article>').join('')||'<p>받은 대결 신청이 없어. 신청이 오면 여기에 자동으로 표시돼.</p>';
 if(markup!==inboxMarkup){$('duelInboxList').innerHTML=markup;inboxMarkup=markup}
 $('duelInbox').hidden=active&&!incoming.length;
 $('duelInboxHelp').textContent=live()&&incoming.length?'진행 중인 대결을 마치거나 신청을 취소하면 다른 신청을 수락할 수 있어.':'';
 panel.querySelectorAll('button').forEach(b=>b.disabled=busy||!c);
 panel.querySelectorAll('[data-duel-accept]').forEach(b=>b.disabled=busy||!c||!!live());
 $('duelCreate').disabled=busy||!c||!$('duelOpponent').value;
 if(!p)return;
 $('duelPhase').textContent=waiting?(p.targetName?p.targetName+'의 수락 대기 · 신청 후 30분 유효':'기존 코드 신청 · 상대 수락 대기'):active?(mine?'내 차례 · 행동을 선택해 줘.':'상대 차례 · 상대의 도감에서 행동하면 자동으로 반영돼.')+' '+Math.max(0,Math.ceil((p.deadline-Date.now())/1000))+'초 남음':p.reason||'대결 종료';
 $('duelCode').textContent=p.code||'';$('duelCodeBox').hidden=!waiting||!!p.targetCharacterId;$('duelCancel').hidden=!waiting;$('duelActions').hidden=!active;
 $('duelFighters').innerHTML=p.players.map(x=>'<article class="duel-fighter"><strong>'+esc(x.name)+(x.characterId===c?.p.id?' (나)':' (상대)')+' · Lv.'+esc(x.level)+'</strong><p class="duel-hp">HP '+x.hp+' / '+x.hpMax+'</p><progress aria-label="'+esc(x.name)+' 체력" value="'+x.hp+'" max="'+x.hpMax+'"></progress><p>공격 '+x.attack+' · 방어 '+x.defense+' · 마력 '+x.magic+' · 이속 '+x.speed+(x.guard?' · 🛡️ 방어 중':'')+'</p></article>').join('');
 $('duelBoost').textContent='능력치 이벤트 '+p.boost+'배 적용 · '+p.turns+'턴';
 ['duelAttack','duelMagic','duelGuard'].forEach(id=>$(id).disabled=busy||!active||!mine||Date.now()>=p.deadline);
 $('duelSurrender').disabled=busy||!active;$('duelTimeout').disabled=busy||!active||mine||Date.now()<p.deadline;
 $('duelLogs').textContent=[...p.logs].reverse().join('\n');
}
async function request(action='',extra={}){
 resetContext();const c=ctx();if(!c){render();return}if(busy)return;if(controller){if(!action)return;controller.abort()}
 const seq=++requestId,abort=new AbortController();controller=abort;busy=!!action;render();
 const payload={characterId:c.p.id,action,revision:state?.revision,outsideSafeTown:$('duelOutside')?.checked===true,...extra};
 const timeout=setTimeout(()=>abort.abort(),12000);
 try{
  if(['create','accept','join'].includes(action)){if(!globalThis.RpgCloudSyncState?.flush)throw Error('최신본 다시 불러오기를 눌러 줘.');await globalThis.RpgCloudSyncState.flush()}
  if(seq!==requestId||ctx()?.key!==c.key)return;
  const search=action==='search',query='?characterId='+encodeURIComponent(c.p.id)+(search?'&opponentName='+encodeURIComponent(extra.name):'');
  const r=await fetch(API+(!action||search?query:''),{method:action&&!search?'POST':'GET',headers:{Authorization:'Bearer '+c.s.token,'Content-Type':'application/json'},...(action&&!search?{body:JSON.stringify(payload)}:{}),cache:'no-store',signal:abort.signal}),o=await r.json();
  if(!r.ok){const error=Error(o.error||'대결 서버 연결 실패');error.status=r.status;throw error}
  if(seq!==requestId||ctx()?.key!==c.key)return;
  if(search){opponents=o.opponents||[];$('duelOpponent').innerHTML='<option value="">상대 캐릭터 선택</option>'+opponents.map(x=>'<option value="'+esc(x.characterId)+'">'+esc(x.name)+' · Lv.'+esc(x.level)+' · '+esc(x.characterId.slice(-6))+'</option>').join('');if(opponents.length===1)$('duelOpponent').value=opponents[0].characterId;say(opponents.length?'상대를 확인하고 대결 신청을 보내 줘.':'이름이 일치하는 다른 계정의 캐릭터가 없어. 상대가 현황표를 서버에 저장했는지 확인해 줘.')}
  else{const changed=state?.id!==o.duel?.id||state?.revision!==o.duel?.revision;state=o.duel;incoming=o.incoming||[];if(!action&&changed)say('');if(action)say(({create:'✓ 상대에게 대결 신청을 보냈어. 상대가 수락할 때까지 기다려 줘.',accept:'✓ 수락했어. 각자 자기 도감에서 차례대로 행동해.',decline:'대결 신청을 거절했어.',cancel:'대결 신청을 취소했어.'})[action]||'✓ 전투 결과를 반영했어.')}
 }catch(e){if(seq===requestId&&ctx()?.key===c.key){say(e.name==='AbortError'?'서버 응답이 늦어지고 있어. 자동으로 최신 상황을 다시 확인할게.':e.message);if(e.status===409)setTimeout(()=>request(),0)}}
 finally{clearTimeout(timeout);if(seq===requestId){controller=null;busy=false;render()}}
}
function install(d){
 const arena=!!d?.getElementById('coordA'),status=!!d?.getElementById('status-section-05');
 if(!arena&&!status){doc=null;panel=null;return}
 doc=d;panel=d.getElementById('playerDuelPanel');if(panel)return;
 panel=d.createElement('section');panel.id='playerDuelPanel';inboxMarkup='';
 panel.innerHTML=`<h2>⚔️ 플레이어 PvP 전투장</h2><p id="duelWho"></p><p><strong>상대 선택 → 대결 신청 → 상대 수락 → 각자 자기 도감에서 전투</strong></p><p>받은 신청과 전투 상황은 3초마다 자동 갱신돼. 상대의 수락 전에는 전투가 시작되지 않아.</p>
 <div id="duelConsent"><label><input id="duelOutside" type="checkbox">현재 안전 마을 밖에 있으며 PvP에 동의해.</label></div>
 <div id="duelSetup"><h3>대결 신청 보내기</h3><label>상대 캐릭터 이름<input id="duelOpponentName" maxlength="50" placeholder="상대 캐릭터 이름을 정확히 입력"></label><button id="duelFind">상대 찾기</button><label>대결 상대<select id="duelOpponent"><option value="">이름을 검색해 상대를 선택해 줘.</option></select></label><button id="duelCreate">선택한 상대에게 대결 신청</button><details><summary>이전에 받은 대결 코드 사용</summary><label>대결 코드<input id="duelJoinCode" maxlength="24" placeholder="16자리 대결 코드"></label><button id="duelJoin">기존 코드로 수락</button></details></div>
 <section id="duelInbox"><h3>받은 대결 신청</h3><p id="duelInboxHelp"></p><div id="duelInboxList"></div></section>
 <div id="duelRoom" hidden><h3 id="duelPhase" role="status"></h3><div id="duelCodeBox" hidden>기존 대결 코드 <strong id="duelCode"></strong></div><p id="duelBoost"></p><div id="duelFighters"></div><button id="duelCancel">신청 취소</button><div id="duelActions"><button id="duelAttack">공격 · 자동 D100</button><button id="duelMagic">마법 공격 · 자동 D100</button><button id="duelGuard">방어</button><button id="duelSurrender">항복</button><button id="duelTimeout">상대 시간 초과 승리</button></div><h3>전투 기록</h3><pre id="duelLogs"></pre></div>
 <button id="duelRefresh">최신 상황 확인</button><p id="duelMsg" role="status" aria-live="polite"></p><details><summary>PvP 전투 규칙</summary><p>좌표 차이 100 이하 · 양쪽 모두 안전 마을 밖이어야 해. 좌표는 수락 시 서버 현황으로 확인하고 마을 밖 여부는 각자 동의해. 이속이 빠른 쪽이 선공하며 동률은 신청자가 선공해. 자기 차례에 공격·마법 공격·방어를 선택해.</p><p>명중: 자동 D100에 이속 보정을 더해 31 이상. 같은 이속은 회피 30%, 방어자가 1.25배 빠르면 40%, 2배 빠르면 50%. 피해 = 공격력 또는 마력 − 상대 방어력의 50% (최소 1). 방어하면 다음 피해가 50% 줄어. 각 턴은 5분이고 200턴은 무승부야.</p><p>수락 시 서버의 기본 능력치와 능력치 이벤트를 반영해. 공허족은 방어력 5%, 공허 초월체는 10%를 무시하고 종족 진화 효과가 자동 적용돼. 장비·펫·배운 스킬의 추가 효과는 현재 온라인 PvP에 적용되지 않아.</p><p>별도 전투 HP로 진행하므로 기존 현황 HP·경험치·돈은 변하지 않아. 승리 보상이나 사망 페널티는 없어. 각자 같은 계정·캐릭터로 기기 연동하면 새로고침하거나 다른 기기에서도 이어 할 수 있어.</p></details>`;
 if(arena){const main=d.querySelector('main'),hero=main?.querySelector('.hero');if(!main)return;const legacy=d.createElement('details');legacy.id='duelLegacyTools';const summary=d.createElement('summary');summary.textContent='이전 수동 대결 도구 · 거리 계산과 Discord 신청서';legacy.append(summary);[...main.children].forEach(n=>{if(n!==hero)legacy.append(n)});main.append(panel,legacy);if(hero){hero.querySelector('h1').textContent='플레이어 PvP 전투장';hero.querySelector('p').textContent='상대가 신청을 수락하면 두 사람의 도감이 같은 전투에 연결됩니다. 각자 자신의 화면에서 차례대로 행동하세요.'}}
 else d.querySelector('#status-section-05 .body').append(panel);
 const css=d.createElement('style');css.textContent='#playerDuelPanel{padding:18px;margin:16px 0;background:#121923;border:1px solid #52677b;border-radius:12px;color:#edf2f7}#playerDuelPanel h2,#playerDuelPanel h3{margin:12px 0}#playerDuelPanel button,#playerDuelPanel input,#playerDuelPanel select{min-height:44px;padding:10px;margin:5px 3px;border:1px solid #6c8299;border-radius:7px;background:#1c2c3b;color:#fff;font:inherit;max-width:100%;box-sizing:border-box}#playerDuelPanel button:disabled{opacity:.4}#playerDuelPanel label{display:block}#playerDuelPanel input:not([type=checkbox]),#playerDuelPanel select{display:block;width:100%;margin:6px 0 10px}#playerDuelPanel input[type=checkbox]{min-height:0;width:auto;accent-color:#e0b85d}#duelSetup,#duelInbox{padding:12px 0;border-top:1px solid #344354}#duelCreate,[data-duel-accept]{background:#244634!important;border-color:#70c59b!important}#duelFighters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#duelFighters article,.duel-invite{padding:14px;border:1px solid #52677b;border-radius:9px;margin:8px 0;overflow-wrap:anywhere}#duelFighters p{font-size:13px;margin:7px 0}#duelFighters .duel-hp{font-size:18px;font-weight:700}#duelFighters progress{width:100%;accent-color:#70c59b}#duelLogs{white-space:pre-wrap;max-height:260px;overflow:auto;font:13px/1.7 sans-serif}#duelMsg{color:#ffdc93;white-space:pre-wrap}#duelPhase{color:#ffe2a0}#duelLegacyTools{margin-top:25px;padding:14px;border:1px solid #344354}#playerDuelPanel [hidden]{display:none!important}@media(max-width:480px){#duelFighters{grid-template-columns:1fr}#duelActions{display:grid;grid-template-columns:1fr 1fr}#playerDuelPanel{padding:12px}}';d.head.append(css);
 const nav=d.getElementById('sectionNav');if(nav&&!d.getElementById('duelNav')){const b=d.createElement('button');b.id='duelNav';b.textContent='⚔️ 플레이어 대결';b.onclick=openArena;nav.append(b)}
 panel.onclick=e=>{const button=e.target.closest('button');if(!button||button.disabled)return;const id=button.id,actions={duelAttack:'attack',duelMagic:'magic',duelGuard:'guard',duelCancel:'cancel',duelTimeout:'timeout'};if(actions[id])request(actions[id]);else if(button.dataset.duelAccept||button.dataset.duelDecline)request(button.dataset.duelAccept?'accept':'decline',{duelId:button.dataset.duelAccept||button.dataset.duelDecline,revision:Number(button.dataset.revision)});else if(id==='duelCreate')request('create',{targetCharacterId:$('duelOpponent').value});else if(id==='duelJoin')request('join',{code:$('duelJoinCode').value});else if(id==='duelFind')request('search',{name:$('duelOpponentName').value});else if(id==='duelRefresh')request();else if(id==='duelSurrender'&&confirm('항복하면 상대가 승리해. 항복할까?'))request('surrender')};
 $('duelOpponent').onchange=render;$('duelOpponentName').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();request('search',{name:e.target.value})}};render();request();
}
function refresh(){resetContext();const f=document.getElementById('embeddedFrame');install(f?.contentDocument);if(!document.hidden)request()}
function start(){document.getElementById('embeddedFrame')?.addEventListener('load',refresh);refresh();setInterval(refresh,3000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
addEventListener('our-rpg:status-rendered',refresh);addEventListener('our-rpg:profiles-updated',refresh);addEventListener('storage',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();
