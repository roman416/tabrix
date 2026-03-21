const pageName = document.body.dataset.page || 'overview';

const state = {
  tables: [],
  activeTableId: localStorage.getItem('tabrix.activeTableId') || localStorage.getItem('tableOS.activeTableId') || null,
  previewLimit: 50,
  previewOffset: 0,
  previewQuery: '',
  previewTotal: 0,
  charts: [],
  currentRows: [],
  highlightedCell: null,
};

const byId = (id) => document.getElementById(id);
const uploadBtn = byId('uploadBtn');
const fileInput = byId('fileInput');
const uploadStatus = byId('uploadStatus');
const refreshTablesBtn = byId('refreshTablesBtn');
const tablesList = byId('tablesList');
const activeTableTitle = byId('activeTableTitle');
const activeTableMeta = byId('activeTableMeta');
const columnBadges = byId('columnBadges');
const sortColumn = byId('sortColumn');
const sortDirection = byId('sortDirection');
const sortBtn = byId('sortBtn');
const sortResult = byId('sortResult');
const addRowBtn = byId('addRowBtn');
const deleteTableBtn = byId('deleteTableBtn');
const previewSearch = byId('previewSearch');
const previewPageSize = byId('previewPageSize');
const gotoPageInput = byId('gotoPageInput');
const gotoPageBtn = byId('gotoPageBtn');
const gotoCellInput = byId('gotoCellInput');
const gotoCellBtn = byId('gotoCellBtn');
const reloadPreviewBtn = byId('reloadPreviewBtn');
const previewMeta = byId('previewMeta');
const previewTableWrap = byId('previewTableWrap');
const prevPageBtn = byId('prevPageBtn');
const nextPageBtn = byId('nextPageBtn');
const pageInfo = byId('pageInfo');
const statsColumn = byId('statsColumn');
const statsBtn = byId('statsBtn');
const statsGrid = byId('statsGrid');
const dashboardCards = byId('dashboardCards');
const assistantLog = byId('assistantLog');
const assistantInput = byId('assistantInput');
const assistantSend = byId('assistantSend');
const useOllama = byId('useOllama');
const assistantStatus = byId('assistantStatus');

function saveActiveTableId(value) {
  if (value) {
    localStorage.setItem('tabrix.activeTableId', value);
    localStorage.setItem('tableOS.activeTableId', value);
  } else {
    localStorage.removeItem('tabrix.activeTableId');
    localStorage.removeItem('tableOS.activeTableId');
  }
}

function setStatus(text) {
  if (uploadStatus) uploadStatus.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function addMessage(text, who = 'bot') {
  if (!assistantLog) return;
  const div = document.createElement('div');
  div.className = `message ${who}`;
  div.textContent = text;
  assistantLog.appendChild(div);
  assistantLog.scrollTop = assistantLog.scrollHeight;
}

function fillSelect(selectEl, values) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = '';
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = typeof value === 'object' ? value.value : value;
    option.textContent = typeof value === 'object' ? value.label : value;
    selectEl.appendChild(option);
  });
  if ([...selectEl.options].some(option => option.value === current)) {
    selectEl.value = current;
  } else if (selectEl.options.length) {
    selectEl.value = selectEl.options[0].value;
  }
}

