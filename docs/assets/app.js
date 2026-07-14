const menuButton = document.querySelector('.menu-button');
const mainNav = document.querySelector('.main-nav');

if (menuButton && mainNav) {
  menuButton.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

const searchApp = document.querySelector('[data-search-app]');

if (searchApp) {
  const input = document.querySelector('#atlas-search');
  const results = document.querySelector('#search-results');
  const resultCount = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-results');
  const period = document.querySelector('#period-filter');
  const sort = document.querySelector('#sort-results');
  const clear = document.querySelector('#clear-filters');
  const kindInputs = [...document.querySelectorAll('input[name="kind"]')];
  let index = [];

  const fold = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function readParams() {
    const params = new URLSearchParams(location.search);
    input.value = params.get('q') || '';
    const topic = params.get('tema');
    if (topic && !input.value) input.value = topic;
  }

  function resultCard(item) {
    const media = item.kind === 'imagem'
      ? `<div class="result-media"><img src="${item.image}" alt="" loading="lazy"></div>`
      : item.kind === 'livro'
        ? `<div class="result-media book" aria-hidden="true">${escapeHtml(item.title)}</div>`
        : `<div class="result-media concept" aria-hidden="true">${escapeHtml(item.title.slice(0, 1))}</div>`;
    return `<article class="search-result"><a href="${item.url}">${media}</a><div class="result-copy"><p class="eyebrow">${escapeHtml(item.label)}${item.date ? ` · ${escapeHtml(item.date)}` : ''}</p><h2><a href="${item.url}">${escapeHtml(item.title)}</a></h2>${item.creator ? `<p>${escapeHtml(item.creator)}</p>` : ''}<p>${escapeHtml(item.excerpt)}</p></div></article>`;
  }

  function render() {
    const query = fold(input.value.trim());
    const words = query.split(/\s+/).filter(Boolean);
    const selectedKinds = kindInputs.filter((box) => box.checked).map((box) => box.value);
    let filtered = index.map((item) => {
      const text = fold(item.searchText);
      const score = words.reduce((total, word) => total + (fold(item.title).includes(word) ? 5 : 0) + (fold(item.creator).includes(word) ? 3 : 0) + (text.includes(word) ? 1 : 0), 0);
      return { ...item, score };
    }).filter((item) => (!words.length || words.every((word) => fold(item.searchText).includes(word)))
      && (!selectedKinds.length || selectedKinds.includes(item.kind))
      && (!period.value || item.period === period.value));

    filtered.sort((a, b) => {
      if (sort.value === 'oldest') return (a.year || 9999) - (b.year || 9999);
      if (sort.value === 'newest') return (b.year || 0) - (a.year || 0);
      if (sort.value === 'title') return a.title.localeCompare(b.title, 'pt-BR');
      return b.score - a.score || a.title.localeCompare(b.title, 'pt-BR');
    });

    resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`;
    results.innerHTML = filtered.map(resultCard).join('');
    empty.hidden = filtered.length > 0;
    const params = new URLSearchParams();
    if (input.value.trim()) params.set('q', input.value.trim());
    const nextUrl = `${location.pathname}${params.size ? `?${params}` : ''}`;
    history.replaceState({}, '', nextUrl);
  }

  readParams();
  fetch('/assets/search-index.json')
    .then((response) => response.json())
    .then((data) => { index = data; render(); })
    .catch(() => { resultCount.textContent = 'Não foi possível carregar o índice de busca.'; });

  input.addEventListener('input', render);
  period.addEventListener('change', render);
  sort.addEventListener('change', render);
  kindInputs.forEach((box) => box.addEventListener('change', render));
  clear.addEventListener('click', () => {
    input.value = '';
    period.value = '';
    sort.value = 'relevance';
    kindInputs.forEach((box) => { box.checked = false; });
    render();
    input.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== input) {
      event.preventDefault();
      input.focus();
    }
  });
}
