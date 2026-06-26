const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isNetlifyDev = isLocalHost && window.location.port === '8888';
const useLocalExpressApi = isLocalHost && !isNetlifyDev;
const API_URL = useLocalExpressApi ? '/api/chat' : '/.netlify/functions/chat';
const CHAT_STATUS_URL = useLocalExpressApi ? '/api/chat/status' : '/.netlify/functions/chat-status';
const GEOCODE_URL = useLocalExpressApi ? '/api/geocode' : '/.netlify/functions/geocode';

const map = L.map('map', {
  preferCanvas: true
}).setView([-21.76, -43.35], 11);

const streetsBase = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

const lightBase = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap &copy; CARTO'
});

const topoBase = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: '&copy; OpenStreetMap &copy; OpenTopoMap'
});

const satelliteImagery = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  }
);

const satelliteLabels = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Labels &copy; Esri'
  }
);

const satelliteBase = L.layerGroup([satelliteImagery, satelliteLabels]);

const baseLayers = {
  'OpenStreetMap': streetsBase,
  'Esri World Imagery + Labels': satelliteBase,
  'OpenTopoMap': topoBase,
  'CARTO Positron': lightBase
};

let activeBaseLayer = streetsBase;

function setBaseLayer(layer) {
  if (activeBaseLayer === layer) return;
  map.removeLayer(activeBaseLayer);
  activeBaseLayer = layer;
  activeBaseLayer.addTo(map);
}

function addBasemapControl() {
  const basemapControl = L.control({ position: 'topleft' });

  basemapControl.onAdd = () => {
    const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar basemap-control');
    const select = L.DomUtil.create('select', 'basemap-select', container);

    Object.keys(baseLayers).forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      setBaseLayer(baseLayers[select.value]);
    });

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
  };

  basemapControl.addTo(map);
}

const overlayLayers = {};
const chatContainer = document.getElementById('chatContainer');
const chatToggle = document.getElementById('chatToggle');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const addressInput = document.getElementById('addressInput');
const addressButton = document.getElementById('addressButton');
const searchStatus = document.getElementById('searchStatus');
const apiStatus = document.getElementById('apiStatus');
const selectionEmpty = document.getElementById('selectionEmpty');
const selectionDetails = document.getElementById('selectionDetails');
const slopeDot = document.getElementById('slopeDot');
const slopeValue = document.getElementById('slopeValue');
const slopeLabelElement = document.getElementById('slopeLabel');
const selectionCoords = document.getElementById('selectionCoords');
const conversation = [];

let selectedContext = '';
let slopeIndex = [];
let addressMarker = null;

addressButton.disabled = true;
setSearchStatus('Carregando dados para busca...');

const layerConfigs = [
  {
    name: 'Declividade',
    file: 'data/declividade.geojson',
    defaultVisible: false,
    queryOnly: true,
    style: (feature) => {
      const value = Number(feature.properties?.declividade || 0);
      return {
        color: slopeColor(value),
        fillColor: slopeColor(value),
        weight: 0.4,
        fillOpacity: 0.45
      };
    },
    popup: (props) => `
      <h4>Declividade</h4>
      <p><strong>Valor:</strong> ${props.declividade ?? 'N/I'}%</p>
      <p><strong>Classificacao:</strong> ${slopeLabel(Number(props.declividade || 0))}</p>
    `
  },
  {
    name: 'Risco geologico',
    file: 'data/mapeamento_risco_geologico_poligono.geojson',
    defaultVisible: true,
    style: (feature) => riskStyle(feature.properties?.Risco, 'geologico'),
    popup: riskPopup
  },
  {
    name: 'Risco hidrologico',
    file: 'data/mapeamento_risco_hidrologico.geojson',
    defaultVisible: true,
    style: (feature) => riskStyle(feature.properties?.Risco, 'hidrologico'),
    popup: riskPopup
  },
  {
    name: 'Setores CPRM',
    file: 'data/setores_perigo_cprm.geojson',
    defaultVisible: false,
    style: () => ({
      color: '#8e44ad',
      weight: 3,
      dashArray: '6 4',
      fillOpacity: 0.1
    }),
    popup: riskPopup
  }
];

function slopeColor(value) {
  if (value <= 10) return '#2ecc71';
  if (value <= 20) return '#f1c40f';
  if (value <= 30) return '#e67e22';
  return '#e74c3c';
}

function slopeLabel(value) {
  if (value <= 10) return 'Baixo risco';
  if (value <= 20) return 'Medio risco';
  if (value <= 30) return 'Alto risco';
  return 'Muito alto risco';
}

