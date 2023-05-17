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
      popupContent += `<p>Coordinates: ${billboard.coordinates[0]}, ${billboard.coordinates[1]}</p>`;
      popupContent += `<div class="sides-wrapper">`;

      billboard.sides.forEach((side) => {
        popupContent += `<div class="side-container"><h4>${side.label}</h4>`;
        popupContent += `<img src="${side.image}" alt="${side.label}"/>`;

        side.availability.forEach((availability) => {
          let color = availability.status.toLowerCase() === 'busy' ? 'red' : 'green';
          popupContent += `<div style="display: inline-block; width: 20px; height: 20px; background-color: ${color};"></div>`;
          popupContent += `<p>${availability.month}: ${availability.status}</p>`;
        });

        popupContent += `</div>`;
      });

      popupContent += `</div>`;

      const marker = new mapboxgl.Marker()
      .setLngLat(billboard.coordinates)
      .setPopup(new mapboxgl.Popup({ maxWidth: 'none' }).setHTML(popupContent)) // set maxWidth to 'none' or specific value like '400px'
      .addTo(map);
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
