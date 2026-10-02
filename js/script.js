'use strict'

/* ============================================================================
 * Studies browser
 *
 * HTML contract (everything below is OPTIONAL; missing pieces are skipped):
 *   #studiesContainer           where cards render
 *   #resultsCount               "N studies found" text
 *   #filterSection              collapsible filter panel
 *   Filter controls (any subset): #search #methodFilter #minAge #maxAge
 *     #sexFilter #openAccessFilter #healthStatusFilter #treadmillFocusFilter
 *     #treadmillBrandCheckboxes (container the script fills with checkboxes)
 *   #sortBy                     sort selector (defaults to date-desc if absent)
 *   #studyCardTpl               a <template> overriding the built-in card markup
 *   data-action="toggle-filters" | "reset-filters"   on buttons (alternative
 *     to inline onclick="toggleFilters()" / onclick="resetFilters()";
 *     use one style or the other, not both)
 *
 * Progressive enhancement:
 *   - The script adds class "js" to <html> only if the browser supports what
 *     it needs, so CSS can hide no-JS fallback content with  html.js .no-js{...}
 *   - If the browser lacks support, nothing is touched and whatever static
 *     HTML / <noscript> content you shipped remains.
 * ========================================================================== */

let studiesData = []
let filteredStudies = []
let studyById = new Map()
let citedByIndex = new Map()
let ready = false
let cardTemplate = null

const DEFAULT_SORT = 'date-desc'

// Fields whose text may contain simple inline markup (e.g. SmO<sub>2</sub>).
// Everything else is inserted as plain text. Add field names here if your
// JSON stores HTML entities (e.g. &amp;) in other fields such as 'journal'.
const RICH_FIELDS = new Set(['title', 'keyFindings', 'abstract'])
const RICH_TAGS = new Set(['B', 'I', 'EM', 'STRONG', 'SUB', 'SUP', 'SMALL', 'BR'])

// ---------------------------------------------------------------------------
// Small DOM helpers (all tolerate missing elements)
// ---------------------------------------------------------------------------

const $ = id => document.getElementById(id)

// A missing control reads as '' which every filter treats as "no constraint".
function getValue (id, fallback = '') {
  return $(id)?.value ?? fallback
}

function setValue (id, value) {
  const el = $(id)
  if (el) el.value = value
}

function populateSelect (id, values) {
  const select = $(id)
  if (!select) return
  for (const value of values) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = value
    select.appendChild(option)
  }
}

function addClasses (el, classString) {
  // classList.add throws on tokens containing whitespace, so split first.
  el.classList.add(...String(classString).split(/\s+/).filter(Boolean))
}

function toInt (value) {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

function domReady () {
  return new Promise(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true })
    } else {
      resolve()
    }
  })
}

function showMessage (text) {
  const container = $('studiesContainer')
  if (!container) return
  const div = document.createElement('div')
  div.className = 'no-results'
  div.textContent = text
  container.replaceChildren(div)
}

// ---------------------------------------------------------------------------
// Safe rich text: parse into an inert <template>, keep only an allowlist of
// inline tags (no attributes), drop script/style, unwrap everything else.
// ---------------------------------------------------------------------------

function sanitizeNode (root) {
  for (const node of [...root.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) continue
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove() // comments, etc.
      continue
    }
    const tag = node.tagName
    if (tag === 'SCRIPT' || tag === 'STYLE') {
      node.remove()
      continue
    }
    sanitizeNode(node)
    if (RICH_TAGS.has(tag)) {
      for (const attr of [...node.attributes]) node.removeAttribute(attr.name)
    } else {
      node.replaceWith(...node.childNodes) // unwrap, keep the text
    }
  }
}

function setRichText (el, html) {
  const tpl = document.createElement('template')
  tpl.innerHTML = String(html ?? '')
  sanitizeNode(tpl.content)
  el.replaceChildren(tpl.content)
}

// ---------------------------------------------------------------------------
// Filter registry
//   controls : ids of the HTML controls the filter owns (reset + delegation)
//   selector : extra CSS selector for controls without a fixed id
//   read()   : current value, or null when inactive / control missing
//   test(s,v): does study s satisfy value v?
//   populate : optional, builds options from the data
//   reset    : optional custom reset (defaults to clearing `controls`)
// ---------------------------------------------------------------------------

