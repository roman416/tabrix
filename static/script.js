const state = {
  tables: [],
  activeTableId: localStorage.getItem('tabrix.activeTableId') || null,
  activeTable: null,
  columnGroups: { numeric: [], categorical: [], datetime: [] },
  previewLimit: 50,
  previewOffset: 0,
  previewQuery: '',
  previewTotal: 0,
  currentRows: [],
  highlightedCell: null,
  dashboardCards: [],
  assistantStatus: null,
};

const byId = (id) => document.getElementById(id);
const els = {
  tablesGrid: byId('tablesGrid'),
  selectedTableBox: byId('selectedTableBox'),
  selectedTableName: byId('selectedTableName'),
  tableDropdown: byId('tableDropdown'),
  statusText: byId('statusText'),
  uploadInput: byId('uploadInput'),
  refreshTablesBtn: byId('refreshTablesBtn'),
  assistantHealthBadge: byId('assistantHealthBadge'),
  miniDashboards: byId('miniDashboards'),
  openDashboardBtn: byId('openDashboardBtn'),
  bigChartTitle: byId('bigChartTitle'),
  bigChartMeta: byId('bigChartMeta'),
  bigLineChart: byId('bigLineChart'),
  dashboardKpis: byId('dashboardKpis'),
  donutChart: byId('donutChart'),
  donutLegend: byId('donutLegend'),
  barChartTitle: byId('barChartTitle'),
  barChartMeta: byId('barChartMeta'),
  trendBars: byId('trendBars'),
  trendAxis: byId('trendAxis'),
  presetList: byId('presetList'),
  previewTitle: byId('previewTitle'),
  previewMeta: byId('previewMeta'),
  dataTable: byId('dataTable'),
  previewWrap: byId('previewWrap'),
  pageInfo: byId('pageInfo'),
  prevPageBtn: byId('prevPageBtn'),
  nextPageBtn: byId('nextPageBtn'),
  previewSearch: byId('previewSearch'),
  previewPageSize: byId('previewPageSize'),
  gotoPageInput: byId('gotoPageInput'),
  gotoPageBtn: byId('gotoPageBtn'),
  gotoCellInput: byId('gotoCellInput'),
  gotoCellBtn: byId('gotoCellBtn'),
  reloadPreviewBtn: byId('reloadPreviewBtn'),
  sortColumn: byId('sortColumn'),
  sortDirection: byId('sortDirection'),
  sortBtn: byId('sortBtn'),
  addRowBtn: byId('addRowBtn'),
  sortResult: byId('sortResult'),
  sortDownloadSlot: byId('sortDownloadSlot'),
  statsColumn: byId('statsColumn'),
  statsBtn: byId('statsBtn'),
  quickQuestion: byId('quickQuestion'),
  quickSend: byId('quickSend'),
  assistantLog: byId('dashboardAssistantLog'),
  assistantInput: byId('dashboardAssistantInput'),
  assistantSend: byId('dashboardAssistantSend'),
  useOllama: byId('useOllama'),
  backToTablesBtn: byId('backToTablesBtn'),
  changeTableBtn: byId('changeTableBtn'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Ошибка запроса');
  return data;
}

function setStatus(text) {
  if (els.statusText) els.statusText.textContent = text;
}

function addMessage(text, who = 'bot') {
  const message = document.createElement('div');
  message.className = `message ${who}`;
  message.textContent = text;
  els.assistantLog.appendChild(message);
  els.assistantLog.scrollTop = els.assistantLog.scrollHeight;
}

function saveActiveTableId() {
  if (state.activeTableId) localStorage.setItem('tabrix.activeTableId', state.activeTableId);
}

function openTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === tab));
}

function formatNumber(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(numeric) : String(value);
}

function initialLetters(name = '') {
  return name.replace(/\.[^.]+$/, '').trim().slice(0, 2).toUpperCase() || 'TB';
}