function riskStyle(risk, type) {
  const geological = {
    R1: '#2ecc71',
    R2: '#f1c40f',
    R3: '#e67e22',
    R4: '#e74c3c'
  };
  const hydrological = {
    R1: '#85c1e9',
    R2: '#3498db',
    R3: '#21618c',
    R4: '#154360'
  };
  const palette = type === 'hidrologico' ? hydrological : geological;
  const color = palette[String(risk || '').trim()] || '#7f8c8d';

  return {
    color,
    fillColor: color,
    weight: 1.5,
    fillOpacity: 0.35
  };
}

function boundsFromGeometry(geometry) {
  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity
  };

  function visit(coords) {
    if (typeof coords[0] === 'number') {
      const lng = coords[0];
      const lat = coords[1];
      bounds.minLng = Math.min(bounds.minLng, lng);
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLng = Math.max(bounds.maxLng, lng);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
      return;
    }

    coords.forEach(visit);
  }

  visit(geometry.coordinates);
  return bounds;
}

function pointInRing(point, ring) {
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false;

  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(point, polygon[i])) return false;
  }

  return true;
}

function pointInFeature(point, feature) {
  const geometry = feature.geometry;
  if (!geometry) return false;

  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }

  return false;
}

function buildSlopeIndex(data) {
  slopeIndex = (data.features || []).map((feature) => ({
    feature,
    bounds: boundsFromGeometry(feature.geometry)
  }));
}

function findSlopeAt(latlng) {
  const point = { lat: latlng.lat, lng: latlng.lng };

  for (const item of slopeIndex) {
    const bounds = item.bounds;
    if (
      point.lng < bounds.minLng ||
      point.lng > bounds.maxLng ||
      point.lat < bounds.minLat ||
      point.lat > bounds.maxLat
    ) {
      continue;
    }

    if (pointInFeature(point, item.feature)) {
      return item.feature.properties;
    }
  }

  return null;
}

function updateSelectionPanel(latlng, slopeProps) {
  selectionEmpty.hidden = true;
  selectionDetails.hidden = false;
  selectionCoords.textContent = `Lat ${latlng.lat.toFixed(6)}, Lng ${latlng.lng.toFixed(6)}`;

  if (!slopeProps) {
    slopeDot.style.background = '#7f8c8d';
    slopeValue.textContent = 'Sem dado';
    slopeLabelElement.textContent = 'Nenhuma celula de declividade encontrada neste ponto.';
    return;
  }

  const value = Number(slopeProps.declividade || 0);
  slopeDot.style.background = slopeColor(value);
  slopeValue.textContent = `${value}%`;
  slopeLabelElement.textContent = slopeLabel(value);
}

function setSelectedPoint(latlng, sourceLabel) {
  const slopeProps = findSlopeAt(latlng);
  updateSelectionPanel(latlng, slopeProps);

  if (addressMarker) {
    addressMarker.setLatLng(latlng);
  } else {
    addressMarker = L.marker(latlng).addTo(map);
  }

  if (sourceLabel) {
    addressMarker.bindPopup(sourceLabel).openPopup();
  }

  selectedContext = `Local selecionado: ${sourceLabel || 'ponto no mapa'}. Coordenadas: latitude ${latlng.lat.toFixed(6)}, longitude ${latlng.lng.toFixed(6)}.`;

  if (slopeProps) {
    selectedContext += ` Declividade: ${slopeProps.declividade}%. Classificacao: ${slopeLabel(Number(slopeProps.declividade || 0))}.`;
  } else {
    selectedContext += ' Sem dado de declividade para este ponto.';
  }
}

function setSearchStatus(message, isError = false) {
  searchStatus.textContent = message;
  searchStatus.style.color = isError ? '#e74c3c' : '#6c757d';
}