function selectFilter (id, test, options, { sorted = false } = {}) {
  return {
    controls: [id],
    read: () => getValue(id) || null,
    test,
    populate: options
      ? studies => {
          const values = new Set(
            studies.flatMap(s => options(s)).filter(v => v != null && v !== '')
          )
          populateSelect(id, sorted ? [...values].sort() : values)
        }
      : undefined
  }
}

const BRAND_SELECTOR = '#treadmillBrandCheckboxes input'

const FILTERS = [
  {
    controls: ['search'],
    read: () => getValue('search').toLowerCase() || null,
    test: (s, term) =>
      s.title.toLowerCase().includes(term) ||
      s.authors.some(a => a.toLowerCase().includes(term)) ||
      (s.keywords ?? []).some(k => k.toLowerCase().includes(term))
  },
  selectFilter('methodFilter', (s, v) => s.methods.includes(v), s => s.methods),
  {
    controls: ['minAge', 'maxAge'],
    read: () => {
      const min = toInt(getValue('minAge'))
      const max = toInt(getValue('maxAge'))
      return min === null && max === null ? null : { min, max }
    },
    test: (s, { min, max }) =>
      (max === null || s.population.ageLower <= max) &&
      (min === null || s.population.ageUpper >= min)
  },
  selectFilter('sexFilter', (s, v) => s.population.sex === v, s => [s.population.sex], { sorted: true }),
  {
    controls: [],
    selector: BRAND_SELECTOR,
    read: () => {
      const brands = [...document.querySelectorAll(`${BRAND_SELECTOR}:checked`)].map(cb => cb.value)
      return brands.length ? brands : null
    },
    test: (s, brands) => Boolean(s.treadmill) && brands.includes(s.treadmill.brand),
    reset: () => document.querySelectorAll(BRAND_SELECTOR).forEach(cb => { cb.checked = false }),
    populate: studies => {
      const container = $('treadmillBrandCheckboxes')
      if (!container) return
      const brands = [...new Set(studies.map(s => s.treadmill?.brand).filter(Boolean))].sort()
      const frag = document.createDocumentFragment()
      brands.forEach(brand => {
        const div = document.createElement('div')
        div.className = 'checkbox-item'

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.id = `brand-${brand}`
        checkbox.value = brand

        const label = document.createElement('label')
        label.htmlFor = checkbox.id
        label.textContent = brand

        div.append(checkbox, label)
        frag.appendChild(div)
      })
      container.appendChild(frag)
    }
  },
  selectFilter(
    'openAccessFilter',
    (s, v) => (v === 'yes' && s.openAccess === true) || (v === 'no' && s.openAccess === false)
  ),
  selectFilter('healthStatusFilter', (s, v) => s.population.healthStatus === v, s => [s.population.healthStatus], { sorted: true }),
  selectFilter('treadmillFocusFilter', (s, v) => s.treadmillFocus === v) // options live in the HTML
]

const SORTERS = {
  'date-desc': (a, b) => b.year - a.year,
  'date-asc': (a, b) => a.year - b.year,
  title: (a, b) => a.title.localeCompare(b.title),
  author: (a, b) => lastName(a.authors?.[0]).localeCompare(lastName(b.authors?.[0]))
}

// Selector matching every control that should trigger re-filtering.
const CONTROL_SELECTOR = [
  ...FILTERS.flatMap(f => f.controls.map(id => `#${id}`)),
  ...FILTERS.filter(f => f.selector).map(f => f.selector),
  '#sortBy'
].join(',')

// ---------------------------------------------------------------------------
// Data indexing and filtering
// ---------------------------------------------------------------------------

function lastName (author) {
  return String(author ?? '').split(',')[0].trim()
}

const getStudy = id => studyById.get(String(id))

function indexStudies () {
  studyById = new Map(studiesData.map(s => [String(s.id), s]))
  citedByIndex = new Map()
  studiesData.forEach(s => {
    new Set(s.citations ?? []).forEach(id => {
      const key = String(id)
      if (!citedByIndex.has(key)) citedByIndex.set(key, [])
      citedByIndex.get(key).push(s)
    })
  })
}

function filterAndSortStudies () {
  if (!ready) return

  const active = FILTERS
    .map(filter => ({ filter, value: filter.read() }))
    .filter(({ value }) => value !== null)

  filteredStudies = studiesData.filter(study =>
    active.every(({ filter, value }) => filter.test(study, value))
  )

  const sorter = SORTERS[getValue('sortBy', DEFAULT_SORT)]
  if (sorter) filteredStudies.sort(sorter)

  displayStudies()
}

