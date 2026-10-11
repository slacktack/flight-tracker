import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import type { Theme } from '@/lib/theme';

// Two charts over the same OpenMapTiles data: a night chart and a day chart.
const FONT = ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'];
const FONT_REG = ['Montserrat Regular', 'Open Sans Regular', 'Noto Sans Regular'];
const FONT_IT = ['Montserrat Medium Italic', 'Open Sans Italic', 'Noto Sans Regular'];

export interface MapPalette {
  land: string;
  landcover: string;
  park: string;
  urban: string;
  water: string;
  river: string;
  border: string;
  state: string;
  airportArea: string;
  runway: string;
  taxiway: string;
  roadMajor: string;
  roadMid: string;
  roadMinor: string;
  rail: string;
  building: string;
  labelStrong: string;
  labelMid: string;
  labelSoft: string;
  waterLabel: string;
  halo: string;
  airportLabel: string;
  planeHalo: string;
}

export const PALETTES: Record<Theme, MapPalette> = {
  dark: {
    land: '#111A2E',
    landcover: '#13213A',
    park: '#14263A',
    urban: '#16213A',
    water: '#070D1A',
    river: '#0A1324',
    border: '#3A4C75',
    state: '#26365A',
    airportArea: '#18233D',
    runway: '#41557F',
    taxiway: '#2C3B5E',
    roadMajor: '#2B3A5C',
    roadMid: '#212F4D',
    roadMinor: '#1B2741',
    rail: '#2E3D60',
    building: '#1A2540',
    labelStrong: '#AEB9D3',
    labelMid: '#7E8DB0',
    labelSoft: '#5C6B8E',
    waterLabel: '#3E5079',
    halo: '#0B1222',
    airportLabel: '#C9D2E6',
    planeHalo: '#0B1222',
  },
  light: {
    land: '#EEF1F6',
    landcover: '#E5EBE3',
    park: '#DCE8D8',
    urban: '#E6E9F0',
    water: '#BFD3E6',
    river: '#AFC7DD',
    border: '#8E9BB8',
    state: '#B5C0D6',
    airportArea: '#E2E5EE',
    runway: '#9AA6BE',
    taxiway: '#C4CBDA',
    roadMajor: '#FFFFFF',
    roadMid: '#FFFFFF',
    roadMinor: '#FAFBFD',
    rail: '#A9B2C6',
    building: '#DADEE7',
    labelStrong: '#1D2742',
    labelMid: '#46526F',
    labelSoft: '#6E7A96',
    waterLabel: '#6A88A8',
    halo: '#F6F8FB',
    airportLabel: '#1D2742',
    planeHalo: '#FFFFFF',
  },
};

const w = (stops: Array<[number, number]>) => ['interpolate', ['exponential', 1.5], ['zoom'], ...stops.flat()] as unknown as number;

