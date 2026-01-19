let studiesData = []
let filteredStudies = []

// Load data from JSON file
fetch('studies/studies.json')
  .then(response => response.json())
  .then(data => {
    studiesData = data
    filteredStudies = [...studiesData]
    populateFilters()
    filterAndSortStudies() // Changed from displayStudies() to apply sorting
  })
  .catch(error => {
    console.error('Error loading studies:', error)
    document.getElementById('studiesContainer').innerHTML =
      '<div class="no-results">Error loading studies. Please make sure studies.json is in the same directory.</div>'
  })

function toggleFilters () {
  const filterSection = document.getElementById('filterSection')
  const toggleButton = document.querySelector('.filter-toggle')
  filterSection.classList.toggle('collapsed')
  toggleButton.classList.toggle('collapsed')
}

function populateFilters () {
  const methods = new Set()
  const sexOptions = new Set()
  const healthStatuses = new Set()
  const treadmillBrands = new Set()

  studiesData.forEach(study => {
    study.methods.forEach(method => methods.add(method))
    sexOptions.add(study.population.sex)
    healthStatuses.add(study.population.healthStatus)
    if (study.treadmill) {
      treadmillBrands.add(study.treadmill.brand)
    }
  })

  const methodFilter = document.getElementById('methodFilter')
  methods.forEach(method => {
    const option = document.createElement('option')
    option.value = method
    option.textContent = method
    methodFilter.appendChild(option)
  })

  const sexFilter = document.getElementById('sexFilter')
  Array.from(sexOptions)
    .sort()
    .forEach(sex => {
      const option = document.createElement('option')
      option.value = sex
      option.textContent = sex
      sexFilter.appendChild(option)
    })

  const treadmillBrandCheckboxes = document.getElementById(
    'treadmillBrandCheckboxes'
  )
  Array.from(treadmillBrands)
    .sort()
    .forEach(brand => {
      const div = document.createElement('div')
      div.className = 'checkbox-item'

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.id = `brand-${brand}`
      checkbox.value = brand
      checkbox.addEventListener('change', filterAndSortStudies)

      const label = document.createElement('label')
      label.htmlFor = `brand-${brand}`
      label.textContent = brand

      div.appendChild(checkbox)
      div.appendChild(label)
      treadmillBrandCheckboxes.appendChild(div)
    })

  const healthStatusFilter = document.getElementById('healthStatusFilter')
  Array.from(healthStatuses)
    .sort()
    .forEach(status => {
      const option = document.createElement('option')
      option.value = status
      option.textContent = status
      healthStatusFilter.appendChild(option)
    })
}

function filterAndSortStudies () {
  const searchTerm = document.getElementById('search').value.toLowerCase()
  const methodFilter = document.getElementById('methodFilter').value
  const minAge = document.getElementById('minAge').value
  const maxAge = document.getElementById('maxAge').value
  const sexFilter = document.getElementById('sexFilter').value
  const openAccessFilter = document.getElementById('openAccessFilter').value
  const healthStatusFilter = document.getElementById('healthStatusFilter').value
  const treadmillFocusFilter = document.getElementById(
    'treadmillFocusFilter'
  ).value
  const sortBy = document.getElementById('sortBy').value

  // Get selected treadmill brands
  const selectedBrands = Array.from(
    document.querySelectorAll('#treadmillBrandCheckboxes input:checked')
  ).map(cb => cb.value)

  filteredStudies = studiesData.filter(study => {
    const matchesSearch =
      searchTerm === '' ||
      study.title.toLowerCase().includes(searchTerm) ||
      study.authors.some(author => author.toLowerCase().includes(searchTerm)) ||
      (study.keywords &&
        study.keywords.some(keyword =>
          keyword.toLowerCase().includes(searchTerm)
        ))

    const matchesMethod =
      methodFilter === '' || study.methods.includes(methodFilter)

    const matchesAge =
      (minAge === '' && maxAge === '') ||
      (minAge === '' && study.population.ageLower <= parseInt(maxAge)) ||
      (maxAge === '' && study.population.ageUpper >= parseInt(minAge)) ||
      (minAge !== '' &&
        maxAge !== '' &&
        study.population.ageLower <= parseInt(maxAge) &&
        study.population.ageUpper >= parseInt(minAge))

    const matchesSex = sexFilter === '' || study.population.sex === sexFilter

    const matchesTreadmill =
      selectedBrands.length === 0 ||
      (study.treadmill && selectedBrands.includes(study.treadmill.brand))

    const matchesOpenAccess =
      openAccessFilter === '' ||
      (openAccessFilter === 'yes' && study.openAccess === true) ||
      (openAccessFilter === 'no' && study.openAccess === false)

    const matchesHealthStatus =
      healthStatusFilter === '' ||
      study.population.healthStatus === healthStatusFilter

    const matchesTreadmillFocus =
      treadmillFocusFilter === '' ||
      (study.treadmillFocus && study.treadmillFocus === treadmillFocusFilter)

    return (
      matchesSearch &&
      matchesMethod &&
      matchesAge &&
      matchesSex &&
      matchesTreadmill &&
      matchesOpenAccess &&
      matchesHealthStatus &&
      matchesTreadmillFocus
    )
  })

  filteredStudies.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return b.year - a.year
      case 'date-asc':
        return a.year - b.year
      case 'title':
        return a.title.localeCompare(b.title)
      case 'author':
        const lastNameA = a.authors[0].split(',')[0].trim()
        const lastNameB = b.authors[0].split(',')[0].trim()
        return lastNameA.localeCompare(lastNameB)
      default:
        return 0
    }
  })

  displayStudies()
}