function formatCitation (studyId) {
  const study = getStudy(studyId)
  if (!study) return ''

  const { authors, year } = study
  if (authors.length === 1) return `${lastName(authors[0])} (${year})`
  if (authors.length === 2) return `${lastName(authors[0])} & ${lastName(authors[1])} (${year})`
  return `${lastName(authors[0])} et al. (${year})`
}

// ---------------------------------------------------------------------------
// Rendering (template cloning + textContent; no HTML string concatenation)
// ---------------------------------------------------------------------------

const DEFAULT_CARD_HTML = `
<div class="study-card">
  <div class="treadmill-focus-badge" data-field="focusBadge"></div>
  <div class="study-id">ID: <span data-field="id"></span></div>
  <div class="study-title" data-field="title"></div>
  <div class="study-authors" data-field="authors"></div>
  <div class="study-meta">
    <span><strong>Year:</strong> <span data-field="year"></span></span>
    <span><strong>Journal:</strong> <span data-field="journal"></span></span>
    <span><strong>Sample Size:</strong> <span data-field="sampleSize"></span></span>
    <span data-section="treadmill"><strong>Treadmill:</strong> <span data-field="treadmill"></span></span>
    <span data-section="doi"><strong>DOI:</strong> <a data-field="doi" target="_blank" rel="noopener noreferrer"></a></span>
  </div>
  <div><strong>Key Findings:</strong> <span data-field="keyFindings"></span></div>
  <button type="button" class="abstract-toggle" data-action="toggle-abstract">Show Abstract</button>
  <div class="abstract-content" data-field="abstract"></div>
  <div class="citations" data-section="cites"></div>
  <div class="citations" data-section="citedBy"></div>
  <div class="tags" data-field="tags"></div>
  <div class="keywords" data-section="keywords"><strong>Keywords:</strong> <span data-field="keywords"></span></div>
</div>`

function getCardTemplate () {
  if (!cardTemplate) {
    const custom = $('studyCardTpl')
    if (custom instanceof HTMLTemplateElement) {
      cardTemplate = custom
    } else {
      cardTemplate = document.createElement('template')
      cardTemplate.innerHTML = DEFAULT_CARD_HTML.trim()
    }
  }
  return cardTemplate
}

function setField (root, name, value) {
  const el = root.querySelector(`[data-field="${name}"]`)
  if (!el) return null
  if (RICH_FIELDS.has(name)) setRichText(el, value)
  else el.textContent = value ?? ''
  return el
}

const removeSection = (root, name) =>
  root.querySelector(`[data-section="${name}"]`)?.remove()

function makeTag (text, className) {
  const span = document.createElement('span')
  span.className = `tag ${className}`
  span.textContent = text
  return span
}

function makeCitationLink (id) {
  const span = document.createElement('span')
  span.className = 'citation-link'
  span.dataset.action = 'filter-by-citation'
  span.dataset.studyId = id
  span.textContent = formatCitation(id)
  return span
}

function fillCitations (section, label, ids) {
  if (!section) return
  const nodes = [`${label} `]
  ids.filter(getStudy).forEach((id, i) => {
    if (i > 0) nodes.push(', ')
    nodes.push(makeCitationLink(id))
  })
  if (nodes.length === 1) section.remove()
  else section.replaceChildren(...nodes)
}