function renderTablesGrid() {
  const tables = state.tables;
  els.tablesGrid.innerHTML = '';

  const uploadCard = document.createElement('div');
  uploadCard.className = 'table-card upload-card';
  uploadCard.innerHTML = `
    <div class="table-preview">
      <div class="upload-icon">↑</div>
      <div>Загрузить таблицу</div>
    </div>
    <div class="table-meta"><span>CSV / XLSX / TSV / Parquet</span><span class="chev"></span></div>`;
  uploadCard.addEventListener('click', () => els.uploadInput.click());
  els.tablesGrid.appendChild(uploadCard);

  if (!tables.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.textContent = 'Пока нет загруженных таблиц. Добавь файл, и интерфейс построит обзор автоматически.';
    els.tablesGrid.appendChild(empty);
    return;
  }

  tables.forEach((table) => {
    const card = document.createElement('div');
    card.className = `table-card ${table.table_id === state.activeTableId ? 'active' : ''}`;
    card.innerHTML = `
      <div class="table-preview"><div class="file-mark">${escapeHtml(initialLetters(table.name))}</div></div>
      <div class="table-meta">
        <div>
          <span>${escapeHtml(table.name)}</span>
          <small>${escapeHtml(`${table.rows} строк · ${table.columns} колонок`)}</small>
        </div>
        <span class="chev"></span>
      </div>`;
    card.addEventListener('click', () => selectTable(table.table_id));
    els.tablesGrid.appendChild(card);
  });
}

function renderDropdown() {
  els.tableDropdown.innerHTML = '';
  state.tables.forEach((table) => {
    const btn = document.createElement('button');
    btn.className = 'select-option';
    btn.type = 'button';
    btn.textContent = `${table.name} · ${table.rows}×${table.columns}`;
    btn.addEventListener('click', () => {
      els.tableDropdown.classList.add('hidden');
      selectTable(table.table_id);
    });
    els.tableDropdown.appendChild(btn);
  });
}

function miniCardsFromTable(table, groups) {
  return [
    { title: 'Строк', value: formatNumber(table?.rows), caption: 'записей в активной таблице' },
    { title: 'Колонок', value: formatNumber(table?.columns), caption: 'обнаружено автоматически' },
    { title: 'Числовых', value: formatNumber(groups.numeric?.length || 0), caption: 'готовы к расчётам' },
    { title: 'Категорий', value: formatNumber(groups.categorical?.length || 0), caption: 'для группировок и фильтров' },
  ];
}

function renderMiniDashboards() {
  if (!state.activeTable) {
    els.miniDashboards.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Выбери таблицу, чтобы увидеть быстрые карточки.</div>`;
    return;
  }
  const items = miniCardsFromTable(state.activeTable, state.columnGroups);
  els.miniDashboards.innerHTML = items.map((item, idx) => `
    <div class="chart-card mini-stat">
      <div class="mini-stat-top"><span class="mini-label">${escapeHtml(item.title)}</span><span class="panel-chip">0${idx + 1}</span></div>
      <div class="mini-value">${escapeHtml(item.value)}</div>
      <div class="mini-caption">${escapeHtml(item.caption)}</div>
      <svg class="sparkline" viewBox="0 0 100 30"><polyline fill="none" stroke="rgba(124,58,237,.7)" stroke-width="2" points="0,20 20,12 40,16 60,8 80,14 100,6"></polyline></svg>
    </div>`).join('');
}

function renderKpis() {
  if (!state.activeTable) {
    els.dashboardKpis.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Здесь появятся KPI после выбора таблицы.</div>`;
    return;
  }
  const groups = state.columnGroups;
  const kpis = [
    { label: 'Активная таблица', value: state.activeTable.name, compact: true },
    { label: 'Размер файла', value: `${Math.max(1, Math.round((state.activeTable.file_size || 0) / 1024))} KB` },
    { label: 'Дата/время колонки', value: formatNumber(groups.datetime?.length || 0) },
    { label: 'AI режим', value: state.assistantStatus?.ok ? 'Ollama online' : 'fallback' },
  ];
  els.dashboardKpis.innerHTML = kpis.map((item) => `
    <div class="kpi-card">
      <div class="kpi-label">${escapeHtml(item.label)}</div>
      <div class="kpi-value ${item.compact ? 'compact' : ''}">${escapeHtml(item.value)}</div>
    </div>`).join('');
}

