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
  currentSort: null,
};

const byId = (id) => document.getElementById(id);
const byAny = (...ids) => ids.map((id) => document.getElementById(id)).find(Boolean) || null;
const els = {
  tablesGrid: byAny('tablesGrid', 'tablesList'),
  selectedTableBox: byAny('selectedTableBox'),
  selectedTableName: byAny('selectedTableName', 'activeTableTitle'),
  tableDropdown: byAny('tableDropdown'),
  statusText: byAny('statusText', 'uploadStatus'),
  uploadInput: byAny('uploadInput', 'fileInput'),
  refreshTablesBtn: byAny('refreshTablesBtn'),
  assistantHealthBadge: byAny('assistantHealthBadge', 'assistantStatus'),
  miniDashboards: byAny('miniDashboards'),
  openDashboardBtn: byAny('openDashboardBtn'),
  bigChartTitle: byAny('bigChartTitle'),
  bigChartMeta: byAny('bigChartMeta'),
  bigLineChart: byAny('bigLineChart'),
  dashboardKpis: byAny('dashboardKpis'),
  donutChart: byAny('donutChart'),
  donutLegend: byAny('donutLegend'),
  barChartTitle: byAny('barChartTitle'),
  barChartMeta: byAny('barChartMeta'),
  trendBars: byAny('trendBars'),
  trendAxis: byAny('trendAxis'),
  presetList: byAny('presetList', 'dashboardCards'),
  previewTitle: byAny('previewTitle'),
  previewMeta: byAny('previewMeta'),
  dataTable: byAny('dataTable'),
  previewWrap: byAny('previewWrap', 'previewTableWrap'),
  pageInfo: byAny('pageInfo'),
  prevPageBtn: byAny('prevPageBtn'),
  nextPageBtn: byAny('nextPageBtn'),
  previewSearch: byAny('previewSearch'),
  previewPageSize: byAny('previewPageSize'),
  gotoPageInput: byAny('gotoPageInput'),
  gotoPageBtn: byAny('gotoPageBtn'),
  gotoCellInput: byAny('gotoCellInput'),
  gotoCellBtn: byAny('gotoCellBtn'),
  reloadPreviewBtn: byAny('reloadPreviewBtn'),
  sortColumn: byAny('sortColumn'),
  sortDirection: byAny('sortDirection'),
  sortBtn: byAny('sortBtn'),
  addRowBtn: byAny('addRowBtn'),
  deleteTableBtn: byAny('deleteTableBtn'),
  sortResult: byAny('sortResult'),
  sortDownloadSlot: byAny('sortDownloadSlot'),
  statsColumn: byAny('statsColumn'),
  statsBtn: byAny('statsBtn'),
  quickQuestion: byAny('quickQuestion'),
  quickSend: byAny('quickSend'),
  assistantLog: byAny('dashboardAssistantLog', 'assistantLog'),
  assistantInput: byAny('dashboardAssistantInput', 'assistantInput'),
  assistantSend: byAny('dashboardAssistantSend', 'assistantSend'),
  useOllama: byAny('useOllama'),
  backToTablesBtn: byAny('backToTablesBtn'),
  changeTableBtn: byAny('changeTableBtn'),
  uploadOverlay: byAny('uploadOverlay'),
  uploadOverlayText: byAny('uploadOverlayText'),
};
function on(el, event, handler) { if (el) el.addEventListener(event, handler); }

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
function showUploadOverlay(filename) {
  if (!els.uploadOverlay) return;
  els.uploadOverlay.classList.remove('hidden');
  if (els.uploadOverlayText) {
    els.uploadOverlayText.textContent = filename ? `Загрузка: ${filename}` : 'Загрузка таблицы…';
  }
}
function hideUploadOverlay() {
  if (els.uploadOverlay) els.uploadOverlay.classList.add('hidden');
}


function showUploadOverlay(filename) {
  if (!els.uploadOverlay) return;
  els.uploadOverlay.classList.remove('hidden');
  if (els.uploadOverlayText) {
    els.uploadOverlayText.textContent = filename ? `Загрузка: ${filename}` : 'Загрузка таблицы…';
  }
}

function hideUploadOverlay() {
  if (!els.uploadOverlay) return;
  els.uploadOverlay.classList.add('hidden');
}