function renderCard (study) {
  const card = getCardTemplate().content.firstElementChild.cloneNode(true)
  card.id = `study-${study.id}`

  const focus = study.treadmillFocus
  const badge = card.querySelector('[data-field="focusBadge"]')
  if (focus && focus.toLowerCase() !== 'unknown') {
    addClasses(card, focus.toLowerCase())
    if (badge) {
      addClasses(badge, focus.toLowerCase())
      badge.textContent = focus
    }
  } else {
    badge?.remove()
  }

  setField(card, 'id', study.id)
  setField(card, 'title', study.title)
  setField(card, 'authors', study.authors.join(', '))
  setField(card, 'year', study.year)
  setField(card, 'journal', study.journal)
  setField(card, 'sampleSize', study.sampleSize)
  setField(card, 'keyFindings', study.keyFindings)
  setField(card, 'abstract', study.abstract)

  if (study.treadmill) {
    setField(card, 'treadmill', [study.treadmill.brand, study.treadmill.model].filter(Boolean).join(' '))
  } else {
    removeSection(card, 'treadmill')
  }

  if (study.DOI) {
    const link = setField(card, 'doi', study.DOI)
    if (link) link.href = `https://doi.org/${encodeURI(study.DOI)}`
  } else {
    removeSection(card, 'doi')
  }

  fillCitations(card.querySelector('[data-section="cites"]'), 'Cites:', study.citations ?? [])
  fillCitations(
    card.querySelector('[data-section="citedBy"]'),
    'Cited by:',
    (citedByIndex.get(String(study.id)) ?? []).map(s => s.id)
  )

  const tags = card.querySelector('[data-field="tags"]')
  if (tags) {
    const { ageLower, ageUpper, sex, healthStatus } = study.population
    tags.append(
      makeTag(`Ages ${ageLower}-${ageUpper}`, 'population'),
      makeTag(sex, 'population'),
      makeTag(healthStatus, 'population'),
      ...study.methods.map(m => makeTag(m, 'method'))
    )
    if (study.openAccess) tags.append(makeTag('🔓 Open Access', 'open-access'))
  }

  if (study.keywords && study.keywords.length > 0) {
    setField(card, 'keywords', study.keywords.join(', '))
  } else {
    removeSection(card, 'keywords')
  }

  return card
}

function displayStudies () {
  const resultsCount = $('resultsCount')
  if (resultsCount) {
    resultsCount.textContent = `${filteredStudies.length} ${
      filteredStudies.length === 1 ? 'study' : 'studies'
    } found`
  }

  const container = $('studiesContainer')
  if (!container) return

  if (filteredStudies.length === 0) {
    showMessage('No studies match your filters')
    return
  }

  const frag = document.createDocumentFragment()
  filteredStudies.forEach(study => frag.appendChild(renderCard(study)))
  container.replaceChildren(frag)
}

// ---------------------------------------------------------------------------
// Actions (kept global so existing inline onclick="..." attributes still work)
// ---------------------------------------------------------------------------

function toggleFilters () {
  $('filterSection')?.classList.toggle('collapsed')
  document.querySelector('.filter-toggle')?.classList.toggle('collapsed')
}

function toggleAbstract (button) {
  const content = button.closest('.study-card')?.querySelector('.abstract-content')
  if (!content) return
  const showing = content.classList.toggle('show')
  button.textContent = showing ? 'Hide Abstract' : 'Show Abstract'
}

function clearFilterControls () {
  FILTERS.forEach(filter => {
    if (filter.reset) filter.reset()
    else filter.controls.forEach(id => setValue(id, ''))
  })
}

function filterByCitation (studyId) {
  clearFilterControls()

  const study = getStudy(studyId)
  filteredStudies = study ? [study] : []
  displayStudies()

  setTimeout(() => {
    $(`study-${studyId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
}

function resetFilters () {
  clearFilterControls()
  setValue('sortBy', DEFAULT_SORT)
  filterAndSortStudies()
}

const ACTIONS = {
  'toggle-filters': () => toggleFilters(),
  'reset-filters': () => resetFilters(),
  'toggle-abstract': el => toggleAbstract(el),
  'filter-by-citation': el => filterByCitation(el.dataset.studyId)
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

const SUPPORTED =
  typeof fetch === 'function' &&
  typeof Map === 'function' &&
  'content' in document.createElement('template') &&
  'replaceChildren' in Element.prototype

function loadStudies () {
  return fetch('studies/studies.json').then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  })
}

function init () {
  document.documentElement.classList.add('js')

  // Delegated listeners on `document`: controls may be added, removed, or
  // commented out of the HTML without any change here.
  document.addEventListener('input', event => {
    if (event.target.matches(CONTROL_SELECTOR)) filterAndSortStudies()
  })

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-action]')
    if (trigger) ACTIONS[trigger.dataset.action]?.(trigger)
  })

  Promise.all([loadStudies(), domReady()])
    .then(([data]) => {
      studiesData = data
      filteredStudies = [...studiesData]
      indexStudies()
      FILTERS.forEach(filter => filter.populate?.(studiesData))
      ready = true
      filterAndSortStudies()
    })
    .catch(error => {
      console.error('Error loading studies:', error)
      domReady().then(() =>
        showMessage('Error loading studies. Please make sure studies.json is in the same directory.')
      )
    })
}

if (SUPPORTED) init()