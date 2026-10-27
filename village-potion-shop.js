(function () {
  "use strict";

  const INVENTORY_KEY = "our-rpg-inventory-v1";
  const PROFILE_KEY = "our-rpg-player-profiles-v2";
  const STOCK_KEY = "our-rpg-village-shop-stock-v1";

  const TOWNS = [
    {
      region: "평원 · 해오름뜰",
      town: "해오름뜰",
      npc: "봄솔",
      note: "초반 생존에 필요한 값싼 물약",
      items: [
        ["plain-small-heal", "🧪", "작은 회복 물약", 30, "HP 20 회복", "구리동전 30개", 10],
        ["plain-antidote", "🌿", "초급 해독제", 80, "중독 1개 제거", "구리동전 80개", 10],
        ["plain-guard", "🛡️", "견습 방어 물약", 150, "전투 종료까지 방어력 +10%", "구리동전 150개", 10],
        ["plain-agility", "💨", "민첩 물약", 180, "전투 종료까지 이속 +10%", "구리동전 180개", 10],
        ["return", "📜", "귀환서", 5000, "전투 밖에서 마지막 안전 마을로 귀환", "실버동전 50개", 2]
      ]
    },
    {
      region: "대륙 · 큰길마루",
      town: "큰길마루",
      npc: "푸른샘",
      note: "본격적인 탐험과 보스전에 맞춘 물약",
      items: [
        ["continent-medium-heal", "⚗️", "중형 회복 물약", 300, "최대 HP의 25% 회복", "실버동전 3개", 6],
        ["continent-cleanse", "💠", "종합 해독제", 400, "해제 가능한 일반 상태이상 1개 제거", "실버동전 4개", 6],
        ["continent-power", "⚔️", "전투 강화 물약", 600, "전투 종료까지 공격력·마력 +15%", "실버동전 6개", 6],
        ["continent-guard", "🛡️", "수호 물약", 600, "전투 종료까지 방어력 +20%", "실버동전 6개", 6],
        ["continent-speed", "💨", "신속 물약", 700, "전투 종료까지 이속 +20%", "실버동전 7개", 6],
        ["return", "📜", "귀환서", 5000, "전투 밖에서 마지막 안전 마을로 귀환", "실버동전 50개", 2]
      ]
    },
    {
      region: "경계 · 끝빛보루",
      town: "끝빛보루",
      npc: "백야",
      note: "최종 보급 거점에서만 구입 가능한 고급 물약",
      items: [
        ["border-large-heal", "🍷", "대형 회복 물약", 2000, "최대 HP의 45% 회복", "실버동전 20개", 3],
        ["border-cleanse", "✨", "고급 정화 물약", 2500, "해제 가능한 일반 상태이상 전부 제거", "실버동전 25개", 3],
        ["border-hero", "⚔️", "영웅의 물약", 4000, "전투 종료까지 공격력·마력 +25%", "실버동전 40개", 3],
        ["border-fortress", "🛡️", "철벽 물약", 4000, "전투 종료까지 방어력 +30%", "실버동전 40개", 3],
        ["border-ultraspeed", "💨", "초신속 물약", 4500, "전투 종료까지 이속 +30%", "실버동전 45개", 3],
        ["border-full-heal", "❤️", "완전 회복 물약", 10000, "HP를 최대치까지 회복 · 부활 불가", "실버동전 100개", 1],
        ["return", "📜", "귀환서", 5000, "전투 밖에서 마지막 안전 마을로 귀환", "실버동전 50개", 2]
      ]
    }
  ];

  const LEGACY = {
    p1: ["🧪", "초급 회복 물약", "체력 20% 회복"],
    p2: ["⚗️", "중급 회복 물약", "체력 40% 회복"],
    p3: ["🍷", "상급 회복 물약", "체력 70% 회복"],
    clean: ["💠", "상태 회복 물약", "일반 상태이상 1개 해제"],
    return: ["📜", "귀환서", "전투 밖에서 마지막 안전 마을로 귀환"]
  };

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "") || fallback; }
    catch (_) { return fallback; }
  }

  function activeProfile() {
    const store = read(PROFILE_KEY, null);
    if (!store || !Array.isArray(store.profiles)) return null;
    return store.profiles.find(x => x.id === store.activeId) || store.profiles[0] || null;
  }

  function inventory(profile) {
    const api = window.RpgPotionInventory;
    if (!api) throw Error("포션 인벤토리를 불러오지 못했어. 최신본을 불러와 줘.");
    const c = api.context(profile.id);
    return { all: c.store, bag: c.bag };
  }

  function regionSelect(doc) {
    return [...doc.querySelectorAll("select")].find(select =>
      [...select.options].some(option => option.value === "평원 · 해오름뜰") &&
      [...select.options].some(option => option.value === "경계 · 끝빛보루")
    );
  }

  function townIndex(region) {
    const index = TOWNS.findIndex(town => town.region === region);
    return index < 0 ? 0 : index;
  }

  function koreaDay() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }

  function stockFor(profile) {
    const all = read(STOCK_KEY, {});
    const key = profile.id || profile.data.characterName;
    const day = koreaDay();
    if (!all[key] || all[key].day !== day) all[key] = { day, bought: {} };
    return { all, entry: all[key] };
  }

  function moneyTotal(profile) {
    const data = profile?.data || {};
    return (Number(data.copper) || 0) + (Number(data.silver) || 0) * 100 + (Number(data.gold) || 0) * 10000 + (Number(data.diamond) || 0) * 1000000;
  }

  function itemMap() {
    const map = {};
    TOWNS.forEach(town => town.items.forEach(item => { map[item[0]] = item; }));
    Object.entries(LEGACY).forEach(([id, item]) => { if (!map[id]) map[id] = [id, item[0], item[1], 0, item[2], "", 0]; });
    return map;
  }

  const ALL_ITEMS = itemMap();

  function saveInventory(all) {
    window.RpgPotionInventory.save(all);
  }

  function addStyle(doc) {
    if (doc.getElementById("villagePotionStyle")) return;
    const style = doc.createElement("style");
    style.id = "villagePotionStyle";
    style.textContent = `
      #rpgInventory.village-shop{border:1px solid #80682f;background:linear-gradient(145deg,#101b17,#0b1411);padding:15px;margin-top:14px}
      .vs-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.vs-head b{display:block;color:#f0cf7c;font-size:18px}.vs-head small{display:block;color:#9eb0a8;margin-top:3px}.vs-badge{border:1px solid #4f7464;background:#13271f;color:#bfe8d2;padding:7px 10px;font-weight:850;white-space:nowrap}
      .vs-rule{border-left:3px solid #d8ac55;background:#191b14;color:#c8d3ce;padding:9px 11px;margin:11px 0;font-size:12px}.vs-rule strong{color:#f0cf7c}.vs-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.vs-summary>div{border:1px solid #334b41;background:#0d1713;padding:9px 11px}.vs-summary small{display:block;color:#91a49b}.vs-summary b{color:#f0cf7c}
      .vs-group{margin-top:14px}.vs-group h5{display:flex;justify-content:space-between;gap:8px;margin:0 0 8px;color:#dce7e1;font-size:14px}.vs-group h5 span{color:#8fc7aa;font-size:12px}
      .vs-shop{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vs-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;border:1px solid #2e463c;background:#13211c;padding:10px}.vs-item>i{font-style:normal;font-size:25px}.vs-item b,.vs-item small,.vs-item strong{display:block}.vs-item small{color:#9eb0a8;line-height:1.45}.vs-item strong{color:#7dd5a5}.vs-stock{color:#f0cf7c!important;font-weight:800}.vs-buy{display:grid;gap:5px}.vs-buy label{font-size:11px;color:#9eb0a8}.vs-buy select{min-height:34px;background:#0c1512;color:#fff;border:1px solid #3d5a4e}.vs-buy button,.vs-slot button{min-height:38px;border:1px solid #80682f;background:#2d2518;color:#f6dfa5;font-weight:850;padding:5px 10px}.vs-owned{margin-top:9px}.vs-slot{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;border-bottom:1px solid #273a32;padding:8px 0}.vs-slot small{display:block;color:#9eb0a8}.vs-slot em{font-style:normal;color:#7dd5a5;font-weight:900}.vs-empty{color:#82928a;padding:9px 0}.vs-msg{min-height:24px;color:#7dd5a5;font-weight:800;margin:10px 0 0}.vs-history{margin:8px 0 0;padding-left:20px;color:#b8c8c0;font-size:12px}.vs-history time{color:#83968d}
      @media(max-width:760px){.vs-shop,.vs-summary{grid-template-columns:1fr}.vs-head{flex-direction:column}.vs-badge{white-space:normal}.vs-item{grid-template-columns:auto minmax(0,1fr)}.vs-buy{grid-column:2;grid-template-columns:1fr 80px;align-items:end}.vs-slot{grid-template-columns:minmax(0,1fr) auto}.vs-slot button{grid-column:1/-1;width:100%}}
    `;
    doc.head.appendChild(style);
  }

  function render(doc) {
    const section = doc.getElementById("status-section-05") || doc.getElementById("status-section-03");
    if (!section) return;
    const select = regionSelect(doc);
    const profile = activeProfile();
    const index = townIndex(select ? select.value : profile?.data?.region);
    const current = TOWNS[index];
    let panel = doc.getElementById("rpgInventory");
    if (!panel) {
      panel = doc.createElement("div");
    }
    const sectionBody = section.querySelector(".body") || section;
    if (panel.parentElement !== sectionBody) sectionBody.appendChild(panel);
    panel.id = "rpgInventory";
    panel.className = "village-shop";
    panel.dataset.villageShop = "1";
    addStyle(doc);

    const stock = profile ? stockFor(profile) : null;
    const groups = TOWNS.slice(0, index + 1).reverse().map((town, groupIndex) => `
      <section class="vs-group">
        <h5>${town.town} · 물약상 ${town.npc}<span>${groupIndex ? "이전 지역 주문" : "현재 마을 판매"}</span></h5>
        <div class="vs-shop">${town.items.map(item => `
          <article class="vs-item">
            <i>${item[1]}</i><div><b>${item[2]}</b><small>${item[4]}</small><strong>${item[5]}</strong><small class="vs-stock">오늘 남은 수량 ${Math.max(0, item[6] - Number(stock?.entry?.bought?.[item[0]] || 0))}/${item[6]}</small></div>
            <div class="vs-buy"><label>수량 <select aria-label="${item[2]} 구매 수량"><option>1</option><option>5</option><option>10</option></select></label><button type="button" data-vs-buy="${item[0]}">구매</button></div>
          </article>`).join("")}</div>
      </section>`).join("");

    panel.innerHTML = `
      <div class="vs-head"><div><b>🧪 ${current.town} 물약 상점</b><small>${current.note} · 구매 즉시 돈 차감·인벤토리 저장</small></div><span class="vs-badge">물약상 ${current.npc}</span></div>
      <div class="vs-rule"><strong>현재 지역: ${current.region}</strong><br>각 마을의 고급 물약은 해당 지역에 도착해야 열려. 상위 마을에서는 이전 지역 물약도 주문할 수 있어.</div>
      <div class="vs-summary"><div><small>현재 캐릭터</small><b>${profile?.data?.characterName || "저장 필요"}</b></div><div><small>보유 금액</small><b id="vsFunds">${window.OurRpgWallet?.format(moneyTotal(profile)) || moneyTotal(profile) + "구리"}</b></div></div>
      ${groups}<h4>내 소모품</h4><div class="vs-owned" id="villageOwned"></div><h4>최근 구매·사용</h4><ol class="vs-history" id="villageHistory"></ol><p class="vs-msg" id="invMsg" role="status" aria-live="polite"></p>`;

    function message(text, bad) {
      const box = panel.querySelector("#invMsg");
      if (box) { box.textContent = text; box.style.color = bad ? "#ff8b8b" : "#7dd5a5"; }
    }

    function drawOwned() {
      const box = panel.querySelector("#villageOwned");
      const active = activeProfile();
      if (!active) { box.innerHTML = '<p class="vs-empty">저장된 캐릭터가 없어.</p>'; return; }
      const bag = inventory(active).bag;
      const owned = Object.entries(bag.items || {}).filter(([, count]) => Number(count) > 0);
      box.innerHTML = owned.length ? owned.map(([id, count]) => {
        const item = ALL_ITEMS[id] || [id, "📦", id, 0, "효과는 운영자에게 확인", ""];
        return `<div class="vs-slot"><div><b>${item[1]} ${item[2]}</b><small>${item[4]}</small></div><em>${Number(count)}개</em><button type="button" data-vs-use="${id}">사용</button></div>`;
      }).join("") : '<p class="vs-empty">보유한 소모품이 없어.</p>';
      const history = panel.querySelector("#villageHistory");
      history.innerHTML = (bag.logs || []).slice(0, 5).map(log => `<li><b>${log.type}</b> · ${log.item}${log.quantity ? ` ×${log.quantity}` : ""} <time>${new Date(log.at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></li>`).join("") || "<li>아직 기록이 없어.</li>";
      const funds = panel.querySelector("#vsFunds");
      if (funds) funds.textContent = window.OurRpgWallet?.format(moneyTotal(active)) || moneyTotal(active) + "구리";
    }

    panel.onclick = event => {
      const buy = event.target.closest("[data-vs-buy]");
      const use = event.target.closest("[data-vs-use]");
      const active = activeProfile();
      if (!active) return message("먼저 캐릭터 현황표를 저장해 줘.", true);
      if (buy) {
        const item = ALL_ITEMS[buy.dataset.vsBuy];
        const quantity = Number(buy.parentElement.querySelector("select").value);
        const stockData = stockFor(active);
        const bought = Number(stockData.entry.bought[item[0]] || 0);
        const left = Math.max(0, item[6] - bought);
        if (quantity > left) return message(`오늘 재고가 부족해. ${item[2]}은 ${left}개 남았어.`, true);
        const wallet = window.OurRpgWallet;
        if (!wallet) return message("자동 지갑을 불러오지 못했어. 새로고침해 줘.", true);
        const tx = wallet.change(active.data.characterName, -item[3] * quantity, `상점 구매 · ${item[2]} ×${quantity}`, `VSHOP-${Date.now()}`);
        if (!tx.ok) return message(tx.message, true);
        const data = inventory(active);
        data.bag.items[item[0]] = Number(data.bag.items[item[0]] || 0) + quantity;
        data.bag.logs.unshift({ type: "구매", town: current.town, item: item[2], quantity, at: new Date().toISOString() });
        data.bag.logs = data.bag.logs.slice(0, 100);
        saveInventory(data.all);
        stockData.entry.bought[item[0]] = bought + quantity;
        localStorage.setItem(STOCK_KEY, JSON.stringify(stockData.all));
        render(doc);
        const nextMessage = doc.getElementById("rpgInventory")?.querySelector("#invMsg");
        if (nextMessage) nextMessage.textContent = `✓ ${current.town} · ${item[2]} ${quantity}개 구매 완료`;
      }
      if (use) {
        const item = ALL_ITEMS[use.dataset.vsUse] || [use.dataset.vsUse, "📦", use.dataset.vsUse, 0, "효과는 운영자에게 확인"];
        const data = inventory(active);
        const count = Number(data.bag.items[item[0]] || 0);
        if (!count) return;
        if (!confirm(`${item[2]} 1개를 사용할까?\n효과: ${item[4]}`)) return;
        data.bag.items[item[0]] = count - 1;
        data.bag.logs.unshift({ type: "사용", item: item[2], quantity: 1, at: new Date().toISOString() });
        data.bag.logs = data.bag.logs.slice(0, 100);
        saveInventory(data.all);
        drawOwned();
        message(`✓ ${item[2]} 사용 · ${item[4]}`);
      }
    };

    if (select && !select.dataset.villageShopWatch) {
      select.dataset.villageShopWatch = "1";
      select.addEventListener("change", () => setTimeout(() => render(doc), 40));
    }
    drawOwned();
  }

  function install() {
    const frame = document.getElementById("embeddedFrame");
    if (!frame) return;
    let lastSignature = "";
    const run = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc || !(doc.getElementById("status-section-05") || doc.getElementById("status-section-03"))) return;
        const select = regionSelect(doc);
        const profile = activeProfile();
        const bag = profile ? inventory(profile).bag : null;
        const signature = JSON.stringify([profile?.id || "", select?.value || profile?.data?.region || "", bag?.items || {}, (bag?.logs || []).slice(0, 5)]);
        const panel = doc.getElementById("rpgInventory");
        if (signature !== lastSignature || !panel || panel.dataset.villageShop !== "1") {
          lastSignature = signature;
          render(doc);
        }
      } catch (_) {}
    };
    frame.addEventListener("load", () => setTimeout(run, 80));
    window.addEventListener("our-rpg:profiles-updated", run);
    window.addEventListener("storage", run);
    setInterval(run, 700);
    setTimeout(run, 80);
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", install, { once: true }) : install();
})();
