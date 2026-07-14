import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, images, books, concepts, routes, allItems, itemBySlug } from './data/content.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'docs');
const BUILD_DATE = new Date().toISOString().slice(0, 10);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const strip = (value = '') => String(value).replace(/<[^>]+>/g, '').trim();

function write(relativePath, content) {
  const target = path.join(OUT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function copy(relativePath) {
  const from = path.join(ROOT, relativePath);
  const to = path.join(OUT, relativePath.replace(/^src\//, 'assets/').replace(/^assets\//, 'assets/'));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function absolute(url) {
  return url.startsWith('http') ? url : `${SITE.url}${url}`;
}

function jsonLd(value) {
  return `<script type="application/ld+json">${JSON.stringify(value).replaceAll('<', '\\u003c')}</script>`;
}

function breadcrumbs(items) {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`
    }))
  });
}

function header() {
  return `<header class="site-header">
    <a class="brand" href="/" aria-label="Atlas do Ensino — página inicial">
      <span class="brand-mark" aria-hidden="true">A</span>
      <span><strong>Atlas do Ensino</strong><small>imagens, livros e ideias</small></span>
    </a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="main-nav">Menu</button>
    <nav id="main-nav" class="main-nav" aria-label="Navegação principal">
      <a href="/explorar/">Explorar</a>
      <a href="/buscar/">Buscar</a>
      <a href="/percursos/">Percursos</a>
      <a href="/sobre/">Sobre</a>
    </nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div><a class="footer-brand" href="/">Atlas do Ensino</a><p>Um projeto editorial independente sobre a história e a pesquisa do ensino.</p></div>
    <div><p><strong>Criação e curadoria</strong></p><p><a href="${SITE.creatorUrl}">${SITE.creator}</a></p></div>
    <div><p><strong>Navegação</strong></p><p><a href="/sobre/">Sobre e critérios</a><br><a href="/fontes-e-direitos/">Fontes e direitos</a><br><a href="https://professorrafael.com.br/">Site do criador ↗</a></p></div>
  </footer>`;
}

function page({ title, description, pathName, content, schema = '', bodyClass = '' }) {
  const canonical = `${SITE.url}${pathName}`;
  const fullTitle = title === SITE.name ? title : `${title} | ${SITE.name}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#17221f">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="${SITE.name}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE.url}/assets/og-atlas.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css">
  ${schema}
</head>
<body class="${esc(bodyClass)}">
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  ${header()}
  <main id="conteudo">${content}</main>
  ${footer()}
  <script src="/assets/app.js" defer></script>
</body>
</html>`;
}

function kindLabel(kind) {
  return ({ imagem: 'Imagem', livro: 'Livro', conceito: 'Conceito' })[kind] || kind;
}

function itemPath(item) {
  const base = ({ imagem: 'imagens', livro: 'livros', conceito: 'conceitos' })[item.kind];
  return `/${base}/${item.slug}/`;
}

function topicLinks(topics = []) {
  return topics.map((topic) => `<a class="tag" href="/buscar/?tema=${encodeURIComponent(topic)}">${esc(topic)}</a>`).join('');
}

function card(item, options = {}) {
  const imageBlock = item.kind === 'imagem'
    ? `<div class="card-media"><img src="${item.image}" alt="" loading="lazy" width="720" height="520"></div>`
    : item.kind === 'livro'
      ? `<div class="book-cover" aria-hidden="true"><span>${esc(item.creator.split(',')[0])}</span><strong>${esc(item.shortTitle || item.title)}</strong><small>${esc(String(item.year))}</small></div>`
      : `<div class="concept-glyph" aria-hidden="true">${esc(item.title.slice(0, 1))}</div>`;
  return `<article class="item-card ${esc(item.kind)}" data-kind="${esc(item.kind)}" data-year="${esc(item.year || '')}" data-topics="${esc((item.topics || []).join('|'))}">
    <a class="card-link" href="${itemPath(item)}" aria-label="Abrir ${esc(item.title)}">${imageBlock}</a>
    <div class="card-copy">
      <p class="eyebrow">${kindLabel(item.kind)}${item.date ? ` · ${esc(item.date)}` : ''}</p>
      <h3><a href="${itemPath(item)}">${esc(item.title)}</a></h3>
      ${item.creator ? `<p class="byline">${esc(item.creator)}</p>` : ''}
      <p>${esc(item.excerpt)}</p>
      ${options.showTopics === false ? '' : `<div class="tags">${topicLinks((item.topics || []).slice(0, 3))}</div>`}
    </div>
  </article>`;
}

function homePage() {
  const featured = [images[4], books[0], images[7], books[11], images[8], concepts[2]];
  const siteSchema = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    alternateName: 'Atlas do Ensino — imagens, livros e ideias',
    url: `${SITE.url}/`,
    inLanguage: 'pt-BR',
    description: SITE.description,
    creator: { '@type': 'Person', name: SITE.creator, url: SITE.creatorUrl }
  });
  return page({
    title: SITE.name,
    description: SITE.description,
    pathName: '/',
    schema: siteSchema,
    bodyClass: 'home',
    content: `<section class="hero">
      <div class="hero-copy"><p class="eyebrow light">Acervo editorial aberto</p><h1>Imagens, livros e ideias para compreender <em>o ensino</em>.</h1><p class="hero-lead">Um atlas em construção sobre a história da sala de aula, os métodos de ensinar e a pesquisa que procura compreendê-los.</p>
        <form class="hero-search" action="/buscar/" method="get"><label class="sr-only" for="home-search">Buscar no Atlas</label><input id="home-search" name="q" type="search" placeholder="Busque uma obra, pessoa, método ou questão"><button type="submit">Buscar</button></form>
      </div>
      <a class="hero-image" href="/imagens/calculo-mental-bogdanov-belsky/"><img src="/assets/images/bogdanov-belsky-calculo-mental-1895.webp" alt="Alunos resolvem um problema de cálculo mental em uma escola russa, em pintura de 1895."><span><strong>Observe a atenção</strong><small>Cálculo mental, 1895</small></span></a>
    </section>
    <section class="entry-choices wrap"><a href="/explorar/"><span>01</span><strong>Explorar o acervo</strong><small>Navegue por imagens, livros, períodos e temas.</small></a><a href="/buscar/"><span>02</span><strong>Buscar diretamente</strong><small>Encontre autores, obras, conceitos e questões.</small></a><a href="/percursos/"><span>03</span><strong>Seguir um percurso</strong><small>Conecte objetos por uma narrativa histórica.</small></a></section>
    <section class="wrap section"><div class="section-heading"><div><p class="eyebrow">Em destaque</p><h2>Uma coleção feita de relações</h2></div><p>O Atlas aproxima materiais de naturezas diferentes. Cada item abre caminhos para outros tempos, conceitos e problemas.</p></div><div class="card-grid featured-grid">${featured.map((item) => card(item)).join('')}</div><p class="center-action"><a class="button" href="/explorar/">Ver todo o acervo</a></p></section>
    <section class="dark-band"><div class="wrap"><div class="section-heading inverse"><div><p class="eyebrow light">Percursos</p><h2>Histórias que atravessam o acervo</h2></div><p>Não há uma única linha evolutiva do ensino. Os percursos reúnem objetos para formular problemas e comparar soluções.</p></div><div class="route-grid">${routes.map((route, i) => `<a class="route-card" href="/percursos/${route.slug}/"><span>0${i + 1}</span><p>${esc(route.kicker)}</p><h3>${esc(route.title)}</h3><small>${esc(route.excerpt)}</small></a>`).join('')}</div></div></section>
    <section class="manifesto wrap section"><p class="eyebrow">Princípio editorial</p><blockquote>O ensino não é uma coleção de dicas. É uma prática, uma história e um campo de investigação.</blockquote><p>O Atlas reúne fontes primárias, imagens, livros e verbetes para tornar esse campo mais visível — com indicação de autoria, origem, direitos e limites de cada material.</p><a href="/sobre/">Conheça o projeto e seus critérios →</a></section>`
  });
}

function explorePage() {
  return page({
    title: 'Explorar o acervo',
    description: 'Explore imagens, livros e conceitos do Atlas do Ensino por tipo, período e tema.',
    pathName: '/explorar/',
    schema: breadcrumbs([{ name: 'Início', path: '/' }, { name: 'Explorar', path: '/explorar/' }]),
    content: `<section class="page-hero wrap"><p class="eyebrow">Acervo</p><h1>Explore o ensino por diferentes entradas.</h1><p>Uma mesma obra pode participar de várias histórias. Comece por um tipo de material ou use a busca para cruzar períodos, autores e temas.</p></section>
    <section class="facet-strip wrap"><a href="#imagens"><strong>${images.length}</strong><span>imagens</span></a><a href="#livros"><strong>${books.length}</strong><span>livros</span></a><a href="#conceitos"><strong>${concepts.length}</strong><span>conceitos</span></a><a href="/percursos/"><strong>${routes.length}</strong><span>percursos</span></a></section>
    <section id="imagens" class="wrap section"><div class="section-heading"><div><p class="eyebrow">Coleção visual</p><h2>Imagens</h2></div><p>Pinturas, gravuras e fotografias com fonte e situação de uso registradas.</p></div><div class="card-grid image-grid">${images.map((item) => card(item)).join('')}</div></section>
    <section id="livros" class="soft-band"><div class="wrap section"><div class="section-heading"><div><p class="eyebrow">Biblioteca histórica</p><h2>Livros e documentos</h2></div><p>Obras que ajudaram a formular, organizar e discutir o ensino em diferentes períodos.</p></div><div class="card-grid book-grid">${books.map((item) => card(item)).join('')}</div></div></section>
    <section id="conceitos" class="wrap section"><div class="section-heading"><div><p class="eyebrow">Vocabulário</p><h2>Conceitos</h2></div><p>Verbetes iniciais para orientar a navegação e tornar diferenças históricas mais explícitas.</p></div><div class="card-grid concept-grid">${concepts.map((item) => card(item)).join('')}</div></section>`
  });
}

function searchPage() {
  return page({
    title: 'Buscar',
    description: 'Busque imagens, livros e conceitos no Atlas do Ensino.',
    pathName: '/buscar/',
    schema: breadcrumbs([{ name: 'Início', path: '/' }, { name: 'Buscar', path: '/buscar/' }]),
    bodyClass: 'search-page',
    content: `<section class="search-hero"><div class="wrap"><p class="eyebrow light">Busca no acervo</p><h1>O que você quer investigar?</h1><label class="search-box"><span class="sr-only">Termo de busca</span><input id="atlas-search" type="search" autocomplete="off" placeholder="Digite um autor, obra, conceito ou tema"><kbd>/</kbd></label></div></section>
    <section class="wrap search-workspace" data-search-app>
      <aside class="filters" aria-label="Filtros da busca"><h2>Filtrar</h2><fieldset><legend>Tipo</legend><label><input type="checkbox" name="kind" value="imagem"> Imagens</label><label><input type="checkbox" name="kind" value="livro"> Livros</label><label><input type="checkbox" name="kind" value="conceito"> Conceitos</label></fieldset><fieldset><legend>Período</legend><select id="period-filter"><option value="">Todos os períodos</option>${[...new Set(allItems.map((item) => item.period).filter(Boolean))].map((period) => `<option>${esc(period)}</option>`).join('')}</select></fieldset><button class="text-button" id="clear-filters" type="button">Limpar filtros</button></aside>
      <div class="results"><div class="results-head"><p id="result-count" aria-live="polite">Carregando acervo…</p><select id="sort-results" aria-label="Ordenar resultados"><option value="relevance">Mais relevantes</option><option value="oldest">Mais antigos</option><option value="newest">Mais recentes</option><option value="title">Título, A–Z</option></select></div><div id="search-results" class="search-results"></div><div id="empty-results" class="empty-results" hidden><h2>Nenhum resultado</h2><p>Tente um termo mais amplo ou remova algum filtro.</p></div></div>
    </section>`
  });
}

function routesIndexPage() {
  return page({
    title: 'Percursos',
    description: 'Percursos curatoriais para explorar a história do ensino por problemas e relações.',
    pathName: '/percursos/',
    schema: breadcrumbs([{ name: 'Início', path: '/' }, { name: 'Percursos', path: '/percursos/' }]),
    content: `<section class="page-hero wrap"><p class="eyebrow">Percursos curatoriais</p><h1>Histórias para atravessar o acervo.</h1><p>Cada percurso aproxima imagens, livros e conceitos. Eles são interpretações abertas: pontos de partida para pesquisa, não linhas evolutivas fechadas.</p></section><section class="wrap section"><div class="route-list">${routes.map((route, i) => `<a href="/percursos/${route.slug}/"><span>0${i + 1}</span><div><p class="eyebrow">${esc(route.kicker)}</p><h2>${esc(route.title)}</h2><p>${esc(route.excerpt)}</p></div><b aria-hidden="true">→</b></a>`).join('')}</div></section>`
  });
}

function routePage(route) {
  const items = route.itemSlugs.map((slug) => itemBySlug.get(slug)).filter(Boolean);
  return page({
    title: route.title,
    description: route.excerpt,
    pathName: `/percursos/${route.slug}/`,
    schema: breadcrumbs([{ name: 'Início', path: '/' }, { name: 'Percursos', path: '/percursos/' }, { name: route.title, path: `/percursos/${route.slug}/` }]),
    bodyClass: 'route-page',
    content: `<section class="route-hero"><div class="wrap narrow"><p class="eyebrow light">${esc(route.kicker)}</p><h1>${esc(route.title)}</h1><p>${esc(route.intro)}</p></div></section><section class="wrap narrow route-sequence"><div class="route-line" aria-hidden="true"></div>${items.map((item, index) => `<div class="route-stop"><span class="stop-number">${String(index + 1).padStart(2, '0')}</span>${card(item, { showTopics: false })}</div>`).join('')}</section><nav class="route-next wrap" aria-label="Outros percursos"><p class="eyebrow">Continue explorando</p>${routes.filter((r) => r.slug !== route.slug).slice(0, 2).map((r) => `<a href="/percursos/${r.slug}/">${esc(r.title)} →</a>`).join('')}</nav>`
  });
}

function itemPage(item) {
  const baseName = ({ imagem: 'Imagens', livro: 'Livros', conceito: 'Conceitos' })[item.kind];
  const basePath = ({ imagem: '/explorar/#imagens', livro: '/explorar/#livros', conceito: '/explorar/#conceitos' })[item.kind];
  const related = allItems.filter((candidate) => candidate.slug !== item.slug && (candidate.topics || []).some((topic) => (item.topics || []).includes(topic))).slice(0, 3);
  const media = item.kind === 'imagem'
    ? `<figure class="object-image"><img src="${item.image}" alt="${esc(item.alt)}"><figcaption>${esc(item.title)}. ${esc(item.creator)}${item.date ? `, ${esc(item.date)}` : ''}. <a href="${item.sourceUrl}">Fonte da imagem ↗</a></figcaption></figure>`
    : item.kind === 'livro'
      ? `<div class="object-book"><div class="book-cover large" aria-hidden="true"><span>${esc(item.creator)}</span><strong>${esc(item.shortTitle || item.title)}</strong><small>${esc(String(item.year))}</small></div></div>`
      : `<div class="object-concept" aria-hidden="true"><span>${esc(item.title.slice(0, 1))}</span></div>`;
  const metadata = [
    item.creator && ['Autoria', item.creator],
    item.date && ['Data', item.date],
    item.place && ['Lugar', item.place],
    item.institution && ['Acervo', item.institution],
    item.language && ['Idioma', item.language],
    item.rights && ['Direitos', item.rights]
  ].filter(Boolean);
  const schemaType = item.kind === 'imagem' ? 'VisualArtwork' : item.kind === 'livro' ? 'Book' : 'DefinedTerm';
  const itemSchema = jsonLd({
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: item.title,
    description: item.excerpt,
    url: `${SITE.url}${itemPath(item)}`,
    inLanguage: item.language || 'pt-BR',
    ...(item.creator ? { creator: { '@type': 'Person', name: item.creator } } : {}),
    ...(item.year ? { dateCreated: String(item.year) } : {}),
    ...(item.kind === 'imagem' ? { image: absolute(item.image), license: item.licenseUrl, creditText: item.rights } : {}),
    ...(item.sourceUrl ? { sameAs: item.sourceUrl } : {})
  });
  return page({
    title: item.title,
    description: item.excerpt,
    pathName: itemPath(item),
    schema: `${itemSchema}${breadcrumbs([{ name: 'Início', path: '/' }, { name: baseName, path: basePath }, { name: item.title, path: itemPath(item) }])}`,
    bodyClass: `object-page ${item.kind}-page`,
    content: `<article><header class="object-header wrap"><div><p class="eyebrow">${kindLabel(item.kind)} · ${esc(item.period || '')}</p><h1>${esc(item.title)}</h1>${item.originalTitle ? `<p class="original-title">${esc(item.originalTitle)}</p>` : ''}<p class="object-deck">${esc(item.excerpt)}</p><div class="tags">${topicLinks(item.topics || [])}</div></div></header><div class="object-layout wrap">${media}<div class="object-details"><section><p class="eyebrow">Por que está no Atlas</p><p class="commentary">${esc(item.commentary)}</p></section>${metadata.length ? `<dl>${metadata.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>` : ''}${item.sourceUrl ? `<p><a class="button" href="${item.sourceUrl}">${esc(item.sourceLabel || 'Ver fonte original')} ↗</a></p>` : ''}${item.licenseUrl && item.licenseUrl !== item.sourceUrl ? `<p class="fine"><a href="${item.licenseUrl}">Consultar licença e condições de uso ↗</a></p>` : ''}</div></div></article>${related.length ? `<section class="related soft-band"><div class="wrap section"><div class="section-heading"><div><p class="eyebrow">Relações</p><h2>Continue a investigação</h2></div></div><div class="card-grid related-grid">${related.map((candidate) => card(candidate)).join('')}</div></div></section>` : ''}`
  });
}

function aboutPage() {
  return page({
    title: 'Sobre o Atlas',
    description: 'Conheça a proposta, a autoria e os critérios editoriais do Atlas do Ensino.',
    pathName: '/sobre/',
    schema: breadcrumbs([{ name: 'Início', path: '/' }, { name: 'Sobre', path: '/sobre/' }]),
    content: `<section class="page-hero wrap"><p class="eyebrow">Sobre o projeto</p><h1>O ensino é maior do que costuma parecer.</h1><p>O Atlas do Ensino é um projeto editorial independente criado e curado por <a href="${SITE.creatorUrl}">Rafael Rodrigues da Silva</a>, professor e pesquisador.</p></section><article class="prose wrap narrow"><h2>O que o Atlas procura fazer</h2><p>Reunir fontes visuais, livros, documentos, conceitos e pesquisas que ajudem a compreender o ensino como prática, história e campo de investigação. O projeto não pretende formar uma enciclopédia neutra ou completa. Ele explicita seleções, relações e perguntas curatoriais.</p><h2>Como o acervo é organizado</h2><p>Os itens podem ser encontrados por busca, explorados por tipo e conectados em percursos. Uma imagem não aparece apenas como ilustração: recebe fonte, autoria, data, situação de direitos e um comentário sobre o problema educacional que permite formular.</p><h2>O que não é publicado automaticamente</h2><p>Rascunhos, anotações pessoais e materiais de cursos servem como arquivo de trabalho, mas não entram no Atlas sem revisão. Datas, atribuições, traduções e afirmações históricas precisam ser verificadas antes da publicação.</p><h2>Um projeto em construção</h2><p>A primeira versão apresenta um núcleo pequeno e juridicamente mais seguro. Novos itens serão acrescentados à medida que fontes, metadados e condições de uso forem confirmados.</p><p><a class="button" href="/fontes-e-direitos/">Ver critérios de fontes e direitos</a></p></article>`
  });
}

function rightsPage() {
  return page({
    title: 'Fontes e direitos',
    description: 'Critérios de procedência, atribuição e direitos autorais do Atlas do Ensino.',
    pathName: '/fontes-e-direitos/',
    schema: breadcrumbs([{ name: 'Início', path: '/' }, { name: 'Fontes e direitos', path: '/fontes-e-direitos/' }]),
    content: `<section class="page-hero wrap"><p class="eyebrow">Transparência</p><h1>Fontes e direitos</h1><p>O Atlas procura tornar a procedência de cada item tão visível quanto seu conteúdo.</p></section><article class="prose wrap narrow"><h2>Imagens</h2><p>São publicadas apenas reproduções com fonte identificável e indicação de domínio público, licença aberta ou autorização pertinente. A antiguidade de uma obra não torna automaticamente livre qualquer fotografia ou reprodução encontrada na internet.</p><h2>Livros e documentos</h2><p>O fato de o texto original estar em domínio público não elimina possíveis direitos sobre tradução, edição, notas ou digitalização. Por isso, o Atlas prioriza links para instituições de memória e registra a edição efetivamente consultada.</p><h2>Comentários curatoriais</h2><p>Os textos do Atlas são interpretações editoriais. Quando uma identificação ou data ainda é incerta, isso deve ser indicado. Correções documentadas podem ser enviadas para <a href="mailto:rafaelsilva.pr@gmail.com">rafaelsilva.pr@gmail.com</a>.</p><h2>Atribuição</h2><p>Cada página visual contém link para a fonte e para a licença quando aplicável. O uso de uma imagem no Atlas não altera os direitos ou as condições definidos pela instituição de origem.</p></article>`
  });
}

function notFoundPage() {
  return page({
    title: 'Página não encontrada', description: 'O endereço informado não existe no Atlas do Ensino.', pathName: '/404.html',
    content: `<section class="not-found wrap narrow"><p class="eyebrow">Erro 404</p><h1>Esta página não foi encontrada.</h1><p>Você pode buscar uma obra, explorar o acervo ou seguir um dos percursos curatoriais.</p><p><a class="button" href="/buscar/">Buscar no Atlas</a> <a class="text-link" href="/">Voltar ao início</a></p></section>`
  });
}

write('index.html', homePage());
write('explorar/index.html', explorePage());
write('buscar/index.html', searchPage());
write('percursos/index.html', routesIndexPage());
for (const route of routes) write(`percursos/${route.slug}/index.html`, routePage(route));
for (const item of allItems) write(itemPath(item).slice(1) + 'index.html', itemPage(item));
write('sobre/index.html', aboutPage());
write('fontes-e-direitos/index.html', rightsPage());
write('404.html', notFoundPage());

copy('src/styles.css');
copy('src/app.js');
fs.mkdirSync(path.join(OUT, 'assets/images'), { recursive: true });
for (const image of images) {
  const filename = path.basename(image.image);
  fs.copyFileSync(path.join(ROOT, 'assets/images', filename), path.join(OUT, 'assets/images', filename));
}

const searchIndex = allItems.map((item) => ({
  slug: item.slug,
  kind: item.kind,
  label: kindLabel(item.kind),
  title: item.title,
  creator: item.creator || '',
  date: item.date || '',
  year: item.year || null,
  period: item.period || '',
  topics: item.topics || [],
  excerpt: item.excerpt,
  url: itemPath(item),
  image: item.image || '',
  searchText: strip([item.title, item.originalTitle, item.creator, item.date, item.period, ...(item.topics || []), item.excerpt, item.commentary].filter(Boolean).join(' '))
}));
write('assets/search-index.json', JSON.stringify(searchIndex));

write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#17221f"/><path d="M17 48 29 15h7l12 33h-8l-2.5-8H26L23.5 48zm11-15h7.4L31.7 21z" fill="#f0a15b"/></svg>`);
write('assets/og-atlas.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#17221f"/><circle cx="1000" cy="110" r="240" fill="#b95736" opacity=".8"/><path d="M0 505c210-95 383-100 570-28s395 55 630-66v219H0z" fill="#e9e2d4"/><text x="90" y="245" fill="#f4efe4" font-family="Georgia,serif" font-size="112">Atlas do Ensino</text><text x="96" y="318" fill="#d6d0c4" font-family="Arial,sans-serif" font-size="34">imagens, livros e ideias</text></svg>`);
write('CNAME', 'atlas.professorrafael.com.br\n');
write('.nojekyll', '');
write('robots.txt', `User-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
write('llms.txt', `# Atlas do Ensino\n\n${SITE.description}\n\n## Seções\n- [Explorar o acervo](${SITE.url}/explorar/)\n- [Buscar](${SITE.url}/buscar/)\n- [Percursos curatoriais](${SITE.url}/percursos/)\n- [Sobre e critérios editoriais](${SITE.url}/sobre/)\n- [Fontes e direitos](${SITE.url}/fontes-e-direitos/)\n\n## Autoria\nProjeto editorial independente criado e curado por Rafael Rodrigues da Silva.\n- [Página do criador](${SITE.creatorUrl})\n`);

const paths = ['/', '/explorar/', '/buscar/', '/percursos/', '/sobre/', '/fontes-e-direitos/', ...routes.map((route) => `/percursos/${route.slug}/`), ...allItems.map(itemPath)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${SITE.url}${p}</loc><lastmod>${BUILD_DATE}</lastmod></url>`).join('\n')}\n</urlset>\n`);

console.log(`Atlas construído: ${paths.length} páginas indexáveis, ${allItems.length} itens.`);
