import type { Billboard, BillboardSide } from '../lib/billboards';
import { withViewTransition } from './view-transition';
import routes from '../data/routes.json';

declare const mapboxgl: any;

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

const CENTER: [number, number] = [24.6781501, 48.7697548];
const RADIUS_KM = 200;

const BILLBOARD_ICON = `
  <svg viewBox="0 0 320 400" fill="none" aria-hidden="true">
    <rect x="148" y="250" width="24" height="130" rx="4" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-opacity="0.35" stroke-width="4"/>
    <line x1="120" y1="250" x2="148" y2="285" stroke="currentColor" stroke-opacity="0.25" stroke-width="5"/>
    <line x1="200" y1="250" x2="172" y2="285" stroke="currentColor" stroke-opacity="0.25" stroke-width="5"/>
    <rect x="30" y="40" width="260" height="210" rx="8" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-opacity="0.45" stroke-width="5"/>
    <circle cx="100" cy="38" r="8" fill="currentColor"/>
    <circle cx="160" cy="38" r="8" fill="currentColor"/>
    <circle cx="220" cy="38" r="8" fill="currentColor"/>
  </svg>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function computeBounds(
  center: [number, number],
  radiusKm: number,
): [[number, number], [number, number]] {
  const latOffset = radiusKm / 111.32;
  const lngOffset = radiusKm / (111.32 * Math.cos(center[1] * (Math.PI / 180)));
  return [
    [center[0] - lngOffset, center[1] - latOffset],
    [center[0] + lngOffset, center[1] + latOffset],
  ];
}

function buildPhotoHTML(b: Billboard, side: BillboardSide): string {
  if (!side.photo) {
    return `
      <div class="popup-photo popup-photo--stub">
        <span class="popup-stub-icon">${BILLBOARD_ICON}</span>
        <span class="popup-stub-text">Фото незабаром</span>
      </div>`;
  }

  const caption = escapeHtml(`${b.description} — ${side.label}`);
  return `
    <button type="button" class="popup-photo" data-full="${side.photo.full}" data-caption="${caption}" aria-label="Відкрити фото: ${caption}">
      <img src="${side.photo.src}" alt="${caption}" width="${side.photo.width}" height="${side.photo.height}" loading="lazy" decoding="async" />
      <span class="popup-zoom" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
    </button>`;
}

function buildPopupHTML(b: Billboard): string {
  const coordsUrl = `https://www.google.com/maps/?q=${b.coordinates[1]},${b.coordinates[0]}`;

  const tabs =
    b.sides.length > 1
      ? `<div class="popup-tabs" role="tablist">
          ${b.sides
            .map(
              (side, i) => `
            <button type="button" role="tab" class="popup-tab${i === 0 ? ' is-active' : ''}" data-side="${i}" aria-selected="${i === 0}">
              ${escapeHtml(side.label)}
            </button>`,
            )
            .join('')}
        </div>`
      : '';

  const panes = b.sides
    .map((side, i) => {
      const months = side.availability
        .map(
          (a) =>
            `<span class="popup-month ${a.status === 'Free' ? 'free' : 'busy'}" title="${a.month}: ${a.status === 'Free' ? 'вільно' : 'зайнято'}">${a.month.slice(0, 3)}</span>`,
        )
        .join('');

      return `
        <div class="popup-pane" data-pane="${i}"${i === 0 ? '' : ' hidden'}>
          ${buildPhotoHTML(b, side)}
          <div class="popup-months-head">
            <span>Доступність</span>
            <span class="popup-months-key"><i class="key-free"></i>вільно <i class="key-busy"></i>зайнято</span>
          </div>
          <div class="popup-months">${months}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="popup-card">
      <div class="popup-header">
        <div class="popup-title-row">
          <h3>${escapeHtml(b.name)}</h3>
          ${b.size ? `<span class="popup-size">${escapeHtml(b.size)}</span>` : ''}
        </div>
        <a class="popup-coords" href="${coordsUrl}" target="_blank" rel="noopener">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          ${b.coordinates[1].toFixed(5)}, ${b.coordinates[0].toFixed(5)}
        </a>
      </div>
      ${tabs}
      ${panes}
    </div>`;
}

function createMarkerElement(b: Billboard): HTMLElement {
  const el = document.createElement('div');
  el.className = 'bm';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `Білборд ${b.description}`);
  el.innerHTML = `
    <div class="bm-dot"></div>
    <div class="bm-core"></div>
    <div class="bm-ring"></div>
    <span class="bm-label">${escapeHtml(b.name)}</span>`;
  return el;
}

