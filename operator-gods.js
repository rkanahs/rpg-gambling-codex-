(()=>{
 'use strict';
 const main=document.querySelector('main');if(!main||document.getElementById('god-covenants'))return;
 const sealed=Date.now()<Date.parse('2026-12-01T00:00:00+09:00');
 const gods=[
  {name:'전투의 신',effect:'공격력 +30%',story:'전 용사가 만났던 신.'},
  {name:'수호의 신',effect:'방어력 +30%',story:'방어를 강화하는 계약.'},
  {name:'생명의 신',effect:'최대 HP +30%',story:'생존력을 강화하는 계약.'},
  {name:'지혜의 신',effect:'마력 +30%',story:'마력을 강화하는 계약.'},
  {name:'여행의 신',effect:'이속 +30%',story:'이속 능력치를 강화하는 계약.'}
 ];
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const style=document.createElement('style');style.textContent=`
 #god-covenants{scroll-margin-top:95px;margin:36px 0;padding:24px;border:1px solid #92783c;border-radius:14px;background:#101b16;color:#e8efe9;line-height:1.8}
 #god-covenants h2{margin:4px 0 8px;color:#f1d58b;font-size:28px}#god-covenants h3{color:#e7cb83;margin:4px 0 10px}#god-covenants p{margin:8px 0}
 #god-covenants .god-kicker{font-size:12px;letter-spacing:.12em;color:#a9bba8}#god-covenants .god-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px;margin:18px 0}
 #god-covenants .god-card{padding:16px;border:1px solid #415e4a;border-radius:10px;background:#0b1510}#god-covenants .god-effect{display:block;color:#ffe09a;font-size:24px;font-weight:850}
 #god-covenants .god-block{padding:18px;border:1px solid #405b49;border-radius:10px;margin:16px 0;background:#14221a}#god-covenants .god-hidden{border-color:#75628c;background:#1a1722}#god-covenants .god-hidden h3{color:#d7b8ec}
 #god-covenants ol,#god-covenants ul{padding-left:24px}#god-covenants li{margin:8px 0}#god-covenants strong{color:#f4d992}#god-covenants .god-note{font-size:13px;color:#b4c1b6}
 #god-covenants .god-actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}#god-covenants button{min-height:44px;padding:10px 15px;border:1px solid #b09757;border-radius:8px;background:#362b15;color:#ffdf91;font:inherit;cursor:pointer}
 @media(max-width:600px){#god-covenants{padding:16px;margin:24px 0}#god-covenants h2{font-size:24px}#god-covenants .god-effect{font-size:22px}}
 `;document.head.append(style);
 const panel=document.createElement('section');panel.id='god-covenants';panel.className='content-section';panel.setAttribute('aria-labelledby','god-covenants-title');
 panel.innerHTML='<header><small class="god-kicker">GOD COVENANTS · 운영자 규칙 안내</small><h2 id="god-covenants-title">✦ 신과의 계약</h2><p>경계에서 만나는 다섯 신과 <strong>???</strong>의 계약 조건·효과를 확인합니다.</p></header>'+
 (sealed?'<p role="status"><strong>신 계약 봉인 중</strong> · 한국 시간 2026년 12월 1일 0시까지 신규 계약 불가</p>':'')+
 '<section class="god-block"><h3>계약 선택 순서</h3><ol><li><strong>경계 최초 도착</strong> 시 신 선택 기회가 열립니다. 이미 경계에 도착한 캐릭터도 미계약 상태라면 선택할 수 있습니다.</li><li>다섯 신 중 하나와 계약하면 <strong>해당 캐릭터는 다시 선택하거나 계약을 변경할 수 없습니다.</strong></li><li>다섯 신을 모두 거절하면 <strong>???와 즉시 계약을 시도</strong>합니다. 서버 전체에서 한 계정만 가능하며, 다른 계약자가 있다면 선택 기회는 유지됩니다.</li></ol><p class="god-note">플레이어 선택 위치: 현황표 상단 → 신과의 계약. 계약 기록은 기존 기기간 연동 계정에 저장됩니다.</p></section>'+
 '<h3>일반 신 5명 · 해당 능력치 +30%</h3><div class="god-grid">'+gods.map(g=>'<article class="god-card"><h3>'+esc(g.name)+'</h3><span class="god-effect">'+esc(g.effect)+'</span><p>'+esc(g.story)+'</p></article>').join('')+'</div>'+
 '<p>축복은 <strong>장비와 기존 강화가 반영된 적용 능력치에 비례</strong>해 계산합니다. 저장된 기본 능력치 자체를 덮어쓰거나, 화면을 열 때마다 보너스를 반복해서 더하지 않습니다.</p>'+
 '<section class="god-block god-hidden"><h3>??? · 서버 한 계정 계약</h3><p>계약 후 이동 결과가 <strong>아무 일 없음</strong>이면 그 이동에서 D6를 한 번 굴릴 수 있습니다.</p><ul><li>무작위 능력치 하나에 짝수 +2·+4·+6%p, 홀수 −1·−3·−5%p가 적용됩니다. 최저 0%입니다.</li><li>첫 주사위에서 지정한 한 능력치는 최대 30%, 나머지는 각각 최대 10%입니다.</li><li>사망하면 보너스는 0%로 초기화됩니다. 계약과 지정한 능력치는 유지됩니다.</li><li>새 캐릭터에도 계정의 계약은 이어지며 보너스는 캐릭터별로 기록됩니다.</li></ul></section>'+
 '<div class="god-actions"><button type="button" id="copyGodCovenantRules">신 계약 규칙 복사</button><span id="godCovenantCopyStatus" role="status"></span></div>';
 const shortcut=document.createElement('a');
 shortcut.href='#god-covenants';shortcut.textContent='✦ 신과의 계약'+(sealed?' · 봉인 중':'');
 shortcut.style.cssText='display:inline-block;margin:12px 0;padding:9px 14px;border:1px solid #92783c;border-radius:8px;background:#201c11;color:#ffe09a;font-weight:700';
 main.prepend(shortcut);
 const anchor=document.getElementById('hidden')||document.querySelector('main .footer');if(anchor?.parentElement===main)main.insertBefore(panel,anchor);else main.append(panel);
 for(const nav of document.querySelectorAll('.sidebar .nav,#mobileTocPanel')){if(nav.querySelector('a[href="#god-covenants"]'))continue;const a=document.createElement('a');a.href='#god-covenants';a.textContent='✦ 신과의 계약';const hidden=nav.querySelector('a[href="#hidden"]');if(hidden)hidden.before(a);else nav.append(a)}
 if(location.hash==='#god-covenants')panel.scrollIntoView({block:'start'});
 panel.querySelector('#copyGodCovenantRules').onclick=async()=>{const status=panel.querySelector('#godCovenantCopyStatus');try{const text=[...panel.querySelectorAll('header,h3,.god-effect,p,li')].filter(el=>!el.closest('.god-actions')&&el.tagName!=='HEADER'&&!el.querySelector('li')).map(el=>el.innerText.trim()).filter(Boolean).join('\n');await navigator.clipboard.writeText(text);status.textContent='신 계약 규칙을 복사했습니다.'}catch{status.textContent='복사가 막혔습니다. 필요한 문장을 선택해 복사해 주세요.'}};
})();
