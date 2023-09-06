mapboxgl.accessToken = 'pk.eyJ1Ijoic3VpY2lkZTExMTEiLCJhIjoiY2s4cHYwMnJjMDFpdjNmbXNqYThxYzZ0YyJ9.kI6ZlCxFGrwopn7rK7ee-A';

const center = [24.6781501, 48.7697548];
const radius = 200; // 200km

const latitudeOffset = radius / 111.32;
const longitudeOffset = radius / (111.32 * Math.cos(center[1] * (Math.PI / 180)));

const southwest = [center[0] - longitudeOffset, center[1] - latitudeOffset];
const northeast = [center[0] + longitudeOffset, center[1] + latitudeOffset];

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [24.6781501, 48.7697548], // Longitude and latitude of the map center
  zoom: 9,
  maxZoom: 12,
  minZoom: 8,
  maxBounds: [
    // Southwest coordinates
    southwest,
    // Northeast coordinates
    northeast
  ] // Set the maximum movement area using the calculated bounding box
});

// Fetch billboards from billboards.json and create the billboards on the map
fetch('billboards.json')
  .then((response) => response.json())
  .then((billboards) => {
    console.log('Fetched billboards:', billboards); // Add this line to log fetched data

    billboards.forEach((billboard) => {
      let popupContent = `<h3>${billboard.description}</h3>`;
      popupContent += `<p>Координати: ${billboard.coordinates[1]}, ${billboard.coordinates[0]}</p>`;
      popupContent += '<div class="sides-wrapper">';

      billboard.sides.forEach((side) => {
        popupContent += `<div class="side-container">`;
        popupContent += `<h4>${side.label}</h4>`;
        popupContent += `<a href="${side.image}" data-lightbox="billboard-images" data-title="${side.label}"><img src="${side.image}" alt="${side.label}" /></a>`;

        let availabilityHtml = side.availability
          .map(
            (monthInfo) =>
              `<div class="month ${monthInfo.status.toLowerCase()}">${monthInfo.month.slice(0, 3)}</div>`
          )
          .join('');

        popupContent += `<div class="availability">${availabilityHtml}</div>`;
        popupContent += `</div>`;
      });

      popupContent += `</div>`; // Close sides-wrapper div

      const marker = new mapboxgl.Marker()
        .setLngLat(billboard.coordinates)
        .setPopup(new mapboxgl.Popup().setHTML(popupContent))
        .addTo(map);
    });

    // Add event listener to the image elements within the popups
    map.on('popupopen', () => {
      const popupImages = document.querySelectorAll('.mapboxgl-popup-content img');
      popupImages.forEach((image) => {
        image.addEventListener('click', () => {
          // Use Lightbox library to open the clicked image in a zoomed-in view
          lightbox(image.src);
        });
      });
    });

    // Create the billboard list in the 'billboard-list' div
    const billboardList = document.getElementById('billboard-list');
    const listHeader = document.createElement('h3');
    listHeader.textContent = 'Billboards';
    billboardList.appendChild(listHeader);

    const list = document.createElement('ul');
    billboardList.appendChild(list);

    // Function to handle click events on list items
    function listItemOnClick(coordinates) {
      map.flyTo({
        center: coordinates,
        zoom: 14,
      });
    }


    billboards.forEach((billboard) => {
        const listItem = document.createElement('li');
        listItem.textContent = billboard.description;
        listItem.addEventListener('click', () => listItemOnClick(billboard.coordinates));
        list.appendChild(listItem);
      });
      
    // Get the toggle button and billboard list elements
    const toggleButton = document.getElementById('toggle-billboard-list');

    // Add a click event listener to the toggle button
    toggleButton.addEventListener('click', () => {
      if (billboardList.style.display === 'none' || billboardList.style.display === '') {
        billboardList.style.display = 'block';
        toggleButton.textContent = '<<'; // Update the button text
      } else {
        billboardList.style.display = 'none';
        toggleButton.textContent = '>>'; // Update the button text
      }
    });
  });

  // Initialize Lightbox
lightbox.option({
  resizeDuration: 200,
  wrapAround: true
});