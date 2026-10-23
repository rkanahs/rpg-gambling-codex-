(() => {
  'use strict';
  const remove = selector => document.querySelectorAll(selector).forEach(node => node.remove());
  function addBattleLink(nav, label) {
    if (!nav || nav.querySelector('a[href="#battle-manager"]')) return;
    const link = document.createElement('a');
    link.href = '#battle-manager';
    link.innerHTML = label;
    const movement = nav.querySelector('a[href="#movement"]');
    movement?.insertAdjacentElement('afterend', link);
  }
  function cleanOperatorCodex() {
    remove('.security-banner');
    remove('.side-note');
    remove('#revisions');
    remove('a[href="#revisions"]');
    const brandLine = document.querySelector('.brand p');
    if (brandLine) brandLine.textContent = '운영자 전용 · 실전 운영판';
    const homeIntro = document.querySelector('#home > p');
    if (homeIntro) homeIntro.textContent = '검색·판정·기록·복사 기능을 한곳에서 사용하는 운영자 전용 도감입니다.';
    const priority = [...document.querySelectorAll('.warning strong')].find(node => node.textContent.includes('자료 적용 우선순위'));
    if (priority) {
      const paragraph = priority.parentElement?.querySelector('p');
      if (paragraph) paragraph.textContent = '현재 도감에 표시된 실전 규칙과 최신 자동화 결과를 우선 적용합니다.';
    }
    const desktopNav = document.querySelector('.sidebar .nav');
    addBattleLink(desktopNav, '<span>⚔</span>전투 진행판');
    const mobileNav = document.querySelector('#mobileTocPanel');
    addBattleLink(mobileNav, '전투 진행판');
    const footer = document.querySelector('.footer');
    const battle = document.querySelector('#battle-manager');
    const main = document.querySelector('main');
    if (footer && battle && main) {
      footer.innerHTML = '<strong>우리들의 RPG · 운영자 통합 도감</strong><br>운영 기록과 설정은 현재 브라우저에 저장됩니다.';
      main.appendChild(footer);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cleanOperatorCodex, { once: true });
  else cleanOperatorCodex();
})();

(()=>{if(document.querySelector('script[data-story-codex]'))return;const s=document.createElement('script');s.src='story-codex.js?v=20261024-story1';s.defer=true;s.dataset.storyCodex='1';document.head.appendChild(s)})();