function addMessage(text, who = 'bot') {
  const message = document.createElement('div');
  message.className = `message ${who}`;
  message.textContent = text;
  els.assistantLog.appendChild(message);
  els.assistantLog.scrollTop = els.assistantLog.scrollHeight;
  return message;
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


function translateStatsLines(text) {
  return String(text)
    .replaceAll('count', 'Количество')
    .replaceAll('first', 'Первое значение')
    .replaceAll('int_sum', 'Сумма (целая)')
    .replaceAll('last', 'Последнее значение')
    .replaceAll('max', 'Максимум')
    .replaceAll('mean', 'Среднее')
    .replaceAll('median', 'Медиана')
    .replaceAll('min', 'Минимум')
    .replaceAll('std_sample', 'Стд. отклонение')
    .replaceAll('sum', 'Сумма')
    .replaceAll('unique_count', 'Уникальных');
}

function initialLetters(name = '') {
  return name.replace(/\.[^.]+$/, '').trim().slice(0, 2).toUpperCase() || 'TB';
}

function renderTablesGrid() {
  const tables = state.tables;
  if (!els.tablesGrid) return;
  els.tablesGrid.innerHTML = '';

  const isGrid = els.tablesGrid.id === 'tablesGrid';
  if (isGrid) {
    const uploadCard = document.createElement('div');
    uploadCard.className = 'table-card upload-card';
    uploadCard.innerHTML = `
      <div class="table-preview">
        <div class="upload-icon">↑</div>
        <div>Загрузить таблицу</div>
      </div>
      <div class="table-meta"><span>CSV / XLSX / TSV / Parquet</span><span class="chev"></span></div>`;
    uploadCard.addEventListener('click', () => els.uploadInput && els.uploadInput.click());
    els.tablesGrid.appendChild(uploadCard);
  }

  if (!tables.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Пока нет загруженных таблиц. Добавь файл, и интерфейс построит обзор автоматически.';
    els.tablesGrid.appendChild(empty);
    return;
  }

  tables.forEach((table) => {
    const card = document.createElement('div');
    card.className = `${isGrid ? 'table-card' : 'table-item'} ${table.table_id === state.activeTableId ? 'active' : ''}`;
    if (isGrid) {
      card.innerHTML = `
        <div class="table-preview"><div class="file-mark">${escapeHtml(initialLetters(table.name))}</div></div>
        <div class="table-meta">
          <div>
            <span>${escapeHtml(table.name)}</span>
            <small>${escapeHtml(`${table.rows} строк · ${table.columns} колонок`)}</small>
          </div>
          <span class="chev"></span>
        </div>`;
    } else {
      card.innerHTML = `<strong>${escapeHtml(table.name)}</strong><div class="muted">${escapeHtml(`${table.rows} строк · ${table.columns} колонок`)}</div>`;
    }
    card.addEventListener('click', () => selectTable(table.table_id));
    els.tablesGrid.appendChild(card);
  });
}

function renderDropdown() {
  if (!els.tableDropdown) return;
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
    if (!els.dashboardKpis) return;
  els.dashboardKpis.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Здесь появятся KPI после выбора таблицы.</div>`;
    return;
  }
  const groups = state.columnGroups;
  const kpis = [
    { label: 'Активная таблица', value: state.activeTable.name, compact: true },
    { label: 'Размер файла', value: `${Math.max(1, Math.round((state.activeTable.file_size || 0) / 1024))} KB` },
    { label: 'Дата/время колонки', value: formatNumber(groups.datetime?.length || 0) },
    { label: 'AI режим', value: state.assistantStatus?.ok ? 'Готово' : 'Готово' },
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
  if (!els.donutChart || !els.donutLegend) return;
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
    if (!els.trendBars || !els.trendAxis || !els.bigLineChart || !els.barChartTitle || !els.barChartMeta || !els.bigChartTitle || !els.bigChartMeta) return;
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
      <div class="helper-card"><strong>Готово к интеграции</strong>Карточки появятся автоматически после выбора таблицы.</div>
    </div>`;
    return;
  }
  els.presetList.innerHTML = state.dashboardCards.map((card, index) => `
    <div class="preset-card">
      <h4>${escapeHtml(card.title || `Карточка ${index + 1}`)}</h4>
      <p>${escapeHtml(card.type === 'bar' ? 'Графическая карточка, собранная автоматически.' : 'Статистическая карточка, собранная автоматически.')}</p>
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
    els.barChartMeta.textContent = 'аналитическая карточка';
    els.trendBars.innerHTML = values.map((value) => `<div class="bar-col"><div class="bar-value">${escapeHtml(formatNumber(value))}</div><div class="bar-rect" style="height:${Math.max(8, Math.round((value / max) * 180))}px"></div></div>`).join('');
    els.trendAxis.innerHTML = card.payload.labels.map((label) => `<div>${escapeHtml(label)}</div>`).join('');
  }
  if (card.type === 'stats' && card.payload) {
    const statLines = Object.entries(card.payload).slice(0, 6).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v ?? '—'}`).join('\n');
    const msg = addMessage(`Открыта карточка «${card.title}».\n${translateStatsLines(statLines)}`, 'bot'); if (msg) msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    const msg = addMessage(`Открыта карточка «${card.title}».`, 'bot');
    if (msg) msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  if (state.currentSort?.column) {
    params.set('sort_column', state.currentSort.column);
    params.set('sort_direction', state.currentSort.ascending ? 'asc' : 'desc');
  }
  const data = await fetchJSON(`/api/table/${state.activeTableId}/preview?${params.toString()}`);
  state.previewTotal = data.total_rows;
  renderTable(data.rows || []);
  const start = data.total_rows ? data.offset + 1 : 0;
  const end = Math.min(data.offset + data.limit, data.total_rows);
  els.pageInfo.textContent = `${start}-${end} из ${data.total_rows}`;
  const sortLabel = state.currentSort?.column ? `Сортировка: ${state.currentSort.column} (${state.currentSort.ascending ? '↑' : '↓'})` : '';
  if (state.previewQuery && sortLabel) els.previewMeta.textContent = `Фильтр: ${state.previewQuery} · ${sortLabel}`;
  else if (state.previewQuery) els.previewMeta.textContent = `Фильтр: ${state.previewQuery}`;
  else if (sortLabel) els.previewMeta.textContent = sortLabel;
  else els.previewMeta.textContent = 'редактируемые строки активной таблицы';
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
    if (els.assistantHealthBadge) els.assistantHealthBadge.textContent = data.ok ? `${data.model_present ? 'Готово' : 'Готово'}` : 'fallback';
  } catch (error) {
    state.assistantStatus = { ok: false, error: error.message };
    if (els.assistantHealthBadge) els.assistantHealthBadge.textContent = 'fallback';
  }
  renderKpis();
}