export function basemapLayers(p: MapPalette): LayerSpecification[] {
  return [
    { id: 'land', type: 'background', paint: { 'background-color': p.land } },
    { id: 'landcover', type: 'fill', source: 'carto', 'source-layer': 'landcover', paint: { 'fill-color': p.landcover, 'fill-opacity': 0.6 } },
    { id: 'park', type: 'fill', source: 'carto', 'source-layer': 'park', minzoom: 6, paint: { 'fill-color': p.park, 'fill-opacity': 0.7 } },
    { id: 'urban', type: 'fill', source: 'carto', 'source-layer': 'landuse', minzoom: 8, filter: ['in', 'class', 'residential', 'commercial', 'industrial'], paint: { 'fill-color': p.urban, 'fill-opacity': 0.8 } },
    { id: 'aeroway-area', type: 'fill', source: 'carto', 'source-layer': 'aeroway', minzoom: 10, filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': p.airportArea } },
    { id: 'water', type: 'fill', source: 'carto', 'source-layer': 'water', paint: { 'fill-color': p.water } },
    { id: 'river', type: 'line', source: 'carto', 'source-layer': 'waterway', minzoom: 6, paint: { 'line-color': p.river, 'line-width': w([[6, 0.6], [10, 1.4], [14, 3]]) } },
    { id: 'state', type: 'line', source: 'carto', 'source-layer': 'boundary', minzoom: 4, filter: ['all', ['==', 'admin_level', 4], ['==', 'maritime', 0]], paint: { 'line-color': p.state, 'line-width': w([[4, 0.6], [10, 1.2]]), 'line-dasharray': [3, 2] } },
    { id: 'country', type: 'line', source: 'carto', 'source-layer': 'boundary', filter: ['all', ['==', 'admin_level', 2], ['==', 'maritime', 0]], paint: { 'line-color': p.border, 'line-width': w([[3, 0.8], [8, 1.6]]) } },
    { id: 'road-minor', type: 'line', source: 'carto', 'source-layer': 'transportation', minzoom: 11, filter: ['in', 'class', 'minor', 'service', 'tertiary'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.roadMinor, 'line-width': w([[11, 0.6], [14, 2.5], [16, 6]]) } },
    { id: 'road-secondary', type: 'line', source: 'carto', 'source-layer': 'transportation', minzoom: 8, filter: ['==', 'class', 'secondary'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.roadMid, 'line-width': w([[8, 0.5], [12, 2], [16, 8]]) } },
    { id: 'road-primary', type: 'line', source: 'carto', 'source-layer': 'transportation', minzoom: 6, filter: ['in', 'class', 'primary', 'trunk'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.roadMid, 'line-width': w([[6, 0.5], [10, 1.6], [16, 10]]) } },
    { id: 'road-motorway', type: 'line', source: 'carto', 'source-layer': 'transportation', minzoom: 5, filter: ['==', 'class', 'motorway'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.roadMajor, 'line-width': w([[5, 0.6], [10, 2], [16, 12]]) } },
    { id: 'rail', type: 'line', source: 'carto', 'source-layer': 'transportation', minzoom: 8, filter: ['==', 'class', 'rail'], paint: { 'line-color': p.rail, 'line-width': w([[8, 0.6], [14, 1.6]]), 'line-dasharray': [3, 2] } },
    { id: 'taxiway', type: 'line', source: 'carto', 'source-layer': 'aeroway', minzoom: 11, filter: ['==', 'class', 'taxiway'], paint: { 'line-color': p.taxiway, 'line-width': w([[11, 0.8], [14, 3], [17, 10]]) } },
    { id: 'runway', type: 'line', source: 'carto', 'source-layer': 'aeroway', minzoom: 8, filter: ['==', 'class', 'runway'], paint: { 'line-color': p.runway, 'line-width': w([[8, 1], [11, 3], [14, 12], [17, 40]]) } },
    { id: 'building', type: 'fill', source: 'carto', 'source-layer': 'building', minzoom: 13, paint: { 'fill-color': p.building, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 0.9] } },
    {
      id: 'water-label',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'water_name',
      filter: ['==', '$type', 'Point'],
      layout: { 'text-field': '{name_en}', 'text-font': FONT_IT, 'text-size': w([[3, 10], [8, 13]]), 'text-letter-spacing': 0.1, 'text-max-width': 8 },
      paint: { 'text-color': p.waterLabel },
    },
    {
      id: 'road-label',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'transportation_name',
      minzoom: 11,
      filter: ['in', 'class', 'motorway', 'trunk', 'primary', 'secondary'],
      layout: { 'symbol-placement': 'line', 'text-field': '{name_en}', 'text-font': FONT_REG, 'text-size': 10.5, 'text-max-angle': 30 },
      paint: { 'text-color': p.labelSoft, 'text-halo-color': p.halo, 'text-halo-width': 1.4 },
    },
    {
      id: 'village-label',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      minzoom: 10,
      filter: ['in', 'class', 'village', 'suburb', 'neighbourhood'],
      layout: { 'text-field': '{name_en}', 'text-font': FONT_REG, 'text-size': w([[10, 10], [14, 13]]), 'text-max-width': 8 },
      paint: { 'text-color': p.labelSoft, 'text-halo-color': p.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'town-label',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      minzoom: 7,
      filter: ['==', 'class', 'town'],
      layout: { 'text-field': '{name_en}', 'text-font': FONT_REG, 'text-size': w([[7, 10], [12, 14]]), 'text-max-width': 8 },
      paint: { 'text-color': p.labelMid, 'text-halo-color': p.halo, 'text-halo-width': 1.2 },
    },
    {
      id: 'city-label',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      minzoom: 4,
      filter: ['==', 'class', 'city'],
      layout: {
        'text-field': '{name_en}',
        'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, ['case', ['<=', ['get', 'rank'], 3], 12, 10], 10, ['case', ['<=', ['get', 'rank'], 3], 17, 14]],
        'text-max-width': 8,
        'symbol-sort-key': ['get', 'rank'],
      },
      paint: { 'text-color': p.labelStrong, 'text-halo-color': p.halo, 'text-halo-width': 1.4 },
    },
    {
      id: 'state-label',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      minzoom: 5,
      maxzoom: 8,
      filter: ['==', 'class', 'state'],
      layout: { 'text-field': '{name_en}', 'text-font': FONT_REG, 'text-size': 11, 'text-letter-spacing': 0.12, 'text-max-width': 7 },
      paint: { 'text-color': p.labelSoft, 'text-halo-color': p.halo, 'text-halo-width': 1 },
    },
    {
      id: 'country-label',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'place',
      maxzoom: 7,
      filter: ['==', 'class', 'country'],
      layout: { 'text-field': '{name_en}', 'text-font': FONT, 'text-size': w([[2, 11], [6, 15]]), 'text-letter-spacing': 0.18, 'text-max-width': 8 },
      paint: { 'text-color': p.labelMid, 'text-halo-color': p.halo, 'text-halo-width': 1 },
    },
    {
      id: 'aerodrome-label',
      type: 'symbol',
      source: 'carto',
      'source-layer': 'aerodrome_label',
      minzoom: 9,
      layout: { 'text-field': '{name_en}', 'text-font': FONT, 'text-size': 11, 'text-max-width': 9, 'text-offset': [0, 2.2], 'text-anchor': 'top' },
      paint: { 'text-color': p.airportLabel, 'text-halo-color': p.halo, 'text-halo-width': 1.4 },
    },
  ];
}

export function makeStyle(theme: Theme): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
    sources: { carto: { type: 'vector', url: 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json' } },
    layers: basemapLayers(PALETTES[theme]),
  };
}