function renderTable(rows, { editable = false, includeActions = false } = {}) {
  state.currentRows = rows || [];
  if (!rows || rows.length === 0) {
    return '<div class="empty-state">Нет строк для отображения.</div>';
  }

  const baseColumns = Object.keys(rows[0]);
  const columns = includeActions ? ['__actions__', ...baseColumns] : baseColumns;
  const head = columns.map(col => {
    if (col === '__actions__') return '<th class="row-actions-cell">Действия</th>';
    if (col === '__rowid__') return '<th class="rowid-cell">№ строки</th>';
    return `<th>${escapeHtml(col)}</th>`;
  }).join('');

  const body = rows.map(row => {
    const rowId = row.__rowid__;
    return `<tr data-row-id="${escapeHtml(rowId)}">${columns.map(col => {
      if (col === '__actions__') {
        return `<td class="row-actions-cell"><button class="delete-row-btn" data-row-id="${escapeHtml(rowId)}">✕</button></td>`;
      }
      const isRowId = col === '__rowid__';
      const attr = editable && !isRowId
        ? `contenteditable="true" class="editable-cell" data-row-id="${escapeHtml(rowId)}" data-column="${escapeHtml(col)}" data-original="${escapeHtml(row[col])}"`
        : `data-column="${escapeHtml(col)}"`;
      const cls = isRowId ? 'class="rowid-cell"' : '';
      return `<td ${cls} ${attr}>${escapeHtml(row[col])}</td>`;
    }).join('')}</tr>`;
  }).join('');

  return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : {};
  if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

function attachDeleteButtons() {
  if (!previewTableWrap) return;
  previewTableWrap.querySelectorAll('.delete-row-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!state.activeTableId) return;
      const rowId = Number(btn.dataset.rowId);
      if (!window.confirm(`Удалить строку ${rowId + 1}?`)) return;
      try {
        await fetchJSON(`/api/table/${state.activeTableId}/row/${rowId}`, { method: 'DELETE' });
        if (sortResult) sortResult.textContent = `Строка ${rowId + 1} удалена`;
        await loadTables();
        await renderPageSpecificData();
      } catch (error) {
        if (sortResult) sortResult.textContent = `Ошибка удаления: ${error.message}`;
      }
    });
  });
}