function renderDonut() {
  const groups = state.columnGroups;
  const values = [groups.numeric?.length || 0, groups.categorical?.length || 0, groups.datetime?.length || 0];
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const stops = [];
  let offset = 0;
  const colors = ['#8b5cf6', '#b9b7ff', '#cfd58d'];
  values.forEach((value, idx) => {
    const share = (value / total) * 100;
    stops.push(`${colors[idx]} ${offset}% ${offset + share}%`);
    offset += share;
  });
  els.donutChart.style.background = `conic-gradient(${stops.join(', ')})`;
  els.donutLegend.innerHTML = [
    ['Числовые', values[0]],
    ['Категориальные', values[1]],
    ['Дата/время', values[2]],
  ].map((item, idx) => `
    <div class="legend-item">
      <div style="display:flex;align-items:center;gap:10px"><span class="dot" style="background:${colors[idx]}"></span><span>${escapeHtml(item[0])}</span></div>
      <strong>${escapeHtml(String(item[1]))}</strong>
    </div>`).join('');
}

function numericColumnsFromRows(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter((key) => key !== '__rowid__' && rows.some((row) => Number.isFinite(Number(row[key]))));
}

function renderTrend() {
  const rows = state.currentRows.slice(0, 8);
  const numericColumns = numericColumnsFromRows(rows).slice(0, 3);
  if (!rows.length || !numericColumns.length) {
    els.trendBars.innerHTML = `<div class="empty-state" style="width:100%">Для графика нужна хотя бы одна числовая колонка в preview.</div>`;
    els.trendAxis.innerHTML = '';
    els.bigLineChart.innerHTML = '';
    return;
  }

  const points = rows.map((row, index) => ({
    label: String(index + 1),
    value: numericColumns.reduce((sum, key) => sum + Number(row[key] || 0), 0),
  }));
  const max = Math.max(...points.map((p) => p.value), 1);

  els.barChartTitle.textContent = `Сумма ${numericColumns.join(' + ')}`;
  els.barChartMeta.textContent = 'по строкам текущего preview';
  els.trendBars.innerHTML = points.map((point) => {
    const h = Math.max(8, Math.round((point.value / max) * 180));
    return `<div class="bar-col"><div class="bar-value">${escapeHtml(formatNumber(point.value))}</div><div class="bar-rect" style="height:${h}px"></div></div>`;
  }).join('');
  els.trendAxis.innerHTML = points.map((point) => `<div>${escapeHtml(point.label)}</div>`).join('');

  const path = points.map((point, index) => {
    const x = 30 + index * ((500) / Math.max(points.length - 1, 1));
    const y = 220 - (point.value / max) * 180;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  els.bigChartTitle.textContent = 'Общий тренд по preview';
  els.bigChartMeta.textContent = numericColumns.join(', ');
  els.bigLineChart.innerHTML = `
    <defs>
      <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(139,92,246,.35)"></stop>
        <stop offset="100%" stop-color="rgba(139,92,246,0)"></stop>
      </linearGradient>
    </defs>
    <path d="${path} L 530 240 L 30 240 Z" fill="url(#lineFill)"></path>
    <path d="${path}" fill="none" stroke="#7c3aed" stroke-width="4" stroke-linecap="round"></path>`;
}

function fillSelect(select, values, placeholder = '—') {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '';
  if (!values.length) {
    const option = document.createElement('option');
    option.textContent = placeholder;
    option.value = '';
    select.appendChild(option);
    return;
  }
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (value === current) option.selected = true;
    select.appendChild(option);
  });
}

