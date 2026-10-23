(() => {
  'use strict';

  function placeStoryInStartAndWorld() {
    const story = document.querySelector('#story-codex');
    const heading = [...document.querySelectorAll('.catalog-section .section-head h2')]
      .find(node => node.textContent.trim() === '시작과 세계');
    const section = heading?.closest('.catalog-section');
    const grid = section?.querySelector('.grid');
    if (!section || !grid) return false;

    let card = grid.querySelector('[data-story-card]');
    if (!card) {
      card = document.createElement('a');
      card.className = 'card';
      card.dataset.storyCard = '1';
      grid.prepend(card);
    }
    card.href = 'our-rpg-story-codex/';
    card.innerHTML = '<span class="icon">📖</span><h3>세계 이야기 도감</h3><p>왕실 소환, 신의 종족 축복, 사라진 전 용사와 보스 부활 이야기</p><small>도감 열기 →</small>';

    // 본문에 중복으로 붙던 긴 스토리는 없애고 독립 도감으로만 제공한다.
    if (story) story.remove();
    return true;
  }

  function init() {
    if (placeStoryInStartAndWorld()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (placeStoryInStartAndWorld() || tries >= 20) clearInterval(timer);
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
