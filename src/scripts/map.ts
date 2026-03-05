declare const mapboxgl: any;

interface Availability {
  month: string;
  status: string;
}

interface Side {
  label: string;
  image: string;
  availability: Availability[];
}

interface Billboard {
  coordinates: [number, number];
  description: string;
  image: string;
  sides: Side[];
}

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

const CENTER: [number, number] = [24.6781501, 48.7697548];
const RADIUS_KM = 200;

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

function hasFreeSlots(b: Billboard): boolean {
  return b.sides.some((s) => s.availability.some((a) => a.status === 'Free'));
}

function buildPopupHTML(b: Billboard): string {
  const coordsUrl = `https://www.google.com/maps/?q=${b.coordinates[1]},${b.coordinates[0]}`;

  const sidesHtml = b.sides
    .map((side) => {
      const monthsHtml = side.availability
        .map((a) => {
          const cls = a.status.toLowerCase();
          const label = a.month.slice(0, 3);
          return `<span class="popup-month ${cls}">${label}</span>`;
        })
        .join('');

      return `
        <div class="popup-side">
          <div class="popup-side-header">
            <span class="popup-side-label">${side.label}</span>
          </div>
          <div class="popup-img-wrap">
            <img
              class="popup-side-img"
              src="${side.image}"
              alt="${side.label}"
              loading="lazy"
              onclick="window.__openImageModal('${side.image}', '${b.description} — ${side.label}')"
            />
            <div class="popup-img-zoom">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
          <div class="popup-availability">${monthsHtml}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="popup-card">
      <div class="popup-header">
        <div>
          <h3>${b.description}</h3>
          <a class="popup-coords" href="${coordsUrl}" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            ${b.coordinates[1].toFixed(5)}, ${b.coordinates[0].toFixed(5)}
          </a>
        </div>
      </div>
      <div class="popup-divider"></div>
      <div class="popup-sides">${sidesHtml}</div>
    </div>`;
}

function initMap(): void {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const bounds = computeBounds(CENTER, RADIUS_KM);

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: CENTER,
    zoom: 9,
    maxZoom: 15,
    minZoom: 8,
    maxBounds: bounds,
    attributionControl: false,
  });

  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

  fetch('/billboards.json')
    .then((res: Response) => res.json())
    .then((billboards: Billboard[]) => {
      billboards.forEach((b) => {
        const el = document.createElement('div');
        el.className = 'bm';

        const dot = document.createElement('div');
        dot.className = 'bm-dot';
        el.appendChild(dot);

        const core = document.createElement('div');
        core.className = 'bm-core';
        el.appendChild(core);

        const ring = document.createElement('div');
        ring.className = 'bm-ring';
        el.appendChild(ring);

        const label = document.createElement('span');
        label.className = 'bm-label';
        label.textContent = b.description.split(',')[0].trim();
        el.appendChild(label);

        const popup = new mapboxgl.Popup({ offset: 18, maxWidth: '420px' }).setHTML(
          buildPopupHTML(b),
        );

        new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(b.coordinates)
          .setPopup(popup)
          .addTo(map);
      });

      initPanelInteractions(map, billboards);
    });
}

function initPanelInteractions(map: any, billboards: Billboard[]): void {
  const panel = document.getElementById('billboard-panel')!;
  const toggleBtn = document.getElementById('toggle-panel')!;
  const closeBtn = document.getElementById('panel-close-btn')!;
  const backdrop = document.getElementById('panel-backdrop')!;
  const items = document.querySelectorAll<HTMLLIElement>('.panel-item');

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
    if (e.key === 'Escape' && isOpen) {
      setPanel(false);
    }
  });

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const lng = parseFloat(item.dataset.lng || '0');
      const lat = parseFloat(item.dataset.lat || '0');

      items.forEach((el) => el.classList.remove('active'));
      item.classList.add('active');

      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1200,
      });

      const idx = parseInt(item.dataset.index || '0', 10);
      const billboard = billboards[idx];
      if (billboard) {
        new mapboxgl.Popup({ offset: 25, maxWidth: '420px' })
          .setLngLat(billboard.coordinates)
          .setHTML(buildPopupHTML(billboard))
          .addTo(map);
      }

      if (window.innerWidth < 769) {
        setPanel(false);
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMap);
} else {
  initMap();
}