function renderPresetCards() {
  if (!state.dashboardCards.length) {
    els.presetList.innerHTML = `<div class="helper-grid">
      <div class="helper-card"><strong>Готово к интеграции</strong>Карточки появятся автоматически, когда backend соберёт аналитические блоки по выбранной таблице.</div>
    </div>`;
    return;
  }
  els.presetList.innerHTML = state.dashboardCards.map((card, index) => `
    <div class="preset-card">
      <h4>${escapeHtml(card.title || `Карточка ${index + 1}`)}</h4>
      <p>${escapeHtml(card.type === 'bar' ? 'Графическая карточка, собранная на backend.' : 'Статистическая карточка, собранная на backend.')}</p>
      <button type="button" data-card-index="${index}">Открыть</button>
    </div>`).join('');
  els.presetList.querySelectorAll('button[data-card-index]').forEach((button) => {
    button.addEventListener('click', () => activatePresetCard(Number(button.dataset.cardIndex)));
  });
}

function activatePresetCard(index) {
  const card = state.dashboardCards[index];
  if (!card) return;
  if (card.type === 'bar' && card.payload?.labels?.length) {
    const values = card.payload.values || [];
    const max = Math.max(...values, 1);
    els.barChartTitle.textContent = card.title;
    els.barChartMeta.textContent = 'backend card';
    els.trendBars.innerHTML = values.map((value) => `<div class="bar-col"><div class="bar-value">${escapeHtml(formatNumber(value))}</div><div class="bar-rect" style="height:${Math.max(8, Math.round((value / max) * 180))}px"></div></div>`).join('');
    els.trendAxis.innerHTML = card.payload.labels.map((label) => `<div>${escapeHtml(label)}</div>`).join('');
  }
  if (card.type === 'stats' && card.payload) {
    const statLines = Object.entries(card.payload).slice(0, 6).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v ?? '—'}`).join('\n');
    addMessage(`Открыта карточка «${card.title}».\n${statLines}`, 'bot');
  } else {
    addMessage(`Открыта карточка «${card.title}».`, 'bot');
  }
}

function renderTable(rows) {
  state.currentRows = rows;
  const table = els.dataTable;
  table.innerHTML = '';
  if (!rows.length) {
    table.innerHTML = '<tbody><tr><td><div class="empty-state">Нет строк для отображения.</div></td></tr></tbody>';
    return;
  }

  const headers = Object.keys(rows[0]);
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headers.forEach((header, idx) => {
    const th = document.createElement('th');
    th.textContent = header === '__rowid__' ? 'row' : header;
    if (idx === 0) th.className = 'sticky-col rowid-cell';
    headRow.appendChild(th);
    if (idx === 0) {
      const actionTh = document.createElement('th');
      actionTh.textContent = 'действия';
      actionTh.className = 'sticky-col actions';
      headRow.appendChild(actionTh);
    }
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.dataset.rowId = row.__rowid__;
    headers.forEach((header, idx) => {
      const td = document.createElement('td');
      if (idx === 0) td.className = 'sticky-col rowid-cell';
      td.dataset.column = header;
      td.textContent = row[header] ?? '';
      if (header !== '__rowid__') {
        td.contentEditable = 'true';
        td.classList.add('editable-cell');
      }
      tr.appendChild(td);
      if (idx === 0) {
        const actionTd = document.createElement('td');
        actionTd.className = 'sticky-col actions';
        actionTd.innerHTML = `<button class="delete-row-btn" type="button">Удалить</button>`;
        tr.appendChild(actionTd);
      }
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  attachTableHandlers();
}

async function renderPreview() {
  if (!state.activeTableId) return;
  const params = new URLSearchParams({ limit: String(state.previewLimit), offset: String(state.previewOffset) });
  if (state.previewQuery.trim()) params.set('query', state.previewQuery.trim());
  const data = await fetchJSON(`/api/table/${state.activeTableId}/preview?${params.toString()}`);
  state.previewTotal = data.total_rows;
  renderTable(data.rows || []);
  const start = data.total_rows ? data.offset + 1 : 0;
  const end = Math.min(data.offset + data.limit, data.total_rows);
  els.pageInfo.textContent = `${start}-${end} из ${data.total_rows}`;
  els.previewMeta.textContent = state.previewQuery ? `Фильтр: ${state.previewQuery}` : 'редактируемые строки активной таблицы';
  els.prevPageBtn.disabled = data.offset <= 0;
  els.nextPageBtn.disabled = data.offset + data.limit >= data.total_rows;
  renderTrend();
  applyCellHighlight();
}

function applyCellHighlight() {
  if (!state.highlightedCell) return;
  els.previewWrap.querySelectorAll('.highlighted-cell').forEach((el) => el.classList.remove('highlighted-cell'));
  const row = els.previewWrap.querySelector(`tr[data-row-id="${CSS.escape(String(state.highlightedCell.rowId))}"]`);
  const cell = row?.querySelector(`td[data-column="${CSS.escape(String(state.highlightedCell.column))}"]`);
  if (cell) {
    cell.classList.add('highlighted-cell');
    cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
}

function attachTableHandlers() {
  els.dataTable.querySelectorAll('.editable-cell').forEach((cell) => {
    const commit = async () => {
      const row = cell.closest('tr');
      const rowId = row?.dataset.rowId;
      const column = cell.dataset.column;
      const value = cell.textContent;
      if (!rowId || !column || !state.activeTableId) return;
      try {
        await fetchJSON(`/api/table/${state.activeTableId}/cell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ row_id: Number(rowId), column, value }),
        });
      } catch (error) {
        setStatus(`Не удалось сохранить ячейку: ${error.message}`);
      }
    };
    cell.addEventListener('blur', commit);
    cell.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        cell.blur();
      }
    });
  });

  els.dataTable.querySelectorAll('.delete-row-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const rowId = button.closest('tr')?.dataset.rowId;
      if (!rowId || !state.activeTableId) return;
      try {
        await fetchJSON(`/api/table/${state.activeTableId}/row/${rowId}`, { method: 'DELETE' });
        setStatus(`Строка ${rowId} удалена.`);
        await refreshActiveTable();
      } catch (error) {
        setStatus(`Не удалось удалить строку: ${error.message}`);
      }
    });
  });
}