function formatCitation (studyId) {
  const study = studiesData.find(s => s.id === studyId)
  if (!study) return ''

  const authors = study.authors
  const year = study.year

  if (authors.length === 1) {
    const lastName = authors[0].split(',')[0]
    return `${lastName} (${year})`
  } else if (authors.length === 2) {
    const lastName1 = authors[0].split(',')[0]
    const lastName2 = authors[1].split(',')[0]
    return `${lastName1} & ${lastName2} (${year})`
  } else {
    const lastName = authors[0].split(',')[0]
    return `${lastName} et al. (${year})`
  }
}

function displayStudies () {
  const container = document.getElementById('studiesContainer')
  const resultsCount = document.getElementById('resultsCount')

  resultsCount.textContent = `${filteredStudies.length} ${
    filteredStudies.length === 1 ? 'study' : 'studies'
  } found`

  if (filteredStudies.length === 0) {
    container.innerHTML =
      '<div class="no-results">No studies match your filters</div>'
    return
  }

  container.innerHTML = filteredStudies
    .map(study => {
      const citedBy = studiesData.filter(s => s.citations.includes(study.id))
      const citedByText =
        citedBy.length > 0
          ? `Cited by: ${citedBy
              .map(
                s =>
                  `<span class="citation-link" onclick="filterByCitation('${
                    s.id
                  }')">${formatCitation(s.id)}</span>`
              )
              .join(', ')}`
          : ''

      const citesText =
        study.citations.length > 0
          ? `Cites: ${study.citations
              .map(
                id =>
                  `<span class="citation-link" onclick="filterByCitation('${id}')">${formatCitation(
                    id
                  )}</span>`
              )
              .filter(Boolean)
              .join(', ')}`
          : ''

      const doiLink = study.DOI
        ? `<span><strong>DOI:</strong> <a href="https://doi.org/${study.DOI}" target="_blank" rel="noopener noreferrer">${study.DOI}</a></span>`
        : ''

      const focusClass =
        study.treadmillFocus && study.treadmillFocus.toLowerCase() !== 'unknown'
          ? study.treadmillFocus.toLowerCase()
          : ''

      const focusBadge =
        study.treadmillFocus && study.treadmillFocus.toLowerCase() !== 'unknown'
          ? `<div class="treadmill-focus-badge ${study.treadmillFocus.toLowerCase()}">${
              study.treadmillFocus
            }</div>`
          : ''

      return `
                <div class="study-card ${focusClass}" id="study-${study.id}">
                    ${focusBadge}
                    <div class="study-id">ID: ${study.id}</div>
                    <div class="study-title">${study.title}</div>
                    <div class="study-authors">${study.authors.join(', ')}</div>
                    <div class="study-meta">
                        <span><strong>Year:</strong> ${study.year}</span>
                        <span><strong>Journal:</strong> ${study.journal}</span>
                        <span><strong>Sample Size:</strong> ${
                          study.sampleSize
                        }</span>
                        ${
                          study.treadmill
                            ? `<span><strong>Treadmill:</strong> ${study.treadmill.brand} ${study.treadmill.model}</span>`
                            : ''
                        }
                        ${doiLink}
                    </div>
                    <div><strong>Key Findings:</strong> ${
                      study.keyFindings
                    }</div>
                    <button class="abstract-toggle" onclick="toggleAbstract('${
                      study.id
                    }')">Show Abstract</button>
                    <div class="abstract-content" id="abstract-${study.id}">
                        ${study.abstract}
                    </div>
                    ${
                      citesText
                        ? `<div class="citations">${citesText}</div>`
                        : ''
                    }
                    ${
                      citedByText
                        ? `<div class="citations">${citedByText}</div>`
                        : ''
                    }
                    <div class="tags">
                        <span class="tag population">Ages ${
                          study.population.ageLower
                        }-${study.population.ageUpper}</span>
                        <span class="tag population">${
                          study.population.sex
                        }</span>
                        <span class="tag population">${
                          study.population.healthStatus
                        }</span>
                        ${study.methods
                          .map(
                            method =>
                              `<span class="tag method">${method}</span>`
                          )
                          .join('')}
                        ${
                          study.openAccess
                            ? '<span class="tag open-access">🔓 Open Access</span>'
                            : ''
                        }
                    </div>
                    ${
                      study.keywords && study.keywords.length > 0
                        ? `
                    <div class="keywords">
                        <strong>Keywords:</strong> ${study.keywords.join(', ')}
                    </div>
                    `
                        : ''
                    }
                </div>
            `
    })
    .join('')
}

function toggleAbstract (studyId) {
  const abstractDiv = document.getElementById(`abstract-${studyId}`)
  const button = abstractDiv.previousElementSibling

  if (abstractDiv.classList.contains('show')) {
    abstractDiv.classList.remove('show')
    button.textContent = 'Show Abstract'
  } else {
    abstractDiv.classList.add('show')
    button.textContent = 'Hide Abstract'
  }
}

function filterByCitation (studyId) {
  document.getElementById('search').value = ''
  document.getElementById('methodFilter').value = ''
  document.getElementById('minAge').value = ''
  document.getElementById('maxAge').value = ''
  document.getElementById('sexFilter').value = ''
  document.getElementById('openAccessFilter').value = ''
  document.getElementById('healthStatusFilter').value = ''
  document
    .querySelectorAll('#treadmillBrandCheckboxes input')
    .forEach(cb => (cb.checked = false))

  filteredStudies = studiesData.filter(study => study.id === studyId)
  displayStudies()

  setTimeout(() => {
    document
      .getElementById(`study-${studyId}`)
      .scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 100)
}

function resetFilters () {
  document.getElementById('search').value = ''
  document.getElementById('methodFilter').value = ''
  document.getElementById('minAge').value = ''
  document.getElementById('maxAge').value = ''
  document.getElementById('sexFilter').value = ''
  document.getElementById('openAccessFilter').value = ''
  document.getElementById('healthStatusFilter').value = ''
  document.getElementById('treadmillFocusFilter').value = ''
  document.getElementById('sortBy').value = 'date-desc'
  document
    .querySelectorAll('#treadmillBrandCheckboxes input')
    .forEach(cb => (cb.checked = false))
  filterAndSortStudies()
}

document
  .getElementById('search')
  .addEventListener('input', filterAndSortStudies)
document
  .getElementById('methodFilter')
  .addEventListener('change', filterAndSortStudies)
document
  .getElementById('minAge')
  .addEventListener('input', filterAndSortStudies)
document
  .getElementById('maxAge')
  .addEventListener('input', filterAndSortStudies)
document
  .getElementById('sexFilter')
  .addEventListener('change', filterAndSortStudies)
document
  .getElementById('openAccessFilter')
  .addEventListener('change', filterAndSortStudies)
document
  .getElementById('healthStatusFilter')
  .addEventListener('change', filterAndSortStudies)
document
  .getElementById('treadmillFocusFilter')
  .addEventListener('change', filterAndSortStudies)
document
  .getElementById('sortBy')
  .addEventListener('change', filterAndSortStudies)
