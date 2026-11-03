(function () {
  "use strict";

  function regionLevelExp(region){const r=String(region||'');return r.includes('경계')||r==='boundary'?15000:r.includes('대륙')||r==='continent'?1000:500}


  const PROFILE_KEY = "our-rpg-player-profiles-v2";
  const MOVE_KEY = "our-rpg-last-movement-result-v1";
  const APPLIED_KEY = "our-rpg-movement-profile-applied-v1";
  const REGION_TO_FORM = { "평원": "plain", "대륙": "continent", "경계": "boundary" };
  const REGION_TO_STATUS = {
    "평원": "평원 · 해오름뜰",
    "대륙": "대륙 · 큰길마루",
    "경계": "경계 · 끝빛보루"
  };

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "") || fallback; }
    catch (_) { return fallback; }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function activeProfile(store) {
    if (!store || !Array.isArray(store.profiles) || !store.profiles.length) return null;
    return store.profiles.find(profile => profile && profile.id === store.activeId) || store.profiles[0];
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  }

  function statusRegion(region) {
    return REGION_TO_STATUS[region] || region || "평원 · 해오름뜰";
  }

  function formRegion(region) {
    const name = String(region || "").split(" · ")[0];
    return REGION_TO_FORM[name] || "plain";
  }

  function notice(doc, message, success) {
    let box = doc.getElementById("movementStatusNotice");
    if (!box) {
      box = doc.createElement("p");
      box.id = "movementStatusNotice";
      box.style.cssText = "margin:10px 0 0;padding:10px 12px;border-left:3px solid #d8ac55;background:#171910;color:#d7e5de;font-weight:800;line-height:1.55";
      doc.getElementById("judge")?.closest(".actions")?.insertAdjacentElement("afterend", box);
    }
    box.style.borderLeftColor = success ? "#6dc59b" : "#d8ac55";
    box.textContent = message;
  }

  function ownedPets(profile) {
    let pets = profile?.data?.petsOwned;
    try { if (typeof pets === "string") pets = JSON.parse(pets); } catch (_) { pets = []; }
    const seen = new Set();
    return (Array.isArray(pets) ? pets : []).filter(pet => {
      if (!pet || typeof pet.name !== "string" || !pet.name.trim() || seen.has(pet.name)) return false;
      seen.add(pet.name); return true;
    });
  }

  function movementPetData(profile) {
    const data = profile?.data || {};
    if (!Object.hasOwn(data, "movementPetName")) return data;
    const name = String(data.movementPetName || ""), pet = ownedPets(profile).find(pet => pet.name === name);
    if (!pet && name && name === data.petName) return data;
    return { ...data, petName: pet?.name || "", petGrade: pet ? pet.rarity || pet.grade || "" : "", petType: pet?.type || "", petEffect: pet?.effect || "" };
  }

  function escapePet(value) {
    return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function petChoiceGrade(pet) {
    if (/^HP-(?:[1-9]|1[0-3])$/.test(pet.hiddenPetCode || '')) return '히든';
    const grade = String(pet.rarity || pet.grade || '').trim().toUpperCase().replace(/급$/, '');
    if (['HIDDEN', '히든'].includes(grade)) return '히든';
    return ['SSS', 'SS', 'S', 'A', 'B', 'N'].includes(grade) ? grade : '등급 미기록';
  }
  function groupedPetOptions(pets) {
    return ['히든', 'SSS', 'SS', 'S', 'A', 'B', 'N', '등급 미기록'].map(grade => {
      const group = pets.filter(pet => petChoiceGrade(pet) === grade);
      if (!group.length) return '';
      const label = grade + (grade === '히든' || grade === '등급 미기록' ? '' : '급') + ' · ' + group.length + '종';
      return '<optgroup label="' + escapePet(label) + '">' + group.map(pet => '<option value="' + escapePet(pet.name) + '">[' + escapePet(grade) + '] ' + escapePet(pet.name) + '</option>').join('') + '</optgroup>';
    }).join('');
  }

  function petSwitchMessage(doc, text, bad = false) {
    const box = doc.getElementById("movementPetSwitchNotice");
    if (box) { box.textContent = text; box.style.color = bad ? "#f09595" : "#7dd5a5"; }
  }

  function petSwitchButton(doc, profile) {
    const select = doc.getElementById("movementPetSelect"), button = doc.getElementById("movementPetChange");
    if (!select || !button) return;
    const chosen = select.value;
    button.disabled = !profile?.data || select.dataset.ownerId !== profile.id || chosen === (movementPetData(profile).petName || "") || (chosen !== "" && !ownedPets(profile).some(pet => pet.name === chosen));
  }

  function renderPetChoices(doc, profile) {
    const select = doc.getElementById("movementPetSelect");
    if (!select) return;
    const pets = ownedPets(profile), current = movementPetData(profile).petName || "";
    select.innerHTML = '<option value="">동행 해제</option>' +
      (current && !pets.some(pet => pet.name === current) ? '<option value="'+escapePet(current)+'" disabled>'+escapePet(current)+' · 기존 동행</option>' : '') +
      groupedPetOptions(pets);
    select.value = current;
    select.dataset.ownerId = profile?.id || "";
    select.disabled = !profile;
    petSwitchButton(doc, profile);
  }

  function switchMovementPet(doc) {
    const select = doc.getElementById("movementPetSelect");
    if (!select) return;
    let saved = false;
    try {
      const store = read(PROFILE_KEY, null), profile = activeProfile(store);
      if (!profile?.data || select.dataset.ownerId !== profile.id) throw Error("캐릭터가 바뀌었어. 펫을 다시 선택해 줘.");
      const name = select.value, chosen = name ? ownedPets(profile).find(pet => pet.name === name) : null;
      if (name && !chosen) throw Error("이 캐릭터가 보유한 펫만 선택할 수 있어.");
      if ((movementPetData(profile).petName || "") === name) return;
      const data = profile.data;
      if (!Object.hasOwn(data, "battlePetName")) data.battlePetName = data.petName || "";
      data.movementPetName = chosen?.name || "";
      profile.updatedAt = new Date().toISOString();
      write(PROFILE_KEY, store);
      saved = true;
      doc.movementPetSwitchSaving = true;
      doc.movementPetSignature = "";
      loadProfile(doc, true);
      window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY, newValue: JSON.stringify(store) }));
      if (typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent("our-rpg:profiles-updated", { detail: { characterId: profile.id, source: "movement-pet-switch" } }));
      petSwitchMessage(doc, name ? "✓ " + name + " 이동용 설정 · 전투용 펫은 유지 · 다음 이동부터 적용돼." : "✓ 이동용 동행 해제 · 전투용 펫은 그대로야.");
    } catch (error) {
      petSwitchMessage(doc, saved ? "펫은 저장됐어. 이동 결과판을 다시 열어 확인해 줘." : (error.message || "펫 변경을 저장하지 못했어. 다시 시도해 줘."), true);
      if (!saved) { doc.movementPetSignature = ""; loadProfile(doc, true); }
    } finally { doc.movementPetSwitchSaving = false; }
  }

  function loadPet(doc, profile) {
    const data = movementPetData(profile);
    const name = String(data.petName || "").trim();
    const ownPet = ownedPets(profile).find(p => p.name === name);
    const effect = name ? String(globalThis.RpgPetMovement?.effectFor?.(ownPet) || data.petEffect || "") : "";
    const signature = JSON.stringify([profile?.id || "", name, effect, data.petGrade || "", data.petType || "", data.petsOwned || []]);
    if (doc.movementPetSignature === signature) return;
    doc.movementPetSignature = signature;
    renderPetChoices(doc, profile);
    const active = doc.getElementById("petActive");
    const fields = doc.getElementById("petFields");
    const petName = doc.getElementById("petName");
    const petEffect = doc.getElementById("petEffect");
    const rate = doc.getElementById("petRate");
    if (active) active.checked = !!name;
    if (fields) fields.hidden = !name;
    if (petName) petName.value = name;
    if (petEffect) petEffect.value = ownPet?.hiddenPetCode === "HP-4" ? effect.split("\n")[0] : effect;
    const match = effect.match(/(?:이동거리|이동 거리|이동)(?:\s*(?:증가|보정))?\s*\+\s*(\d+(?:\.\d+)?)\s*%/);
    if (rate) rate.value = String(match ? 100 + Number(match[1]) : 100);
    const randomNames = new Set(['행운 햄스터','도굴 두더지','동전 고양이','보물 미믹 새끼','장난꾸러기 여우','무지개 새','운명의 슬라임','황금 고블린 새끼','신비한 알','무지개 정령','운명의 정령','보물 정령','행운의 용','혼돈의 정령왕','기적의 별짐승','운명을 굴리는 자']);
    const grade = String(data.petGrade || '').trim().toUpperCase();
    const extras = name && !randomNames.has(name) && !String(data.petType || '').includes('랜덤') ? Math.min(2, ({N:1,B:2,A:3,S:5,SS:10,SSS:20})[grade] || 0) : 0;
    doc.movementPet = { name, effect, extras, rate: match ? 100 + Number(match[1]) : 100 };
    const summary = doc.getElementById('petMovementSummary');
    const timeMove = globalThis.RpgPetMovement?.distanceResult?.(0, !!name, profile)?.ability;
    doc.defaultView?.renderOdds?.();
    if (summary) summary.textContent = !name ? '동행 펫 없음 · 추가 이동 없음' : name + ' · 추가 이동 D100 ' + extras + '회 · 이동 보정 ' + (match ? 100 + Number(match[1]) : 100) + '%' + (timeMove ? ' · 최종 이동거리 ×2 +100 · 자동 적용' : /발견|확률|판정|랜덤|보조/.test(effect) ? ((globalThis.RpgPetMovement?.rules[name]||globalThis.RpgPetMovement?.distanceResult?.(0,true,profile)?.ability||globalThis.RpgPetMovement?.encounterRows?.([['일반 몬스터',30],['희귀 몬스터',12],['아무 일 없음',58]],true).ability)?' · 고유 능력 자동 판정':' · 수치 없는 고유 효과는 운영자 판정 필요') : '');
  }

  function loadProfile(doc, preserveRegion = false) {
    const store = read(PROFILE_KEY, null);
    const profile = activeProfile(store);
    loadPet(doc, profile);
    installTower(doc, profile);
    renderTower(doc, profile);
    const speed = Number(profile?.data?.speed);
    doc.movementSpeed = Number.isFinite(speed) && speed >= 0 ? speed : 0;
    const speedNotice = doc.getElementById("movementSpeedNotice");
    const inputMax = 100;
    const diceCount = doc.movementDiceCount?.(doc.movementSpeed) || 1;
    const moveInput = doc.getElementById("move");
    if (moveInput) { moveInput.max = String(inputMax); moveInput.placeholder = "1~" + inputMax; }
    if (speedNotice) speedNotice.textContent = "현황표 이속 " + doc.movementSpeed.toLocaleString("ko-KR") + " · 이동 D100 " + diceCount + "개 · 첫 결과 1~100 입력, 나머지 자동 굴림 (펫 주사위 별도)";
    if (!profile || !profile.data) {
      notice(doc, "현황표에 저장된 캐릭터가 없어. 먼저 플레이어 현황표에서 캐릭터를 저장해 줘.", false);
      return null;
    }
    const data = profile.data;
    const name = doc.getElementById("name");
    const total = doc.getElementById("total");
    const region = doc.getElementById("region");
    if (name) name.value = data.characterName || data.playerName || "";
    if (total) total.value = String(number(data.distance));
    if (region && (!preserveRegion || doc.movementProfileId !== profile.id)) {
      region.value = formRegion(data.region);
      region.dispatchEvent(new Event("change", { bubbles: true }));
    }
    doc.movementProfileId = profile.id;
    const visit = currentVillage(profile);
    const known = visit ? " · 현재 서브마을: " + visit.name : " · 이동 후 도착 구간의 서브마을을 별도로 판정해.";
    notice(doc, (data.characterName || data.playerName || "현재 캐릭터") + "의 현황을 불러왔어. 이동 판정이 끝나면 누적 거리와 지역이 자동 저장돼." + known, true);
    return profile;
  }

  // Public sub-villages are a separate discovery roll; they never replace encounters.
  const SUB_VILLAGES = [
    ["이슬고개", "평원", 700, 1400], ["바람씨앗 마을", "평원", 3100, 3900],
    ["은뿌리 마을", "대륙", 6300, 7300], ["달그늘 나루", "대륙", 11100, 12100],
    ["잿빛초소", "경계", 16000, 17500], ["별잠 마을", "경계", 21000, Infinity]
  ];

  // Player-facing excerpts from the existing twelve village quests only.
  // Puzzle answers, outcomes and private follow-up/class conditions stay in the operator book.
  const SUB_VILLAGE_QUESTS = [
  {
    "id": "dawn-bell",
    "village": "이슬고개",
    "grade": "I등급",
    "title": "🔔 달아난 새벽종",
    "clue": "풀숲에서 아주 작은 종소리가 들립니다. 소리는 가까워지다가 갑자기 뚝 끊겼습니다.",
    "arrival": "이슬 맺힌 돌담 너머로, 지도에 없던 작은 마을과 텅 빈 종루가 나타납니다.",
    "objective": "새벽 전에 종이 굴러간 흔적을 세 곳 조사한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 6%",
      "구리동전 100",
      "새벽이슬 연고 1개 — 전투 종료 후 체력 소량 회복"
    ]
  },
  {
    "id": "upside-herbs",
    "village": "이슬고개",
    "grade": "II등급",
    "title": "🌿 거꾸로 자란 약초밭",
    "clue": "흙이 하늘로 떨어지는 이상한 발자국이 밭 쪽으로 이어집니다.",
    "arrival": "약초들은 뿌리를 하늘로 뻗은 채 바람도 없이 흔들리고 있습니다.",
    "objective": "뿌리가 하늘을 향한 약초밭의 원인을 조사한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 12%",
      "실버동전 10",
      "대지의 제작 조각 1개",
      "이슬고개 호감도 +1"
    ]
  },
  {
    "id": "lost-windmill-song",
    "village": "바람씨앗 마을",
    "grade": "I등급",
    "title": "🎶 노래를 잃은 풍차",
    "clue": "바람은 부는데 풍차의 그림자만 멈춰 있습니다. 멀리서 세 음의 종소리가 들립니다.",
    "arrival": "하얀 풍차들이 고개를 숙인 듯 멈춰 있고, 중앙 풍차만 희미하게 떨립니다.",
    "objective": "세 풍차의 날개 방향을 기록한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 7%",
      "구리동전 120",
      "순풍 깃털 1개 — 다음 일반 이동 판정 보조, 발견 판정에는 미적용"
    ]
  },
  {
    "id": "rain-in-a-bottle",
    "village": "바람씨앗 마을",
    "grade": "II등급",
    "title": "🌧️ 병 속에 갇힌 비",
    "clue": "구름 한 점 없는데 어깨 위로 빗방울 하나가 떨어졌습니다. 빗방울은 풍차를 향해 굴러갑니다.",
    "arrival": "푸른 유리병 안에서 손바닥만 한 먹구름이 천천히 돌고 있습니다.",
    "objective": "이동 중 맑은 하늘에서 떨어진 빗방울을 추적한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 14%",
      "실버동전 12",
      "맑은비 물약 1개 — 상태이상 1개 해제"
    ]
  },
  {
    "id": "letter-under-roots",
    "village": "은뿌리 마을",
    "grade": "II등급",
    "title": "✉️ 뿌리 아래 묻힌 편지",
    "clue": "땅 위로 나온 은빛 뿌리 아래에서 오래된 종이 모서리가 보입니다.",
    "arrival": "지도에 없던 집들이 거대한 뿌리 사이에 조용히 기대어 서 있습니다.",
    "objective": "은빛 뿌리를 훼손하지 않고 편지를 꺼낸다.",
    "rewards": [
      "다음 레벨 필요 EXP의 11%",
      "실버동전 8",
      "은뿌리 마을 호감도 +1"
    ]
  },
  {
    "id": "sleeping-antler",
    "village": "은뿌리 마을",
    "grade": "III등급",
    "title": "🦌 잠든 사슴왕의 뿔",
    "clue": "나뭇가지 사이에 걸린 커다란 뿔에서 아주 느린 심장 소리가 들립니다.",
    "arrival": "뿔이 향한 숲길의 발자국들은 모두 제자리에서 끝나 있습니다.",
    "objective": "사냥꾼이 주운 왕관 모양 뿔의 주인을 조사한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 25%",
      "실버동전 40",
      "칭호 ‘숲의 손님’"
    ]
  },
  {
    "id": "second-moon-ferry",
    "village": "달그늘 나루",
    "grade": "II등급",
    "title": "🛶 두 번째 달의 나룻배",
    "clue": "물도 없는데 발밑에 달이 비칩니다. 멀리서 나무배가 다가오는 소리가 들립니다.",
    "arrival": "검은 강 위에 같은 달이 두 개 떠 있고, 얼굴 없는 뱃사공이 노를 세웁니다.",
    "objective": "물 위에 비친 두 달을 관찰하고 나루를 건널 방법을 조사한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 13%",
      "실버동전 14",
      "달물 부적 1개 — 공포 또는 혼란 1회 저항"
    ]
  },
  {
    "id": "nameless-ferryman",
    "village": "달그늘 나루",
    "grade": "I등급",
    "title": "🏮 이름 없는 뱃사공",
    "clue": "나루 아래에서 꺼진 등불 하나가 물살을 거슬러 떠오릅니다.",
    "arrival": "뱃사공은 가면을 쓴 채 텅 빈 등불 고리만 바라보고 있습니다.",
    "objective": "나루터 아래에서 꺼진 등불을 찾는다.",
    "rewards": [
      "다음 레벨 필요 EXP의 6%",
      "구리동전 150",
      "달그늘 무료 승선권 1개 — 퀘스트 이동에만 사용"
    ]
  },
  {
    "id": "last-beacon",
    "village": "잿빛초소",
    "grade": "III등급",
    "title": "🔥 마지막 봉화의 불씨",
    "clue": "재가 내리는 하늘 아래, 꺼진 줄 알았던 봉화가 한 번 붉게 깜박입니다.",
    "arrival": "성벽 위 마지막 불씨를 둘러싸고 빈 갑옷들이 원을 이루고 있습니다.",
    "objective": "재폭풍 속에서 봉화 재료 세 묶음을 모은다.",
    "rewards": [
      "다음 레벨 필요 EXP의 26%",
      "실버동전 45",
      "칭호 ‘불씨를 지킨 자’"
    ]
  },
  {
    "id": "armorless-guard",
    "village": "잿빛초소",
    "grade": "II등급",
    "title": "🛡️ 갑옷 없는 파수꾼",
    "clue": "주인 없는 갑옷이 길 한가운데 서서 오래된 전장을 가리킵니다.",
    "arrival": "재 아래에 묻힌 이름표들이 약한 빛을 내고, 주변에는 손대지 않은 무기들이 널려 있습니다.",
    "objective": "빈 갑옷이 가리키는 전장을 조사한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 12%",
      "실버동전 12",
      "파수의 철편 1개 — 받는 피해 1회 소폭 감소"
    ]
  },
  {
    "id": "unfallen-star",
    "village": "별잠 마을",
    "grade": "III등급",
    "title": "🌠 떨어지지 않는 별",
    "clue": "같은 별이 세 번 깜박인 뒤, 손안에 들어올 만큼 가까워 보입니다.",
    "arrival": "별잠 마을의 관측대 위에서 작은 별씨앗이 심장처럼 뛰고 있습니다.",
    "objective": "세 번의 밤 이동에서 같은 별의 깜박임을 기록한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 28%",
      "실버동전 55",
      "별잠 가루 1개 — 전투당 1회 자신의 일반 스킬 쿨타임 1턴 감소"
    ]
  },
  {
    "id": "name-eating-bell",
    "village": "별잠 마을",
    "grade": "II등급",
    "title": "🕯️ 이름을 먹는 종",
    "clue": "소리 없는 종이 흔들릴 때마다 가까운 비석의 글자가 한 글자씩 사라집니다.",
    "arrival": "종 아래에는 이름 대신 별과 나무, 파도 모양만 남은 비석 세 개가 서 있습니다.",
    "objective": "이름이 지워진 세 비석의 상징을 기록한다.",
    "rewards": [
      "다음 레벨 필요 EXP의 12%",
      "실버동전 10",
      "별명패 1개 — 능력치 없는 기념 토큰",
      "별잠 마을 호감도 +1"
    ]
  }
];

  function currentVillage(profile) {
    const state = profile?.data?.subVillageExploration;
    if (!state) return null;
    const visit = Object.prototype.hasOwnProperty.call(state, 'currentVisit') ? state.currentVisit : (Array.isArray(state.discovered) ? state.discovered.at(-1) : null);
    return visit && SUB_VILLAGES.some(v => v[0] === visit.name) ? visit : null;
  }

  function renderVillageQuests(doc, profile) {
    const list = doc.getElementById("subVillageQuestList");
    if (!list) return;
    const found = profile?.data?.subVillageExploration?.discovered;
    const visit = currentVillage(profile);
    const known = new Set(visit ? [visit.name] : []);
    const offers = SUB_VILLAGE_QUESTS.filter(q => known.has(q.village));
    if (!offers.length) { list.innerHTML = '<p>현재 머무는 서브마을이 없어. 이동에서 서브마을을 발견하면 그 마을의 퀘스트가 표시돼.</p>'; return; }
    const groups = [...new Set(offers.map(q => q.village))];
    list.innerHTML = '<h4>발견한 마을 퀘스트</h4><p>퀘스트를 받으면 현재 캐릭터에 저장돼. 진행 조건과 다음 단계, 완료·보상은 운영자가 확인해.</p>' + groups.map(village => '<section style="margin-top:14px"><h4>' + escapePet(village) + ' · ' + offers.filter(q => q.village === village).length + '개 의뢰</h4>' + offers.filter(q => q.village === village).map((q,i) => '<details data-village-quest="' + escapePet(q.id) + '"' + (i===0?' open':'') + ' style="margin:9px 0;padding:12px;border:1px solid #655936;border-radius:8px"><summary style="cursor:pointer;font-weight:800">' + escapePet(q.title) + ' · ' + escapePet(q.grade) + '</summary><p><b>발견 단서</b> · ' + escapePet(q.clue) + '</p><p>' + escapePet(q.arrival) + '</p><p><b>첫 목표</b> · ' + escapePet(q.objective) + '</p><p><b>공개 보상</b> · ' + q.rewards.map(escapePet).join(' · ') + '</p><p><button type="button" data-accept-village-quest="' + escapePet(q.id) + '"' + (profile?.data?.villageQuests?.[q.id] ? ' disabled' : '') + ' style="min-height:44px;padding:10px 14px;cursor:pointer">' + (profile?.data?.villageQuests?.[q.id] ? '받은 퀘스트 · 진행 조건 확인 필요' : '퀘스트 받기') + '</button></p><small>추가 선행 조건과 다음 단계는 운영자에게 확인해.</small></details>').join('') + '</section>').join('');
    list.querySelectorAll?.('[data-accept-village-quest]').forEach(button => button.addEventListener('click', () => {
      const store = read(PROFILE_KEY, null), current = activeProfile(store);
      // A stale card must never accept a quest for a different character.
      if (!current || current.id !== profile.id) { renderVillageQuests(doc, current); return; }
      const quest = SUB_VILLAGE_QUESTS.find(q => q.id === button.dataset.acceptVillageQuest);
      const found = current.data?.subVillageExploration?.discovered;
      if (!quest || !Array.isArray(found) || !found.some(v => v?.name === quest.village) || currentVillage(current)?.name !== quest.village) return;
      const records = current.data.villageQuests || {};
      if (records[quest.id]) { renderVillageQuests(doc, current); return; }
      const previous = current.updatedAt;
      current.data.villageQuests = {...records, [quest.id]: {id:quest.id, village:quest.village, title:quest.title, status:'accepted', eligibility:'operator-review', acceptedAt:new Date().toISOString()}};
      current.updatedAt = new Date().toISOString();
      try { write(PROFILE_KEY, store); }
      catch (_) { current.data.villageQuests = records; current.updatedAt = previous; notice(doc, '퀘스트 저장에 실패했어. 저장 공간을 확인한 뒤 다시 받아 줘.', false); return; }
      renderVillageQuests(doc, current);
      window.dispatchEvent(new Event('our-rpg:profiles-updated'));
      notice(doc, quest.title + ' 퀘스트를 받았어. 진행 조건과 다음 단계는 운영자에게 확인해.', true);
    }));
  }

  function discoverVillage(store, profile, move, roll = () => Math.floor(Math.random() * 100) + 1) {
    if (move.subVillage) return move.subVillage;
    const coordinate = Number(move.currentCoordinate);
    if (!Number.isSafeInteger(coordinate) || coordinate < 0) return null;
    const candidate = SUB_VILLAGES.find(v => coordinate >= v[2] && coordinate <= v[3]);
    const data = profile.data;
    const state = data.subVillageExploration || { moves: 0, failures: 0, lastMoveId: "", lastFoundAt: "", foundAtMove: 0, discovered: [] };
    if (state.lastMoveId === move.id) return null;
    state.moves = number(state.moves) + 1;
    state.lastMoveId = move.id;
    state.currentVisit = null;
    data.subVillageExploration = state;
    // The rediscovery cooldown belongs to the player, including their other characters.
    const recent = store.profiles.map(p => p.data?.subVillageExploration).filter(s => s?.lastFoundAt)
      .sort((a, b) => Date.parse(b.lastFoundAt) - Date.parse(a.lastFoundAt))[0];
    const at = Date.parse(move.at);
    const recentAt = Date.parse(recent?.lastFoundAt);
    const movesSinceFound = store.profiles.reduce((n, p) => {
      const s = p.data?.subVillageExploration;
      return n + (s && s.cooldownSince === recent?.lastFoundAt ? number(s.cooldownMoves) : 0);
    }, 0);
    if (recent) {
      if (state.cooldownSince !== recent.lastFoundAt) { state.cooldownSince = recent.lastFoundAt; state.cooldownMoves = 0; }
      state.cooldownMoves = number(state.cooldownMoves) + 1;
    }
    if (!candidate) return null;
    if (recent && (!Number.isFinite(at) || at - recentAt < 86400000 || movesSinceFound + 1 < 3)) return null;
    const raw = roll();
    const luck = Math.min(5, Math.floor(number(data.luck) / 10));
    const pity = Math.min(3, Math.floor(number(state.failures) / 8));
    const threshold = { "평원": 93, "대륙": 94, "경계": 95 }[candidate[1]];
    const success = raw + luck + pity >= threshold;
    const result = { movementId: move.id, at: move.at, name: success ? candidate[0] : "", success, raw, luck, pity };
    move.subVillage = result;
    if (!success) { state.failures = number(state.failures) + 1; return result; }
    state.currentVisit = {name: candidate[0], movementId: move.id, at: move.at};
    state.failures = 0;
    state.lastFoundAt = move.at;
    state.foundAtMove = state.moves;
    state.cooldownSince = move.at;
    state.cooldownMoves = 0;
    const found = Array.isArray(state.discovered) ? state.discovered : [];
    if (!found.some(v => v.name === candidate[0])) found.push({ name: candidate[0], region: candidate[1], at: move.at, movementId: move.id });
    state.discovered = found;
    return result;
  }

  function showVillageResult(doc, move) {
    const result = doc.getElementById("result");
    const village = move.subVillage;
    if (!result || !village?.success || result.textContent.includes("서브 마을 발견 · " + village.name)) return;
    result.textContent += "\n서브 마을 발견 · " + village.name + "\n마을 의뢰·입장은 운영자 확인 · 히든 지역 발견과 별도";
  }

  function saveMovement(doc, previousId, ownerId) {
    const move = read(MOVE_KEY, null);
    if (!move || !move.id || move.id === previousId) return;
    const applied = read(APPLIED_KEY, []);
    if (Array.isArray(applied) && applied.includes(move.id)) {
      notice(doc, "이 이동은 이미 현황표에 기록되어 있어. 중복으로 더하지 않았어.", false);
      return;
    }
    const store = read(PROFILE_KEY, null);
    const profile = store?.profiles?.find(p => p && p.id === ownerId);
    if (!profile || !profile.data) {
      notice(doc, "이동 결과는 나왔지만 저장할 캐릭터 현황표가 없어.", false);
      return;
    }
    const data = profile.data;
    const previous = number(data.distance);
    const resultTotal = number(move.currentCoordinate);
    const moved = number(move.distance != null ? move.distance : move.moved);
    data.distance = Number.isFinite(Number(move.currentCoordinate)) ? resultTotal : (previous + moved);
    const previousRegion = data.region;
    data.region = statusRegion(move.region);
    if (!data.lastSafeTown || previousRegion !== data.region) {
      const base = data.region.startsWith('경계') ? 15000 : data.region.startsWith('대륙') ? 5000 : 0;
      data.lastSafeTown = {name: data.region.split(' · ')[1], region: data.region, distance: base};
    }
    data.expNeeded = String(regionLevelExp(data.region));
    data.lastMovement = [move.at || new Date().toISOString(), "+" + moved, move.encounter || "결과 미기록"].join(" · ");
    move.characterId = profile.id;
    move.character = data.characterName || data.playerName || move.character || "";
    try {
    globalThis.RpgPetMovement?.apply(profile, move);
    discoverVillage(store, profile, move);
    if (data.subVillageExploration) data.subVillageExploration.currentVisit = move.subVillage?.success ? {name: move.subVillage.name, movementId: move.id, at: move.at} : null;
    if (move.subVillage?.success) data.lastSafeTown = {name: move.subVillage.name, region: data.region, distance: resultTotal};
    if (move.subVillage?.success) data.lastMovement += " · 서브 마을 발견 · " + move.subVillage.name;
    profile.updatedAt = new Date().toISOString();
    write(PROFILE_KEY, store);
    write(MOVE_KEY, move);
    write(APPLIED_KEY, [...(Array.isArray(applied) ? applied : []), move.id].slice(-100));
    } catch (_) {
      notice(doc, "이동 현황 저장에 실패했어. 저장 공간을 확인해 줘.", false);
      return;
    }
    showVillageResult(doc, move);
    renderResultCodexLinks(doc, move);
    if (activeProfile(store)?.id === profile.id) renderTower(doc, profile);
    const total = doc.getElementById("total");
    if (total) total.value = String(data.distance);
    window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY, newValue: JSON.stringify(store) }));
    notice(doc, "✓ " + (move.character || "현재 캐릭터") + " 현황에 기록 완료 · 누적 이동거리 " + data.distance.toLocaleString("ko-KR") + " · " + data.region, true);
  }

  const TOWER_CLUE_ID = "tower-worn-record-v1";
  const TOWER_HINT = "망자의 이름을 기억하는 술사가 있었다. 밤의 폐허에 남은 기록을 찾아라. 답을 찾거든 흑마법의 기원을 아는 자에게 물어라.";

  function towerLocations(profile) {
    const region = formRegion(profile?.data?.region);
    const main = { plain: "해오름뜰", continent: "큰길마루", boundary: "끝빛보루" }[region];
    const locations = [main];
    const distance = Number(profile?.data?.distance);
    const found = profile?.data?.subVillageExploration?.discovered;
    if (Array.isArray(found)) for (const village of SUB_VILLAGES) {
      if (REGION_TO_FORM[village[1]] === region && distance >= village[2] && distance <= village[3] && found.some(v => v.name === village[0])) locations.push(village[0]);
    }
    return locations;
  }

  function towerRecord(profile) {
    return (Array.isArray(profile?.data?.towerClues) ? profile.data.towerClues : []).find(r => r.id === TOWER_CLUE_ID);
  }

  function canInvestigateTower(profile) {
    const data = profile?.data;
    if (!data) return false;
    try {
      const jobs = globalThis.RpgSkillLearning?.allowedJobs?.(data);
      if (jobs) return jobs.has("마법사");
    } catch (_) { return false; }
    const mageJobs = new Set(["법사", "마법사", "대마도사", "대원소술사", "마도 현자", "마도대현자", "비전술사", "빙결대현자", "빙결술사", "빙결의 현자", "서리 마도사", "아크메이지", "영원의 서리", "원소술사", "원소의 지배자", "정령 마도사", "정령왕의 계약자", "폭염 마도사", "폭염의 지배자", "화염대현자", "화염술사", "화염의 현자"]);
    const base = String(data.job || "").replace(/\([^)]*\)/g, "").split(/[→>,/|·\n]+/)[0].trim();
    return mageJobs.has(base);
  }

  function findTowerClue(profile, village, at = new Date().toISOString()) {
    if (!canInvestigateTower(profile)) throw Error("마법사 계열 직업만 마탑을 조사할 수 있어.");
    if (!profile?.id || !profile.data || (village !== "마탑" && !towerLocations(profile).includes(village))) throw Error("조사할 마탑을 확인해 줘.");
    const existing = towerRecord(profile);
    if (existing) return existing;
    const record = { id: TOWER_CLUE_ID, village, at, hint: TOWER_HINT };
    profile.data.towerClues = [...(Array.isArray(profile.data.towerClues) ? profile.data.towerClues : []), record];
    profile.updatedAt = at;
    return record;
  }

  function towerText(profile, record) {
    return "[우리들의 RPG · 마탑 조사 기록]\n캐릭터: " + (profile.data.characterName || profile.data.playerName || "현재 캐릭터") + "\n조사 장소: 마탑\n발견: ??? · 낡은 기록\n단서: " + record.hint + "\n발견 시각: " + record.at + "\n단서는 운영자에게 보여 줘. 후속 조건·전직·보상은 운영자가 확인해.";
  }

  function renderTower(doc, profile) {
    const panel = doc.getElementById("villageTowerPanel");
    if (!panel) return;
    const select = doc.getElementById("towerVillage"), button = doc.getElementById("towerInvestigate"), result = doc.getElementById("towerClueResult"), copy = doc.getElementById("towerClueCopy");
    const visit = currentVillage(profile);
    const villageStatus = doc.getElementById("subVillageStatus");
    if (villageStatus) villageStatus.textContent = visit ? "발견한 서브마을 · " + visit.name + "\n다음 이동을 하면 이 마을에서 떠나." : profile?.data ? "현재 머무는 서브마을이 없어. 새 서브마을을 발견하면 여기에 표시돼." : "현황표에서 캐릭터를 먼저 선택해 줘.";
    renderVillageQuests(doc, profile);
    select.value = "마탑";
    select.dataset.ownerId = profile?.id || "";
    const eligible = canInvestigateTower(profile);
    button.disabled = !eligible;
    const record = towerRecord(profile);
    button.textContent = profile && !eligible ? "마법사 계열만 조사 가능" : record ? "발견한 기록 다시 보기" : "마탑 기록 조사";
    result.textContent = profile && !eligible ? "마법사 계열 직업만 마탑을 조사할 수 있어." : record ? towerText(profile, record) : profile ? "마탑에 남은 낡은 기록을 조사할 수 있어. 발견한 단서는 캐릭터에 저장돼." : "먼저 현황표에서 캐릭터를 저장해 줘.";
    copy.hidden = !record || !eligible;
  }

  function installTower(doc, profile) {
    if (!doc.getElementById("result") || doc.getElementById("villageTowerPanel")) return;
    const villagePanel = doc.createElement("section");
    villagePanel.id = "subVillagePanel";
    villagePanel.style.cssText = "margin-top:18px;padding:16px;border:1px solid #807248;border-radius:8px;line-height:1.65";
    villagePanel.innerHTML = '<h3>서브마을</h3><p id="subVillageStatus" role="status" style="white-space:pre-line"></p><p>서브마을은 다음 이동을 하면 화면에서 사라져. 새 마을을 발견하면 여기에서 확인해. 이미 받은 퀘스트는 퀘스트 진행판에 남아.</p><div id="subVillageQuestList"></div>';
    const panel = doc.createElement("section");
    panel.id = "villageTowerPanel";
    panel.style.cssText = villagePanel.style.cssText;
    panel.innerHTML = '<h3>마탑</h3><p>마법사 계열만 마탑의 기록을 조사할 수 있어.</p><input id="towerVillage" type="hidden" value="마탑"><button type="button" id="towerInvestigate">마탑 기록 조사</button><pre id="towerClueResult" role="status" style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit"></pre><button type="button" id="towerClueCopy" hidden>단서 기록 복사</button>';
    doc.getElementById("result").after(villagePanel);
    villagePanel.after(panel);
    doc.getElementById("towerInvestigate").addEventListener("click", () => {
      const select = doc.getElementById("towerVillage");
      try {
        const store = read(PROFILE_KEY, null), current = activeProfile(store);
        if (!current || current.id !== select.dataset.ownerId) throw Error("캐릭터가 바뀌었어. 마탑을 다시 선택해 줘.");
        const record = findTowerClue(current, select.value);
        write(PROFILE_KEY, store);
        renderTower(doc, current);
        window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY, newValue: JSON.stringify(store) }));
        if (typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent("our-rpg:profiles-updated", { detail: { characterId: current.id, source: "tower-investigation" } }));
      } catch (error) { doc.getElementById("towerClueResult").textContent = "저장하지 못했어 · " + error.message; }
    });
    doc.getElementById("towerClueCopy").addEventListener("click", async () => {
      const current = activeProfile(read(PROFILE_KEY, null)), record = towerRecord(current);
      if (!record || !canInvestigateTower(current) || current.id !== doc.getElementById("towerVillage").dataset.ownerId) return;
      try { await navigator.clipboard.writeText(towerText(current, record)); doc.getElementById("towerClueCopy").textContent = "복사 완료"; }
      catch (_) { doc.getElementById("towerClueCopy").textContent = "기록을 길게 눌러 복사해 줘"; }
    });
    renderTower(doc, profile);
  }

  function installResultCodexLinks(doc) {
    const result = doc.getElementById("result");
    if (!result || doc.getElementById("movementResultCodexLinks")) return;
    const links = doc.createElement("nav");
    links.id = "movementResultCodexLinks";
    links.setAttribute("aria-label", "이번 이동 결과 도감 바로가기");
    links.hidden = true;
    result.after(links);
  }

  function renderResultCodexLinks(doc, move) {
    const links = doc.getElementById("movementResultCodexLinks");
    if (!links) return;
    links.replaceChildren();
    links.hidden = true;
    links.style.cssText = "";
    if (!move) return;
    const add = (label, action) => {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.cssText = "min-height:44px;padding:10px 14px;border:1px solid #a78a48;border-radius:6px;background:#302911;color:#f4df9b;font-weight:800;cursor:pointer";
      button.addEventListener("click", action);
      links.append(button);
    };
    const encounter = String(move.encounter || "");
    const route = (label, slug) => add(label, () => document.querySelector('a[href="' + slug + '/"]')?.click());
    if (/몬스터|보스/.test(encounter)) route("몬스터 전투 도감", "our-rpg-monster-battle");
    else if (/상자/.test(encounter)) route("상자 도감", "our-rpg-treasure-codex");
    else if (/탈것/.test(encounter)) route("탈것 도감", "our-rpg-mounts-open");
    if (move.subVillage?.success) add(move.subVillage.name + " · 퀘스트 보기", () => doc.getElementById("subVillagePanel")?.scrollIntoView({behavior:"smooth", block:"start"}));
    if (links.childElementCount) {
      links.hidden = false;
      links.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin:12px 0";
    }
  }

  function bind(doc) {
    const judge = doc && doc.getElementById("judge");
    if (!judge || judge.dataset.statusBridge === "1") return;
    judge.dataset.statusBridge = "1";
    loadProfile(doc);
    installResultCodexLinks(doc);
    const petSelect = doc.getElementById("movementPetSelect"), petChange = doc.getElementById("movementPetChange");
    if (petSelect) petSelect.addEventListener("change", () => petSwitchButton(doc, activeProfile(read(PROFILE_KEY, null))));
    if (petChange) petChange.addEventListener("click", () => switchMovementPet(doc));
    judge.addEventListener("click", function (event) {
      const profile = loadProfile(doc, true);
      if (!profile) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const previousId = read(MOVE_KEY, null)?.id;
      setTimeout(function () { saveMovement(doc, previousId, profile.id); }, 0);
    }, true);
    window.addEventListener("storage", function (event) {
      if (event.key === PROFILE_KEY && doc.defaultView && !doc.defaultView.closed) loadProfile(doc, !!doc.movementPetSwitchSaving);
    });
    window.addEventListener("our-rpg:profiles-updated", function () {
      if (doc.defaultView && !doc.defaultView.closed) loadProfile(doc, !!doc.movementPetSwitchSaving);
    });
  }

  function run() {
    const frame = document.getElementById("embeddedFrame");
    if (!frame) return;
    const doc = frame.contentDocument;
    if (doc && doc.getElementById("judge")) bind(doc);
  }

  function attach() {
    const frame = document.getElementById("embeddedFrame");
    if (!frame) return;
    if (frame.dataset.movementStatusBridge !== "1") {
      frame.dataset.movementStatusBridge = "1";
      frame.addEventListener("load", function () { setTimeout(run, 0); });
    }
    run();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attach, { once: true });
  else attach();
})();