function handlePopupClicks(container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const tab = target.closest<HTMLButtonElement>('.popup-tab');
    if (tab && !tab.classList.contains('is-active')) {
      const card = tab.closest('.popup-card')!;
      const index = tab.dataset.side;
      const panes = card.querySelectorAll<HTMLElement>('.popup-pane');
      const current = card.querySelector<HTMLElement>('.popup-pane:not([hidden])');
      const next = [...panes].find((pane) => pane.dataset.pane === index);

      if (current) current.style.viewTransitionName = 'bb-pane';
      withViewTransition(() => {
        card.querySelectorAll<HTMLButtonElement>('.popup-tab').forEach((t) => {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });
        panes.forEach((pane) => {
          pane.hidden = pane !== next;
        });
        if (current) current.style.viewTransitionName = '';
        if (next) next.style.viewTransitionName = 'bb-pane';
      }, ['side-switch']).then(() => {
        if (next) next.style.viewTransitionName = '';
      });
      return;
    }

    const photo = target.closest<HTMLButtonElement>('.popup-photo[data-full]');
    if (photo) {
      window.dispatchEvent(
        new CustomEvent('open-image', {
          detail: {
            src: photo.dataset.full,
            preview: photo.querySelector('img')?.currentSrc,
            alt: photo.dataset.caption,
            origin: photo.querySelector('img'),
          },
        }),
      );
    }
  });
}