async function sendAssistantQuestion(text) {
  if (!text.trim()) return;
  addMessage(text, 'user');
  const typing = addTypingMessage();
  try {
    const data = await fetchJSON('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: state.activeTableId,
        question: text.trim(),
        use_ollama: Boolean(els.useOllama?.checked),
      }),
    });
    if (typing) typing.remove();
    const msg = addMessage(`${data.answer}`, 'bot');
    if (msg) msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    if (typing) typing.remove();
    addMessage(`Ошибка ИИ: ${error.message}`, 'bot');
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
  if (els.selectedTableName) els.selectedTableName.textContent = 'Выбери таблицу';
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
  if (els.selectedTableName) els.selectedTableName.textContent = details.table.name;
  const titleEl = byAny('activeTableTitle');
  if (titleEl) titleEl.textContent = details.table.name;
  fillSelect(els.sortColumn, details.table.column_names || [], 'Нет колонок');
  fillSelect(els.statsColumn, details.table.column_names || [], 'Нет колонок');
  renderTablesGrid();
  renderDropdown();
  renderMiniDashboards();
  renderKpis();
  renderDonut();
  setStatus(`Активная таблица: ${details.table.name}. Всё готово к работе.`);
  await Promise.all([renderPreview(), renderDashboardCards()]);
}