async function searchAddress() {
  const query = addressInput.value.trim();
  if (!query) {
    setSearchStatus('Digite um endereço para buscar.', true);
    return;
  }

  addressButton.disabled = true;
  setSearchStatus('Buscando endereço...');

  try {
    const response = await fetch(`${GEOCODE_URL}?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Não foi possível buscar o endereço.');
    }

    if (!data.results.length) {
      setSearchStatus('Nenhum endereço encontrado.', true);
      return;
    }

    const result = data.results[0];
    const latlng = L.latLng(result.lat, result.lng);
    map.setView(latlng, 17);
    setSelectedPoint(latlng, result.name);
    setSearchStatus(result.name);
  } catch (error) {
    console.error(error);
    setSearchStatus(error.message || 'Erro ao buscar endereço.', true);
  } finally {
    addressButton.disabled = false;
  }
}

async function checkChatStatus() {
  apiStatus.textContent = '...';
  apiStatus.classList.remove('online', 'offline');
  apiStatus.classList.add('checking');

  try {
    const response = await fetch(CHAT_STATUS_URL);
    const data = await readApiResponse(response);

    if (!response.ok || !data.success) {
      throw new Error(getApiErrorMessage(response, data));
    }

    apiStatus.textContent = 'ON';
    apiStatus.title = data.message || 'API do chatbot operacional';
    apiStatus.classList.remove('checking', 'offline');
    apiStatus.classList.add('online');
  } catch (error) {
    apiStatus.textContent = 'OFF';
    apiStatus.title = error.message || 'API do chatbot indisponível';
    apiStatus.classList.remove('checking', 'online');
    apiStatus.classList.add('offline');
  }
}

async function readApiResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    return {
      success: false,
      error: 'Resposta invalida da API',
      details: text ? text.slice(0, 180) : error.message
    };
  }
}

function getApiErrorMessage(response, data = {}) {
  if (response.status === 404) {
    return 'As Netlify Functions nao foram publicadas. Confira se o deploy foi feito pelo GitHub/Netlify com o arquivo netlify.toml, e nao apenas pela pasta dist.';
  }

  if (response.status === 401 || response.status === 403) {
    return 'A DeepSeek recusou a chave da API. Confira a variavel DEEPSEEK_API_KEY no Netlify.';
  }

  if (data.error && data.error.includes('DEEPSEEK_API_KEY')) {
    return 'A chave DEEPSEEK_API_KEY nao esta configurada nas variaveis de ambiente do Netlify.';
  }

  return data.details || data.message || data.error || `API indisponivel. Codigo HTTP ${response.status}.`;
}

function clean(value) {
  if (value === undefined || value === null || value === '') return 'N/I';
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function riskPopup(props) {
  const setor = props.Nome_setor || props.Setor || props.fid;
  return `
    <h4>Area de risco</h4>
    <p><strong>Setor:</strong> ${clean(setor)}</p>
    <p><strong>Bairro:</strong> ${clean(props.Bairro)}</p>
    <p><strong>Regiao:</strong> ${clean(props.Regiao)}</p>
    <p><strong>Risco:</strong> ${clean(props.Risco)}</p>
    <p><strong>Perigo:</strong> ${clean(props.Perigo)}</p>
    <p><strong>Processo:</strong> ${clean(props.Processo)}</p>
    <p><strong>Populacao:</strong> ${clean(props.Populacao)}</p>
    <p><strong>Observacao:</strong> ${clean(props.Obs || props.Observacao)}</p>
  `;
}

function contextFromFeature(layerName, props) {
  if (props.declividade !== undefined) {
    return `Camada: ${layerName}. Declividade: ${props.declividade}%. Classificacao: ${slopeLabel(Number(props.declividade || 0))}.`;
  }

  return [
    `Camada: ${layerName}`,
    `Setor: ${clean(props.Nome_setor || props.Setor || props.fid)}`,
    `Bairro: ${clean(props.Bairro)}`,
    `Regiao: ${clean(props.Regiao)}`,
    `Risco: ${clean(props.Risco)}`,
    `Perigo: ${clean(props.Perigo)}`,
    `Processo: ${clean(props.Processo)}`,
    `Populacao: ${clean(props.Populacao)}`,
    `Observacao: ${clean(props.Obs || props.Observacao)}`
  ].join('. ');
}

async function loadLayer(config) {
  const response = await fetch(config.file);
  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar ${config.file}`);
  }

  const data = await response.json();
  if (config.name === 'Declividade') {
    buildSlopeIndex(data);
  }

  if (config.queryOnly) {
    return null;
  }

  const layer = L.geoJSON(data, {
    style: config.style,
    renderer: L.canvas({ padding: 0.5 }),
    onEachFeature: (feature, itemLayer) => {
      const props = feature.properties || {};
      itemLayer.bindPopup(config.popup(props));
      itemLayer.on('click', (event) => {
        L.DomEvent.stopPropagation(event.originalEvent);
        const slopeProps = findSlopeAt(event.latlng);
        updateSelectionPanel(event.latlng, slopeProps);
        selectedContext = contextFromFeature(config.name, props);

        if (slopeProps) {
          selectedContext += ` Coordenadas: latitude ${event.latlng.lat.toFixed(6)}, longitude ${event.latlng.lng.toFixed(6)}. Declividade: ${slopeProps.declividade}%. Classificacao: ${slopeLabel(Number(slopeProps.declividade || 0))}.`;
        } else {
          selectedContext += ` Coordenadas: latitude ${event.latlng.lat.toFixed(6)}, longitude ${event.latlng.lng.toFixed(6)}. Sem dado de declividade para este ponto.`;
        }
      });
    }
  });

  overlayLayers[config.name] = layer;
  if (config.defaultVisible) layer.addTo(map);
  return layer;
}