function attachCellEditors() {
  if (!previewTableWrap) return;
  previewTableWrap.querySelectorAll('.editable-cell').forEach(cell => {
    cell.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        cell.blur();
      }
      if (event.key === 'Escape') {
        cell.textContent = cell.dataset.original ?? '';
        cell.blur();
      }
    });

    cell.addEventListener('focus', () => {
      cell.dataset.beforeEdit = cell.textContent;
    });

    cell.addEventListener('blur', async () => {
      const value = cell.textContent;
      if ((cell.dataset.beforeEdit ?? '') === value) return;
      const oldText = cell.dataset.beforeEdit ?? '';
      cell.classList.add('saving');
      try {
        const data = await fetchJSON(`/api/table/${state.activeTableId}/cell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            row_id: Number(cell.dataset.rowId),
            column: cell.dataset.column,
            value,
          }),
        });
        cell.dataset.original = data.value ?? '';
        cell.dataset.beforeEdit = data.value ?? '';
        cell.textContent = data.value ?? '';
        if (sortResult) sortResult.textContent = `Сохранено: строка ${data.row_id + 1}, колонка ${data.column}`;
        if (pageName === 'dashboards') await loadDashboard();
      } catch (error) {
        cell.textContent = oldText;
        cell.dataset.beforeEdit = oldText;
        if (sortResult) sortResult.textContent = `Ошибка сохранения: ${error.message}`;
      } finally {
        cell.classList.remove('saving');
      }
    });
  });
}

function renderTablesList() {
  if (!tablesList) return;
  if (!state.tables.length) {
    tablesList.innerHTML = '<div class="empty-state">Пока нет загруженных таблиц.</div>';
    return;
  }
  tablesList.innerHTML = state.tables.map(table => `
    <div class="table-item ${table.table_id === state.activeTableId ? 'active' : ''}" data-id="${table.table_id}">
      <strong>${escapeHtml(table.name)}</strong>
      <div class="muted">${table.rows} строк · ${table.columns} колонок</div>
    </div>
  `).join('');

  tablesList.querySelectorAll('.table-item').forEach(item => {
    item.addEventListener('click', async () => {
      state.activeTableId = item.dataset.id;
      saveActiveTableId(state.activeTableId);
      state.previewOffset = 0;
      state.previewQuery = '';
      if (previewSearch) previewSearch.value = '';
      renderTablesList();
      await loadTable(state.activeTableId);
    });
  });
}

function updateActiveMeta(table, groups) {
  if (activeTableTitle) activeTableTitle.textContent = table.name;
  if (activeTableMeta) activeTableMeta.textContent = `${table.rows} строк · ${table.columns} колонок`;
  if (!columnBadges) return;
  const pieces = [
    `Числовые: ${(groups.numeric || []).length}`,
    `Текстовые: ${(groups.categorical || []).length}`,
    `Дата и время: ${(groups.datetime || []).length}`,
  ];
  columnBadges.innerHTML = pieces.map(x => `<span class="badge">${escapeHtml(x)}</span>`).join('');
}

function fillControls(columnNames) {
  fillSelect(sortColumn, columnNames);
  fillSelect(statsColumn, columnNames);
}

function applyCellHighlight() {
  if (!previewTableWrap || !state.highlightedCell) return;
  const { rowId, column } = state.highlightedCell;
  const row = previewTableWrap.querySelector(`tr[data-row-id="${CSS.escape(String(rowId))}"]`);
  const cell = row?.querySelector(`td[data-column="${CSS.escape(String(column))}"]`);
  if (!cell) return;
  previewTableWrap.querySelectorAll('.highlighted-cell').forEach(el => el.classList.remove('highlighted-cell'));
  cell.classList.add('highlighted-cell');
  cell.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
}

async function renderPreview(customData = null) {
  if (!state.activeTableId || !previewTableWrap) return;
  const data = customData || await fetchJSON(`/api/table/${state.activeTableId}/preview?${new URLSearchParams({
    limit: String(state.previewLimit),
    offset: String(state.previewOffset),
    ...(state.previewQuery.trim() ? { query: state.previewQuery.trim() } : {}),
  }).toString()}`);

  state.previewTotal = data.total_rows;
  previewTableWrap.innerHTML = renderTable(data.rows, { editable: true, includeActions: true });
  attachCellEditors();
  attachDeleteButtons();
  applyCellHighlight();

  const start = data.total_rows === 0 ? 0 : data.offset + 1;
  const end = Math.min(data.offset + data.limit, data.total_rows);
  if (pageInfo) pageInfo.textContent = `${start}-${end} из ${data.total_rows}`;
  if (previewMeta) {
    previewMeta.textContent = state.previewQuery
      ? `Показан фильтр: «${state.previewQuery}».`
      : 'Показаны строки текущей таблицы.';
  }
  if (prevPageBtn) prevPageBtn.disabled = data.offset <= 0;
  if (nextPageBtn) nextPageBtn.disabled = data.offset + data.limit >= data.total_rows;
}

function renderStats(stats) {
  if (!statsGrid) return;
  const labels = {
    count: 'Количество',
    unique_count: 'Уникальных',
    unique_values: 'Уникальные значения',
    sum: 'Сумма',
    int_sum: 'Целочисленная сумма',
    mean: 'Среднее',
    median: 'Медиана',
    variance_sample: 'Выборочная дисперсия',
    std_sample: 'Стандартное отклонение',
    min: 'Минимум',
    max: 'Максимум',
    first: 'Первое',
    last: 'Последнее',
  };
  statsGrid.innerHTML = Object.entries(stats).map(([key, value]) => {
    const rendered = Array.isArray(value) ? value.join(', ') : String(value ?? '—');
    return `<div class="stat-card"><div class="k">${escapeHtml(labels[key] || key)}</div><div class="v">${escapeHtml(rendered)}</div></div>`;
  }).join('');
}

async function fetchStats() {
  if (!state.activeTableId || !statsColumn) return;
  const column = statsColumn.value;
  if (!column) return;
  const data = await fetchJSON(`/api/table/${state.activeTableId}/stats/${encodeURIComponent(column)}`);
  renderStats(data.stats);
}

async function sortActiveTable() {
  if (!state.activeTableId || !sortColumn || !sortDirection) return;
  const data = await fetchJSON(`/api/table/${state.activeTableId}/sort`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      column: sortColumn.value,
      ascending: sortDirection.value === 'asc',
    }),
  });
  if (sortResult) {
    sortResult.innerHTML = `${escapeHtml(data.message)} · <a class="sort-link" href="${data.download_url}">Скачать CSV</a>`;
  }
  state.highlightedCell = null;
  await renderPreview({
    rows: data.preview,
    total_rows: data.preview.length,
    offset: 0,
    limit: data.preview.length,
  });
  if (previewMeta) previewMeta.textContent = 'Показан предпросмотр отсортированной таблицы. Человечество всё же нажало кнопку не зря.';
}

async function addEmptyRow() {
  if (!state.activeTableId) return;
  await fetchJSON(`/api/table/${state.activeTableId}/row`, { method: 'POST' });
  await loadTables();
  await renderPageSpecificData();
}

async function deleteActiveTable() {
  if (!state.activeTableId) return;
  const currentTable = state.tables.find(x => x.table_id === state.activeTableId);
  if (!window.confirm(`Удалить таблицу ${currentTable?.name || ''}?`)) return;
  await fetchJSON(`/api/table/${state.activeTableId}`, { method: 'DELETE' });
  state.activeTableId = null;
  saveActiveTableId(null);
  state.previewOffset = 0;
  state.previewQuery = '';
  state.highlightedCell = null;
  await loadTables();
}

function destroyCharts() {
  state.charts.forEach(chart => chart.destroy());
  state.charts = [];
}

function renderDashboardCards(cards) {
  if (!dashboardCards) return;
  destroyCharts();
  if (!cards?.length) {
    dashboardCards.innerHTML = '<div class="empty-state">Для этой таблицы пока не из чего строить дашборды.</div>';
    return;
  }

  dashboardCards.innerHTML = cards.map((card, index) => {
    if (card.type === 'stats') {
      return `
        <article class="dashboard-card">
          <h4>${escapeHtml(card.title)}</h4>
          <div class="stats-grid compact-grid">
            ${Object.entries(card.payload).map(([key, value]) => `
              <div class="stat-card">
                <div class="k">${escapeHtml(key)}</div>
                <div class="v">${escapeHtml(Array.isArray(value) ? value.join(', ') : String(value ?? '—'))}</div>
              </div>`).join('')}
          </div>
        </article>`;
    }
    return `
      <article class="dashboard-card chart-card">
        <h4>${escapeHtml(card.title)}</h4>
        <div class="chart-wrap"><canvas id="chart-${index}"></canvas></div>
      </article>`;
  }).join('');

  cards.forEach((card, index) => {
    if (card.type !== 'bar') return;
    const canvas = byId(`chart-${index}`);
    if (!canvas) return;
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: card.payload.labels,
        datasets: [{ label: card.title, data: card.payload.values }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
      },
    });
    state.charts.push(chart);
  });
}

async function loadDashboard() {
  if (!state.activeTableId || !dashboardCards) return;
  const data = await fetchJSON(`/api/table/${state.activeTableId}/dashboard`);
  renderDashboardCards(data.cards);
}

async function updateAssistantStatus() {
  if (!assistantStatus) return;
  try {
    const data = await fetchJSON('/api/assistant/status');
    if (data.ok) {
      assistantStatus.textContent = data.model_present
        ? `Ollama: ${data.model} доступна`
        : `Ollama доступна, но модели ${data.model} нет`;
    } else {
      assistantStatus.textContent = `Ollama недоступна: ${data.error}`;
    }
  } catch (error) {
    assistantStatus.textContent = `Не удалось проверить Ollama: ${error.message}`;
  }
}

async function askAssistant() {
  const question = assistantInput?.value.trim();
  if (!question) return;
  addMessage(question, 'user');
  assistantInput.value = '';
  try {
    const data = await fetchJSON('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: state.activeTableId,
        question,
        use_ollama: useOllama?.checked ?? true,
      }),
    });
    const suffix = data.model ? `\n[модель: ${data.model}; источник: ${data.source}]` : '';
    addMessage(`${data.answer}${suffix}`, 'bot');
    await updateAssistantStatus();
  } catch (error) {
    addMessage(`Ошибка: ${error.message}`, 'bot');
  }
}

function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function columnLabelToIndex(label) {
  let index = 0;
  const value = String(label || '').trim().toUpperCase();
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) return -1;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

async function goToPage() {
  const page = Math.max(Number(gotoPageInput?.value || 1), 1);
  state.previewOffset = (page - 1) * state.previewLimit;
  state.highlightedCell = null;
  await renderPreview();
}

async function goToCell() {
  const cellRef = String(gotoCellInput?.value || '').trim().toUpperCase();
  const match = cellRef.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    if (sortResult) sortResult.textContent = 'Координата должна быть в формате A1';
    return;
  }
  const [, columnLabel, rowText] = match;
  const rowNumber = Number(rowText);
  const rowId = rowNumber - 1;
  if (rowId < 0) return;
  state.previewOffset = Math.floor(rowId / state.previewLimit) * state.previewLimit;
  const table = state.tables.find(x => x.table_id === state.activeTableId);
  const column = table?.column_names?.[columnLabelToIndex(columnLabel)];
  if (!column) {
    if (sortResult) sortResult.textContent = 'Колонка вне диапазона таблицы';
    return;
  }
  state.highlightedCell = { rowId, column };
  await renderPreview();
  if (sortResult) sortResult.textContent = `Переход к ячейке ${cellRef}`;
}

async function renderPageSpecificData() {
  if (!state.activeTableId) {
    if (previewTableWrap) previewTableWrap.innerHTML = '<div class="empty-state">Выбери таблицу.</div>';
    if (dashboardCards) dashboardCards.innerHTML = '<div class="empty-state">Выбери таблицу.</div>';
    return;
  }
  if (pageName === 'overview') await renderPreview();
  if (pageName === 'dashboards') await loadDashboard();
  if (pageName === 'assistant') await updateAssistantStatus();
}

async function loadTable(tableId) {
  const data = await fetchJSON(`/api/table/${tableId}`);
  state.activeTableId = tableId;
  saveActiveTableId(tableId);
  renderTablesList();
  updateActiveMeta(data.table, data.column_groups);
  fillControls(data.table.column_names);
  if (statsGrid) statsGrid.innerHTML = '';
  if (sortResult) sortResult.innerHTML = '';
  await renderPageSpecificData();
}

async function loadTables() {
  const data = await fetchJSON('/api/tables');
  state.tables = data.tables;
  if (!state.activeTableId && state.tables.length) state.activeTableId = state.tables[0].table_id;
  if (state.activeTableId && !state.tables.find(x => x.table_id === state.activeTableId)) {
    state.activeTableId = state.tables[0]?.table_id || null;
  }
  renderTablesList();
  if (state.activeTableId) {
    await loadTable(state.activeTableId);
  } else {
    saveActiveTableId(null);
    await renderPageSpecificData();
  }
}

async function uploadTable() {
  const file = fileInput?.files?.[0];
  if (!file) {
    setStatus('Сначала выбери файл. Телепатия всё ещё не внедрена.');
    return;
  }
  const formData = new FormData();
  formData.append('file', file);
  uploadBtn.disabled = true;
  setStatus('Загружаю и читаю таблицу...');
  try {
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка загрузки');
    state.activeTableId = data.table.table_id;
    saveActiveTableId(state.activeTableId);
    state.previewOffset = 0;
    state.previewQuery = '';
    if (previewSearch) previewSearch.value = '';
    setStatus(`Готово: ${data.table.name}`);
    await loadTables();
  } catch (error) {
    setStatus(`Ошибка загрузки: ${error.message}`);
  } finally {
    uploadBtn.disabled = false;
  }
}

uploadBtn?.addEventListener('click', uploadTable);
refreshTablesBtn?.addEventListener('click', loadTables);
reloadPreviewBtn?.addEventListener('click', () => renderPreview());
statsBtn?.addEventListener('click', fetchStats);
sortBtn?.addEventListener('click', sortActiveTable);
addRowBtn?.addEventListener('click', addEmptyRow);
deleteTableBtn?.addEventListener('click', deleteActiveTable);
gotoPageBtn?.addEventListener('click', goToPage);
gotoCellBtn?.addEventListener('click', goToCell);
assistantSend?.addEventListener('click', askAssistant);
assistantInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') askAssistant(); });
gotoPageInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') goToPage(); });
gotoCellInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') goToCell(); });

previewPageSize?.addEventListener('change', async () => {
  state.previewLimit = Number(previewPageSize.value) || 50;
  state.previewOffset = 0;
  state.highlightedCell = null;
  await renderPreview();
});

previewSearch?.addEventListener('input', debounce(async () => {
  state.previewQuery = previewSearch.value.trim();
  state.previewOffset = 0;
  state.highlightedCell = null;
  await renderPreview();
}, 350));

prevPageBtn?.addEventListener('click', async () => {
  state.previewOffset = Math.max(0, state.previewOffset - state.previewLimit);
  state.highlightedCell = null;
  await renderPreview();
});

nextPageBtn?.addEventListener('click', async () => {
  state.previewOffset += state.previewLimit;
  state.highlightedCell = null;
  await renderPreview();
});

loadTables().catch(error => setStatus(`Ошибка инициализации: ${error.message}`));
