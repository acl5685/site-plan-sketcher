# Site Plan Sketcher

A single-file, browser-based tool for sketching development site plans on top of real parcel data: parcels, roads, buildings, parking lots, setback checks, parking requirements, and exports (GeoJSON, CSV, DXF, project JSON).

No build step and no backend. Open `index.html` in a browser, or use the hosted version. It needs internet access for map tiles, CDN libraries and ArcGIS services. Work autosaves in your browser's localStorage.

Parking requirements follow Brecksville, OH Codified Ordinances Ch. 1183. Always confirm with the local planning and zoning office.

## Tests

```
cd tests
npm i jsdom leaflet @turf/turf@6.5.0 proj4
node audit.js
```