async function selectTable(tableId, resetView = true) {
  state.activeTableId = tableId;
  saveActiveTableId();
  if (resetView) {
    state.previewOffset = 0;
    state.previewQuery = '';
    state.currentSort = null;
    if (els.previewSearch) els.previewSearch.value = '';
    if (els.sortResult) els.sortResult.textContent = '';
    if (els.sortDownloadSlot) els.sortDownloadSlot.innerHTML = '';
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
  showUploadOverlay(file.name);
  setStatus(`Загрузка: ${file.name}`);
  try {
    const data = await uploadFile(file);
    await loadTables();
    if (data.table?.table_id) await selectTable(data.table.table_id);
    setStatus(`Файл «${file.name}» загружен.`);
  } catch (error) {
    setStatus(`Ошибка загрузки: ${error.message}`);
  } finally {
    hideUploadOverlay();
    els.uploadInput.value = '';
  }
}

async function handleSort() {
  if (!state.activeTableId || !els.sortColumn || !els.sortColumn.value) return;
  if (els.sortResult) els.sortResult.textContent = 'Сортирую…';
  try {
    const ascending = els.sortDirection.value === 'asc';
    const data = await fetchJSON(`/api/table/${state.activeTableId}/sort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column: els.sortColumn.value, ascending }),
    });
    state.currentSort = { column: els.sortColumn.value, ascending };
    state.previewOffset = 0;
    if (els.sortResult) els.sortResult.textContent = `${data.message || 'Сортировка готова.'} Источник: ${data.source || 'неизвестно'}.`;
    if (els.sortDownloadSlot) els.sortDownloadSlot.innerHTML = '';
    await renderPreview();
  } catch (error) {
    if (els.sortResult) els.sortResult.textContent = `Ошибка сортировки: ${error.message}`;
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
  const rowId = rowNumber - 1;
  state.highlightedCell = { rowId, column };
  const page = Math.max(0, Math.floor(rowId / state.previewLimit));
  state.previewOffset = page * state.previewLimit;
  renderPreview().catch((error) => setStatus(`Не удалось перейти к ячейке: ${error.message}`));
}


function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach((button) => button.addEventListener('click', () => openTab(button.dataset.tab)));
  on(els.selectedTableBox, 'click', () => els.tableDropdown && els.tableDropdown.classList.toggle('hidden'));
  document.addEventListener('click', (event) => {
    if (els.tableDropdown && els.selectedTableBox && !els.tableDropdown.contains(event.target) && !els.selectedTableBox.contains(event.target)) {
      els.tableDropdown.classList.add('hidden');
    }
  });
  on(els.uploadInput, 'change', handleUpload);
  on(els.refreshTablesBtn, 'click', () => loadTables().catch((error) => setStatus(error.message)));
  on(els.openDashboardBtn, 'click', () => openTab('dashboards'));
  on(els.backToTablesBtn, 'click', () => openTab('tables'));
  on(els.changeTableBtn, 'click', () => { openTab('tables'); if (els.tableDropdown) els.tableDropdown.classList.remove('hidden'); });
  on(els.previewSearch, 'keydown', (event) => {
    if (event.key === 'Enter') {
      state.previewQuery = els.previewSearch.value.trim();
      state.previewOffset = 0;
      renderPreview().catch((error) => setStatus(error.message));
    }
  });
  on(els.previewPageSize, 'change', () => {
    state.previewLimit = Number(els.previewPageSize.value) || 50;
    state.previewOffset = 0;
    renderPreview().catch((error) => setStatus(error.message));
  });
  on(els.gotoPageBtn, 'click', () => {
    const page = Math.max(1, Number(els.gotoPageInput?.value) || 1);
    state.previewOffset = (page - 1) * state.previewLimit;
    renderPreview().catch((error) => setStatus(error.message));
  });
  on(els.gotoCellBtn, 'click', handleGoToCell);
  on(els.reloadPreviewBtn, 'click', () => refreshActiveTable().catch((error) => setStatus(error.message)));
  on(els.prevPageBtn, 'click', () => {
    state.previewOffset = Math.max(0, state.previewOffset - state.previewLimit);
    renderPreview().catch((error) => setStatus(error.message));
  });
  on(els.nextPageBtn, 'click', () => {
    state.previewOffset += state.previewLimit;
    renderPreview().catch((error) => setStatus(error.message));
  });
  on(els.sortBtn, 'click', handleSort);
  on(els.addRowBtn, 'click', handleAddRow);
  on(els.statsBtn, 'click', () => renderStats().catch((error) => addMessage(`Ошибка статистики: ${error.message}`, 'bot')));
  on(els.quickSend, 'click', () => {
    const text = els.quickQuestion?.value?.trim();
    if (!text) return;
    openTab('dashboards');
    sendAssistantQuestion(text);
    els.quickQuestion.value = '';
  });
  on(els.quickQuestion, 'keydown', (event) => { if (event.key === 'Enter' && els.quickSend) els.quickSend.click(); });
  on(els.assistantSend, 'click', () => {
    const text = els.assistantInput?.value?.trim();
    if (!text) return;
    sendAssistantQuestion(text);
    els.assistantInput.value = '';
  });
  on(els.assistantInput, 'keydown', (event) => { if (event.key === 'Enter' && els.assistantSend) els.assistantSend.click(); });
  document.querySelectorAll('.hint-card').forEach((card) => card.addEventListener('click', () => {
    if (els.assistantInput) els.assistantInput.value = card.dataset.prompt || card.textContent;
    if (els.assistantSend) els.assistantSend.click();
  }));
}
async function init() {
  bindEvents();
  const initialTab = document.body.dataset.initialTab || (document.body.dataset.page === 'dashboards' ? 'dashboards' : 'tables');
  openTab(initialTab);
  state.previewLimit = Number(els.previewPageSize?.value || 50) || 50;
  await Promise.allSettled([refreshAssistantStatus(), loadTables()]);
}

init().catch((error) => {
  console.error(error);
  setStatus(`Ошибка инициализации: ${error.message}`);
});