async function renderStats() {
  if (!state.activeTableId || !els.statsColumn.value) return;
  const data = await fetchJSON(`/api/table/${state.activeTableId}/stats/${encodeURIComponent(els.statsColumn.value)}`);
  const lines = Object.entries(data.stats || {}).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value ?? '—'}`).join('\n');
  addMessage(`Статистика по колонке ${els.statsColumn.value}:\n${lines}`, 'bot');
}

async function renderDashboardCards() {
  if (!state.activeTableId) return;
  const data = await fetchJSON(`/api/table/${state.activeTableId}/dashboard`);
  state.dashboardCards = data.cards || [];
  renderPresetCards();
}

async function refreshAssistantStatus() {
  try {
    const data = await fetchJSON('/api/assistant/status');
    state.assistantStatus = data;
    els.assistantHealthBadge.textContent = data.ok ? `AI: ${data.model_present ? 'Ollama готова' : 'модель не найдена'}` : 'AI: fallback';
  } catch (error) {
    state.assistantStatus = { ok: false, error: error.message };
    els.assistantHealthBadge.textContent = 'AI: fallback';
  }
  renderKpis();
}

async function sendAssistantQuestion(text) {
  if (!text.trim()) return;
  addMessage(text, 'user');
  try {
    const data = await fetchJSON('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: state.activeTableId,
        question: text.trim(),
        use_ollama: Boolean(els.useOllama.checked),
      }),
    });
    addMessage(`${data.answer}${data.source ? `\n\nИсточник: ${data.source}` : ''}`, 'bot');
  } catch (error) {
    addMessage(`Ошибка assistant: ${error.message}`, 'bot');
  }
}

async function loadTables() {
  const data = await fetchJSON('/api/tables');
  state.tables = data.tables || [];
  if (!state.tables.length) state.activeTableId = null;
  if (state.activeTableId && !state.tables.some((t) => t.table_id === state.activeTableId)) {
    state.activeTableId = null;
  }
  if (!state.activeTableId && state.tables[0]) state.activeTableId = state.tables[0].table_id;
  renderTablesGrid();
  renderDropdown();
  if (state.activeTableId) await selectTable(state.activeTableId, false);
  else renderEmptyMode();
}

function renderEmptyMode() {
  state.activeTable = null;
  state.currentRows = [];
  els.selectedTableName.textContent = 'Выбери таблицу';
  renderMiniDashboards();
  renderKpis();
  els.presetList.innerHTML = '<div class="empty-state">Нет активной таблицы.</div>';
  els.dataTable.innerHTML = '';
  els.donutLegend.innerHTML = '<div class="empty-state">Структура появится после загрузки.</div>';
  els.trendBars.innerHTML = '<div class="empty-state" style="width:100%">Здесь появится график.</div>';
  els.trendAxis.innerHTML = '';
  els.bigLineChart.innerHTML = '';
  setStatus('Загрузи файл или выбери существующую таблицу.');
}

async function refreshActiveTable() {
  if (!state.activeTableId) return renderEmptyMode();
  const details = await fetchJSON(`/api/table/${state.activeTableId}`);
  state.activeTable = details.table;
  state.columnGroups = details.column_groups || { numeric: [], categorical: [], datetime: [] };
  const match = state.tables.find((t) => t.table_id === state.activeTableId);
  if (match) Object.assign(match, details.table);
  els.selectedTableName.textContent = details.table.name;
  fillSelect(els.sortColumn, details.table.column_names || [], 'Нет колонок');
  fillSelect(els.statsColumn, details.table.column_names || [], 'Нет колонок');
  renderTablesGrid();
  renderDropdown();
  renderMiniDashboards();
  renderKpis();
  renderDonut();
  setStatus(`Активная таблица: ${details.table.name}. Backend подключён, можно редактировать, сортировать и спрашивать AI.`);
  await Promise.all([renderPreview(), renderDashboardCards()]);
}

async function selectTable(tableId, resetView = true) {
  state.activeTableId = tableId;
  saveActiveTableId();
  if (resetView) {
    state.previewOffset = 0;
    state.previewQuery = '';
    els.previewSearch.value = '';
  }
  await refreshActiveTable();
}

async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/upload', { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось загрузить файл');
  return data;
}

async function handleUpload() {
  const file = els.uploadInput.files?.[0];
  if (!file) return;
  setStatus(`Загружаю ${file.name}…`);
  try {
    const data = await uploadFile(file);
    await loadTables();
    if (data.table?.table_id) await selectTable(data.table.table_id);
    setStatus(`Файл «${file.name}» загружен. Таблица нормализована и готова к работе.`);
  } catch (error) {
    setStatus(`Ошибка загрузки: ${error.message}`);
  } finally {
    els.uploadInput.value = '';
  }
}

async function handleSort() {
  if (!state.activeTableId || !els.sortColumn.value) return;
  els.sortResult.textContent = 'Сортирую…';
  try {
    const data = await fetchJSON(`/api/table/${state.activeTableId}/sort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column: els.sortColumn.value, ascending: els.sortDirection.value === 'asc' }),
    });
    els.sortResult.textContent = data.message || 'Сортировка готова.';
    els.sortDownloadSlot.innerHTML = data.download_url ? `<a class="download-link" href="${data.download_url}">Скачать отсортированный файл</a>` : '';
    if (data.preview) {
      renderTable(data.preview);
      els.previewMeta.textContent = `Показан preview результата сортировки по ${els.sortColumn.value}`;
      renderTrend();
    }
  } catch (error) {
    els.sortResult.textContent = `Ошибка сортировки: ${error.message}`;
  }
}