async function initializeLayers() {
  const loaded = [];
  const displayConfigs = layerConfigs.filter((config) => !config.queryOnly);
  const queryConfigs = layerConfigs.filter((config) => config.queryOnly);

  for (const config of displayConfigs) {
    try {
      const layer = await loadLayer(config);
      if (layer) loaded.push({ layer, config });
    } catch (error) {
      console.error(error);
      addMessage('bot', `Nao consegui carregar a camada "${config.name}". Verifique se o arquivo existe em ${config.file}.`);
    }
  }

  L.control.layers(null, overlayLayers, {
    collapsed: false,
    position: 'topright'
  }).addTo(map);

  addBasemapControl();

  const visibleLayers = loaded
    .filter((item) => item.config.defaultVisible)
    .map((item) => item.layer);
  const group = L.featureGroup(visibleLayers);
  if (group.getLayers().length) {
    map.fitBounds(group.getBounds(), { padding: [20, 20] });
  }

  addressButton.disabled = false;
  setSearchStatus('Dados de risco carregados. Declividade carregando para consulta...');

  for (const config of queryConfigs) {
    try {
      await loadLayer(config);
      setSearchStatus('');
    } catch (error) {
      console.error(error);
      setSearchStatus('Camadas de risco carregadas. Não foi possível carregar a declividade para consulta.', true);
    }
  }
}

function addMessage(type, text) {
  const message = document.createElement('div');
  message.className = `message ${type}-message`;

  const content = document.createElement('div');
  content.className = 'message-content';

  if (type === 'bot') {
    content.innerHTML = renderMarkdown(text);
  } else {
    content.textContent = text;
  }

  message.appendChild(content);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const message = document.createElement('div');
  message.className = 'message bot-message typing-message';
  message.setAttribute('aria-live', 'polite');

  const content = document.createElement('div');
  content.className = 'message-content typing-content';
  content.innerHTML = `
    <span class="typing-label">Assistente digitando</span>
    <span class="typing-dots" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </span>
  `;

  message.appendChild(content);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

function removeTypingIndicator(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*\s*([^*]+?)\s*\*\*/g, '<strong>$1</strong>')
    .replace(/\*\s*([^*]+?)\s*\*/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>');
}

function renderMarkdown(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const html = [];
  let listOpen = false;

  function closeList() {
    if (listOpen) {
      html.push('</ul>');
      listOpen = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length + 3;
      html.push(`<h${level}>${formatInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li>${formatInlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${formatInlineMarkdown(line)}</p>`);
  }

  closeList();
  return html.join('');
}

function openChat() {
  chatContainer.classList.add('open');
  chatContainer.setAttribute('aria-hidden', 'false');
  chatToggle.title = 'Fechar assistente';
  setTimeout(() => userInput.focus(), 150);
}

function closeChat() {
  chatContainer.classList.remove('open');
  chatContainer.setAttribute('aria-hidden', 'true');
  chatToggle.title = 'Abrir assistente';
}

function toggleChat() {
  if (chatContainer.classList.contains('open')) {
    closeChat();
  } else {
    openChat();
  }
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage('user', text);
  conversation.push({ role: 'user', content: text });
  userInput.value = '';
  userInput.style.height = 'auto';
  sendButton.disabled = true;
  const typingIndicator = showTypingIndicator();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversation.slice(-12),
        context: selectedContext
      })
    });

    const data = await readApiResponse(response);
    if (!response.ok || !data.success) {
      throw new Error(getApiErrorMessage(response, data));
    }

    removeTypingIndicator(typingIndicator);
    addMessage('bot', data.message);
    conversation.push({ role: 'assistant', content: data.message });
  } catch (error) {
    console.error(error);
    removeTypingIndicator(typingIndicator);
    addMessage('bot', `Nao consegui consultar a IA agora. ${error.message}`);
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
}

function askSuggestion(question) {
  openChat();
  userInput.value = question;
  sendMessage();
}

window.askSuggestion = askSuggestion;

chatToggle.addEventListener('click', toggleChat);
chatClose.addEventListener('click', closeChat);
sendButton.addEventListener('click', sendMessage);
addressButton.addEventListener('click', searchAddress);
addressInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchAddress();
  }
});
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = `${userInput.scrollHeight}px`;
});
userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

map.on('click', (event) => {
  setSelectedPoint(event.latlng, 'Ponto selecionado no mapa');
});

initializeLayers();
checkChatStatus();
