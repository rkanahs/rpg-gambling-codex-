(() => {
  'use strict';
  const SITE = 'https://rpg-market-casino.spicy-wren-9157.chatgpt.site';
  const PROFILE = 'our-rpg-player-profiles-v2', PLAYER = 'RPG_CLOUD_DEVICE_SESSION_V1', OPERATOR = 'RPG_OPERATOR_DEVICE_SESSION_V1';
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } };
  const current = () => { const s = read(PROFILE); return s?.profiles?.find(p => p.id === s.activeId); };
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label = {pending:'승인 대기',approved:'제작 완료 승인',rejected:'반려',cancelled:'신청 취소'};
  const when = value => new Date(value).toLocaleString('ko-KR');
  const requestId = () => { const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join(''); };
  const styles = `.craft-server-panel{border:1px solid #59684e;background:#101b15;padding:18px;margin:16px 0;border-radius:8px}.craft-server-panel h2{margin-top:0}.craft-server-panel button,.craft-server-submit{min-height:44px;padding:9px 14px;margin:4px 5px 4px 0;border:1px solid #9d854c;background:#302917;color:#ffe39a;cursor:pointer;font:inherit}.craft-server-panel button:disabled,.craft-server-submit:disabled{opacity:.55;cursor:wait}.craft-server-panel textarea{display:block;width:100%;box-sizing:border-box;background:#09110d;color:#eef4ef;border:1px solid #58684f;padding:10px;font:inherit}.craft-server-panel article{border:1px solid #405647;padding:14px;margin-top:12px;overflow-wrap:anywhere}.craft-server-panel article h3{margin:0 0 8px}.craft-server-panel p{white-space:pre-wrap}.craft-server-panel small{color:#bec9bc}.craft-server-badge{display:inline-block;padding:3px 8px;border:1px solid #a28a50;border-radius:6px;margin-left:6px;font-size:.85rem}.craft-server-panel input[type=checkbox]{width:auto;min-height:auto;margin-right:6px}.craft-server-panel label{display:block;margin:10px 0}.craft-server-panel [data-craft-message]{min-height:1.5em}.craft-server-panel button:focus-visible,.craft-server-submit:focus-visible{outline:3px solid #f0ce73;outline-offset:2px}`;
  function addStyle(d) { if (d.getElementById('craft-server-style')) return; const s = d.createElement('style'); s.id='craft-server-style'; s.textContent=styles; d.head.append(s); }
  function session(key) { const s=read(key); return s?.token && s.expiresAt > Date.now() ? s : null; }
  async function api(operator, owner, input) {
    const key=operator?OPERATOR:PLAYER, s=session(key);
    if (!s) throw Error(operator?'운영자 기기 연결 후 확인할 수 있습니다.':'기기간 연동을 연결한 뒤 제작을 신청해 주세요.');
    if (!operator && current()?.id!==owner) throw Error('캐릭터가 변경되었습니다. 제작 공방을 다시 열어 주세요.');
    const path=operator?'/api/operator-crafting-reviews':'/api/crafting-reviews';
    const response=await fetch(SITE+path+(!operator&&!input?'?characterId='+encodeURIComponent(owner):''),{
      method:input?'POST':'GET',headers:{Authorization:'Bearer '+s.token,...(input?{'Content-Type':'application/json'}:{})},
      ...(input?{body:JSON.stringify(input)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)
    });
    const result=await response.json();
    if (session(key)?.token!==s.token || !operator&&current()?.id!==owner) throw Error('연결 계정이나 캐릭터가 변경되었습니다.');
    if (!response.ok) throw Error(result.error||'제작 신청 서버에 연결하지 못했습니다.');
    return result;
  }
  let playerView=null;
  function installPlayer(d) {
    if (!d?.getElementById('copyCraft') || d.readyState === 'loading' || d.getElementById('playerCraftingRequests')) return;
    addStyle(d);
    const copy=d.getElementById('copyCraft'), send=d.createElement('button');
    send.type='button';send.id='sendCraftRequest';send.className='btn primary craft-server-submit';send.textContent='제작 신청 보내기';copy.before(send);copy.textContent='신청서 복사 · 보조';
    const panel=d.createElement('section');panel.id='playerCraftingRequests';panel.className='panel craft-server-panel';
    panel.innerHTML='<h2>내 제작 신청</h2><p>신청하면 운영자 도감에 바로 등록돼요. 승인·반려와 운영자 메모는 자동으로 갱신돼요.</p><button type="button" data-craft-refresh>신청 상태 새로고침</button><p data-craft-message role="status" aria-live="polite"></p><div data-craft-list></div>';
    (d.getElementById('craftEasyRequest') || copy.closest('section')).after(panel);
    const ctx={d,panel,send,owner:current()?.id||'',identity:'',records:[],busy:false,reading:false,draft:null,signature:'',epoch:0}; playerView=ctx;
    const $=selector=>panel.querySelector(selector), message=t=>{$('[data-craft-message]').textContent=t;};
    const selected=()=>{try{return JSON.parse(d.getElementById('craftItem').dataset.recipe||'null')}catch(_){return null}};
    const alive=()=>playerView===ctx&&d===document.getElementById('embeddedFrame')?.contentDocument;
    function identity() {return (session(PLAYER)?.token||'')+'|'+(current()?.id||'');}
    function paint() {
      send.disabled=ctx.busy||!session(PLAYER)||!ctx.owner||ctx.owner!==current()?.id;
      $('[data-craft-refresh]').disabled=ctx.busy;
      panel.querySelectorAll('[data-craft-cancel]').forEach(b=>{b.disabled=ctx.busy;});
    }
    function render() {
      const signature=JSON.stringify(ctx.records); if(signature===ctx.signature)return;ctx.signature=signature;
      $('[data-craft-list]').innerHTML=ctx.records.length?ctx.records.map(r=>'<article data-craft-id="'+esc(r.id)+'"><h3>'+esc(r.recipe.n)+' <span class="craft-server-badge">'+esc(label[r.status]||r.status)+'</span></h3><small>'+esc(r.recipe.g+' · '+r.recipe.t)+' · '+esc(when(r.createdAt))+'</small><p><b>필요 재료</b> · '+esc(r.recipe.r)+'</p><p>'+esc(r.note)+'</p>'+(r.reviewNote?'<p><b>운영자 메모</b> · '+esc(r.reviewNote)+'</p>':'')+(r.status==='pending'?'<button type="button" data-craft-cancel>신청 취소</button>':'')+(r.status==='approved'?'<p>승인 번호 · '+esc(r.receipt)+'</p>'+(['무기','방어구','목걸이','반지','장신구'].includes(r.recipe.t)?'<button type="button" data-craft-prepare>승인 장비 보관 준비</button>':'<p>소모품·마도구·펫 장비 지급은 운영자에게 확인해 주세요.</p>'):'')+'</article>').join(''):'<p>아직 보낸 제작 신청이 없습니다.</p>';
      paint();
    }
    async function refresh() {
      if(!alive()||ctx.busy||ctx.reading)return;
      const id=identity();
      if(id!==ctx.identity){ctx.identity=id;ctx.records=[];ctx.signature='';ctx.draft=null;$('[data-craft-list]').replaceChildren();}
      if(ctx.owner!==current()?.id){message('캐릭터가 변경되었습니다. 제작 공방을 다시 열어 주세요.');paint();return;}
      if(!ctx.owner||!session(PLAYER)){message('기기간 연동을 연결하고 현황표에서 제작자 캐릭터를 선택해 주세요.');paint();return;}
      ctx.reading=true;const epoch=ctx.epoch;
      try{const out=await api(false,ctx.owner);if(!alive()||id!==identity()||epoch!==ctx.epoch)return;ctx.records=out.records;render();message('제작 신청 '+out.records.length+'건 · 5초마다 자동 갱신');}
      catch(e){if(alive()&&id===identity())message(e.message+' 기존 신청은 유지됩니다.');}
      finally{ctx.reading=false;if(alive())paint();}
    }
    async function mutate(input) {
      if(ctx.busy)return;ctx.busy=true;ctx.epoch++;paint();
      const id=identity();
      try{const out=await api(false,ctx.owner,input);if(!alive()||id!==identity())return null;ctx.records=[out.record,...ctx.records.filter(r=>r.id!==out.record.id)];render();return out;}
      catch(e){if(alive()&&id===identity())message(e.message);return null;}
      finally{ctx.busy=false;if(alive())paint();}
    }
    send.addEventListener('click',async()=>{
      if(ctx.busy)return;const r=selected();if(!r){message('만들 아이템의 제작법을 먼저 선택해 주세요.');return;}
      const token=session(PLAYER)?.token, owner=ctx.owner, note=d.getElementById('craftMemo').value.trim();
      if(!token||current()?.id!==owner){message('기기간 연동과 제작자 캐릭터를 확인해 주세요.');return;}
      ctx.busy=true;ctx.epoch++;paint();message('캐릭터 저장 후 제작 신청을 보내는 중…');
      let input;
      try{
        if(!globalThis.RpgCloudSyncState?.flush)throw Error('통합 도감에서 기기간 연동을 완료한 뒤 다시 신청해 주세요.');
        await globalThis.RpgCloudSyncState.flush();
        if(!alive()||session(PLAYER)?.token!==token||current()?.id!==owner)throw Error('연결 계정이나 캐릭터가 변경되었습니다.');
        const key='rpg-craft-request-draft:'+String(session(PLAYER)?.accountTag||token.slice(0,12))+':'+owner;
        let draft;try{draft=JSON.parse(sessionStorage.getItem(key)||'null')}catch(_){}
        if(!draft||draft.recipeName!==r.n||draft.note!==note)draft={action:'submit',characterId:owner,recipeName:r.n,note,requestId:requestId()};
        sessionStorage.setItem(key,JSON.stringify(draft));input=draft;
        const out=await api(false,owner,input);if(!alive())return;
        sessionStorage.removeItem(key);ctx.records=[out.record,...ctx.records.filter(x=>x.id!==out.record.id)];render();
        message(out.duplicate?'이미 접수된 신청이에요. 아래에서 처리 상태를 확인해 주세요.':'운영자 도감에 제작 신청을 보냈어요. 승인 결과가 여기에 표시돼요.');
      }catch(e){if(alive())message(e.message+' 신청 상태를 확인한 뒤 다시 시도해 주세요.');}
      finally{ctx.busy=false;if(alive())paint();}
    });
    panel.addEventListener('click',async e=>{
      const card=e.target.closest('[data-craft-id]'),r=card&&ctx.records.find(r=>r.id===card.dataset.craftId);if(!r)return;
      if(e.target.closest('[data-craft-cancel]')){const out=await mutate({action:'cancel',characterId:ctx.owner,id:r.id,version:r.version});if(out)message('제작 신청을 취소했어요.');}
      if(e.target.closest('[data-craft-prepare]')){
        if(r.status!=='approved'||current()?.id!==ctx.owner||ctx.identity!==identity()){message('현재 캐릭터와 최신 승인 상태를 확인해 주세요.');return;}
        const item=d.getElementById('craftItem');item.value=r.recipe.n;item.dataset.recipe=JSON.stringify(r.recipe);d.getElementById('craftMemo').value=r.recipe.r;
        d.dispatchEvent(new d.defaultView.Event('rpg-craft-recipe-selected'));
        d.getElementById('craftedReceipt').value=r.receipt;d.getElementById('craftedApproved').checked=true;
        const store=d.getElementById('craftEasyStore');if(store){store.open=true;store.scrollIntoView({block:'start'});}
        d.getElementById('craftedInventoryStatus').textContent='운영자가 승인한 '+r.recipe.n+'입니다. 아래 보관 버튼을 눌러 본인 인벤토리에 보관하세요.';
      }
    });
    $('[data-craft-refresh]').onclick=refresh;ctx.refresh=refresh;paint();refresh();
  }
  function installOperator() {
    if(!/운영자/.test(document.title)||!document.querySelector('main')||document.getElementById('operatorCraftingReviews'))return;
    addStyle(document);
    const panel=document.createElement('section');panel.id='operatorCraftingReviews';panel.className='content-section craft-server-panel';
    panel.innerHTML='<h2>⚒️ 제작 신청 승인</h2><p>플레이어가 보낸 제작 신청입니다. 기존 규칙에 따라 재료·비용 처리와 제작 결과를 확인한 뒤 완료 승인하거나 사유를 적어 반려하세요. 처리 결과는 플레이어 제작공방에 자동 표시됩니다.</p><p>승인 버튼은 확인 기록을 남깁니다. 재료 자동 차감이나 장비 자동 지급을 실행하지 않습니다.</p><button type="button" data-craft-refresh>제작 신청 새로고침</button><p data-craft-message role="status" aria-live="polite"></p><div data-craft-list></div>';
    const anchor=document.getElementById('operatorQuestReviews');if(anchor)anchor.before(panel);else document.querySelector('main').append(panel);
    const nav=document.querySelector('.nav'),link=document.createElement('a');link.href='#operatorCraftingReviews';link.textContent='⚒ 제작 신청 승인';nav?.append(link);
    const $=s=>panel.querySelector(s);let records=[],busy=false,reading=false,identity='',signature='',epoch=0;
    async function refresh() {
      if(busy||reading)return;const s=session(OPERATOR);
      if((s?.token||'')!==identity){identity=s?.token||'';records=[];signature='';$('[data-craft-list]').replaceChildren();link.textContent='⚒ 제작 신청 승인';}
      if(!s){$('[data-craft-message]').textContent='운영자 기기 연결 후 확인할 수 있습니다.';return;}
      if(panel.contains(document.activeElement)&&document.activeElement.matches('textarea,input'))return;
      reading=true;const turn=epoch;
      try{
        const out=await api(true);if(session(OPERATOR)?.token!==s.token||turn!==epoch)return;records=out.records;
        const count=records.filter(r=>r.status==='pending').length;link.textContent='⚒ 제작 신청 승인'+(count?' ('+count+')':'');$('[data-craft-message]').textContent='승인 대기 '+count+'건 · 최근 신청 '+records.length+'건 · 5초마다 자동 갱신';
        const next=JSON.stringify(records);if(next===signature)return;signature=next;
        $('[data-craft-list]').innerHTML=records.length?records.map(r=>'<article data-craft-id="'+esc(r.id)+'"><h3>'+esc(r.character)+' · '+esc(r.recipe.n)+' <span class="craft-server-badge">'+esc(label[r.status]||r.status)+'</span></h3><small>'+esc(r.recipe.g+' · '+r.recipe.t)+' · '+esc(when(r.createdAt))+'</small><p><b>필요 재료</b> · '+esc(r.recipe.r)+'\n<b>조건</b> · '+esc(r.recipe.c||'제한 없음')+'\n<b>효과</b> · '+esc(r.recipe.e)+'</p><p><b>플레이어 메모</b>\n'+esc(r.note||'없음')+'</p>'+(r.status==='pending'?'<label>확인 메모·반려 사유<textarea data-craft-note rows="3" maxlength="1200"></textarea></label><label><input type="checkbox" data-craft-confirm>제작 결과와 재료·비용 처리를 확인했습니다.</label><button type="button" data-craft-decision="approved">제작 완료 승인</button><button type="button" data-craft-decision="rejected">반려</button>':'<p><b>운영자 메모</b> · '+esc(r.reviewNote||'없음')+'</p>'+(r.receipt?'<small>승인 번호 · '+esc(r.receipt)+'</small>':''))+'</article>').join(''):'<p>접수된 제작 신청이 없습니다.</p>';
      }catch(e){if(session(OPERATOR)?.token===s.token)$('[data-craft-message]').textContent=e.message+' 마지막 조회 결과는 유지됩니다.';}
      finally{reading=false;}
    }
    panel.addEventListener('click',async e=>{
      const button=e.target.closest('[data-craft-decision]');if(!button||busy)return;
      const card=button.closest('[data-craft-id]'),r=records.find(x=>x.id===card.dataset.craftId);if(!r)return;
      const status=button.dataset.craftDecision,note=card.querySelector('[data-craft-note]').value.trim(),confirmed=card.querySelector('[data-craft-confirm]').checked;
      if(status==='approved'&&!confirmed){$('[data-craft-message]').textContent='제작 결과와 재료·비용 처리 확인에 체크해 주세요.';return;}
      if(status==='rejected'&&!note){$('[data-craft-message]').textContent='반려 사유를 적어 주세요.';return;}
      busy=true;epoch++;card.querySelectorAll('button').forEach(b=>{b.disabled=true;});const token=session(OPERATOR)?.token;
      try{await api(true,null,{id:r.id,version:r.version,status,note,confirmed});if(session(OPERATOR)?.token!==token)return;document.activeElement?.blur();signature='';$('[data-craft-message]').textContent='처리 완료 · 플레이어 제작공방에 자동 반영됩니다.';}
      catch(error){if(session(OPERATOR)?.token===token)$('[data-craft-message]').textContent=error.message;}
      finally{busy=false;card.querySelectorAll('button').forEach(b=>{b.disabled=false;});refresh();}
    });
    $('[data-craft-refresh]').onclick=refresh;
    addEventListener('storage',e=>{if(e.key===OPERATOR)refresh();});addEventListener('focus',refresh);
    setInterval(()=>{if(!document.hidden)refresh();},5000);refresh();
  }
  function scan(){try{installPlayer(document.getElementById('embeddedFrame')?.contentDocument);}catch(_){} }
  const frame=document.getElementById('embeddedFrame');frame?.addEventListener('load',scan);
  installOperator();scan();
  setInterval(()=>{if(document.hidden)return;scan();playerView?.refresh?.();},5000);
  addEventListener('focus',()=>{scan();playerView?.refresh?.();});
  addEventListener('storage',e=>{if([PLAYER,PROFILE].includes(e.key))playerView?.refresh?.();});
})();