async function handleAddRow() {
  if (!state.activeTableId) return;
  try {
    await fetchJSON(`/api/table/${state.activeTableId}/row`, { method: 'POST' });
    setStatus('Добавлена новая строка.');
    await refreshActiveTable();
  } catch (error) {
    setStatus(`Не удалось добавить строку: ${error.message}`);
  }
}

function handleGoToCell() {
  const value = els.gotoCellInput.value.trim().toUpperCase();
  const match = value.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    setStatus('Введите ячейку в формате B12.');
    return;
  }
  const colLetters = match[1];
  const rowNumber = Number(match[2]);
  const columnIndex = [...colLetters].reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
  const columnNames = state.activeTable?.column_names || [];
  const column = columnNames[columnIndex];
  if (!column) {
    setStatus('Такой колонки нет в текущей таблице.');
    return;
  }
  const rowId = rowNumber - 2;
  state.highlightedCell = { rowId, column };
  const page = Math.max(0, Math.floor(rowId / state.previewLimit));
  state.previewOffset = page * state.previewLimit;
  renderPreview().catch((error) => setStatus(`Не удалось перейти к ячейке: ${error.message}`));
}

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach((button) => button.addEventListener('click', () => openTab(button.dataset.tab)));
  els.selectedTableBox.addEventListener('click', () => els.tableDropdown.classList.toggle('hidden'));
  document.addEventListener('click', (event) => {
    if (!els.tableDropdown.contains(event.target) && !els.selectedTableBox.contains(event.target)) {
      els.tableDropdown.classList.add('hidden');
    }
  });
  els.uploadInput.addEventListener('change', handleUpload);
  els.refreshTablesBtn.addEventListener('click', () => loadTables().catch((error) => setStatus(error.message)));
  els.openDashboardBtn.addEventListener('click', () => openTab('dashboards'));
  els.backToTablesBtn.addEventListener('click', () => openTab('tables'));
  els.changeTableBtn.addEventListener('click', () => { openTab('tables'); els.tableDropdown.classList.remove('hidden'); });
  els.previewSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      state.previewQuery = els.previewSearch.value.trim();
      state.previewOffset = 0;
      renderPreview().catch((error) => setStatus(error.message));
    }
  });
  els.previewPageSize.addEventListener('change', () => {
    state.previewLimit = Number(els.previewPageSize.value) || 50;
    state.previewOffset = 0;
    renderPreview().catch((error) => setStatus(error.message));
  });
  els.gotoPageBtn.addEventListener('click', () => {
    const page = Math.max(1, Number(els.gotoPageInput.value) || 1);
    state.previewOffset = (page - 1) * state.previewLimit;
    renderPreview().catch((error) => setStatus(error.message));
  });
  els.gotoCellBtn.addEventListener('click', handleGoToCell);
  els.reloadPreviewBtn.addEventListener('click', () => refreshActiveTable().catch((error) => setStatus(error.message)));
  els.prevPageBtn.addEventListener('click', () => {
    state.previewOffset = Math.max(0, state.previewOffset - state.previewLimit);
    renderPreview().catch((error) => setStatus(error.message));
  });
  els.nextPageBtn.addEventListener('click', () => {
    state.previewOffset += state.previewLimit;
    renderPreview().catch((error) => setStatus(error.message));
  });
  els.sortBtn.addEventListener('click', handleSort);
  els.addRowBtn.addEventListener('click', handleAddRow);
  els.statsBtn.addEventListener('click', () => renderStats().catch((error) => addMessage(`Ошибка статистики: ${error.message}`, 'bot')));
  els.quickSend.addEventListener('click', () => {
    const text = els.quickQuestion.value.trim();
    if (!text) return;
    openTab('dashboards');
    sendAssistantQuestion(text);
    els.quickQuestion.value = '';
  });
  els.quickQuestion.addEventListener('keydown', (event) => { if (event.key === 'Enter') els.quickSend.click(); });
  els.assistantSend.addEventListener('click', () => {
    const text = els.assistantInput.value.trim();
    if (!text) return;
    sendAssistantQuestion(text);
    els.assistantInput.value = '';
  });
  els.assistantInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') els.assistantSend.click(); });
  document.querySelectorAll('.hint-card').forEach((card) => card.addEventListener('click', () => {
    els.assistantInput.value = card.dataset.prompt || card.textContent;
    els.assistantSend.click();
  }));
}

async function init() {
  bindEvents();
  const initialTab = document.body.dataset.initialTab || 'tables';
  openTab(initialTab);
  state.previewLimit = Number(els.previewPageSize.value) || 50;
  await Promise.allSettled([refreshAssistantStatus(), loadTables()]);
}

init().catch((error) => {
  console.error(error);
  setStatus(`Ошибка инициализации: ${error.message}`);
});