function addRoadGlow(map: any, animate: boolean): void {
  // Our own geometry: Mapbox's road tiles drop these routes' codes below zoom 10.
  map.addSource('bb-routes', {
    type: 'geojson',
    data: routes,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  });

  const base = {
    type: 'line',
    source: 'bb-routes',
    slot: 'middle',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  };

  map.addLayer({
    ...base,
    id: 'bb-road-halo',
    paint: {
      'line-color': '#34d399',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 9, 12, 16, 16, 34],
      'line-blur': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 6, 12, 12, 16, 28],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 0.3],
      'line-emissive-strength': 1,
    },
  });

  map.addLayer({
    ...base,
    id: 'bb-road-core',
    paint: {
      'line-color': '#6ee7b7',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 1.8, 12, 2.4, 16, 4],
      'line-opacity': 0.9,
      'line-emissive-strength': 1,
    },
  });

  if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  map.addLayer({
    ...base,
    id: 'bb-road-flow',
    paint: {
      'line-color': '#ecfdf5',
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 1.2, 12, 2.4, 16, 5],
      'line-blur': 1,
      'line-opacity': 0.85,
      'line-emissive-strength': 1,
      'line-dasharray': [0, 4, 3],
    },
  });

  // Stepping through dash patterns makes short light pulses travel along the roads.
  const dashes = [
    [0, 4, 3],
    [0.5, 4, 2.5],
    [1, 4, 2],
    [1.5, 4, 1.5],
    [2, 4, 1],
    [2.5, 4, 0.5],
    [3, 4, 0],
    [0, 0.5, 3, 3.5],
    [0, 1, 3, 3],
    [0, 1.5, 3, 2.5],
    [0, 2, 3, 2],
    [0, 2.5, 3, 1.5],
    [0, 3, 3, 1],
    [0, 3.5, 3, 0.5],
  ];

  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(map.getContainer());

  let step = -1;
  let last = 0;
  const tick = (t: number) => {
    if (visible && !document.hidden && t - last > 90 && map.getLayer('bb-road-flow')) {
      last = t;
      step = (step + 1) % dashes.length;
      map.setPaintProperty('bb-road-flow', 'line-dasharray', dashes[step]);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initMap(): void {
  const dataEl = document.getElementById('billboard-data');
  if (!dataEl) return;
  const billboards: Billboard[] = JSON.parse(dataEl.textContent || '[]');

  mapboxgl.accessToken = MAPBOX_TOKEN;

  const lowPower =
    window.matchMedia('(max-width: 768px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/standard',
    language: 'uk',
    config: {
      basemap: {
        // Night gives labels a dark halo (crisp on a dark map); relief comes from our own hillshade layer.
        lightPreset: 'night',
        colorLand: 'hsl(150, 25%, 22%)',
        colorGreenspace: 'hsl(150, 32%, 26%)',
        colorWater: 'hsl(190, 40%, 22%)',
        colorMotorways: 'hsl(150, 8%, 40%)',
        colorTrunks: 'hsl(150, 8%, 36%)',
        colorRoads: 'hsl(150, 8%, 32%)',
        colorBuildings: 'hsl(150, 10%, 26%)',
        colorPlaceLabels: 'hsl(150, 20%, 92%)',
        colorRoadLabels: 'hsl(150, 12%, 78%)',
        showPointOfInterestLabels: false,
        showTransitLabels: false,
        showPedestrianRoads: false,
        show3dTrees: !lowPower,
        show3dLandmarks: !lowPower,
      },
    },
    center: CENTER,
    zoom: 9,
    pitch: lowPower ? 35 : 55,
    bearing: -12,
    maxPitch: 70,
    maxZoom: 17,
    minZoom: 8,
    maxBounds: computeBounds(CENTER, RADIUS_KM),
    attributionControl: false,
  });

  map.on('style.load', () => {
    map.addSource('bb-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
    // The Standard style's own terrain fades out above zoom 13.7; ours stays on at billboard zoom.
    map.setTerrain({ source: 'bb-dem', exaggeration: lowPower ? 1.2 : 1.6 });
    map.addLayer(
      {
        id: 'bb-hillshade',
        type: 'hillshade',
        source: 'bb-dem',
        slot: 'bottom',
        paint: {
          'hillshade-exaggeration': 0.6,
          'hillshade-shadow-color': 'hsl(150, 40%, 4%)',
          'hillshade-highlight-color': 'hsl(150, 30%, 38%)',
          'hillshade-accent-color': 'hsl(150, 35%, 10%)',
          'hillshade-emissive-strength': 1,
        },
      },
    );
    addRoadGlow(map, !lowPower);
  });

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
  handlePopupClicks(map.getContainer());

  const markers = new Map<string, any>();

  billboards.forEach((b) => {
    const el = createMarkerElement(b);
    const popup = new mapboxgl.Popup({ offset: 18, maxWidth: 'none' }).setHTML(buildPopupHTML(b));
    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(b.coordinates)
      .setPopup(popup)
      .addTo(map);

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        marker.togglePopup();
      }
    });

    markers.set(b.id, marker);
  });

  function openBillboard(id: string): void {
    const marker = markers.get(id);
    if (!marker) return;

    markers.forEach((m) => {
      if (m !== marker && m.getPopup().isOpen()) m.togglePopup();
    });

    const panelOpen =
      window.innerWidth >= 769 &&
      document.getElementById('billboard-panel')?.classList.contains('open');
    map.flyTo({
      center: marker.getLngLat(),
      zoom: 15.2,
      pitch: lowPower ? 45 : 62,
      bearing: -20,
      duration: 2400,
      curve: 1.5,
      padding: {
        top: Math.min(window.innerHeight * 0.55, 470),
        bottom: 48,
        left: panelOpen ? 360 : 0,
        right: 0,
      },
    });
    if (!marker.getPopup().isOpen()) marker.togglePopup();
  }

  initPanelInteractions(openBillboard);
}

function initPanelInteractions(openBillboard: (id: string) => void): void {
  const panel = document.getElementById('billboard-panel')!;
  const toggleBtn = document.getElementById('toggle-panel')!;
  const closeBtn = document.getElementById('panel-close-btn')!;
  const backdrop = document.getElementById('panel-backdrop')!;
  const items = document.querySelectorAll<HTMLButtonElement>('.panel-item');

  let isOpen = false;

  function setPanel(open: boolean): void {
    isOpen = open;
    panel.classList.toggle('open', isOpen);
    backdrop.classList.toggle('visible', isOpen);
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    toggleBtn.classList.toggle('shifted', isOpen);
  }

  toggleBtn.addEventListener('click', () => setPanel(!isOpen));
  closeBtn.addEventListener('click', () => setPanel(false));
  backdrop.addEventListener('click', () => setPanel(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) setPanel(false);
  });

  items.forEach((item) => {
    item.addEventListener('click', () => {
      items.forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      openBillboard(item.dataset.id || '');
      if (window.innerWidth < 769) setPanel(false);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMap);
} else {
  initMap();
}
