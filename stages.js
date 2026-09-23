import { COUNTIES } from '../data/counties.js';

export const N_STAGES = 11;

// One stage = one group of 7 counties. Colors give every stage its own "paint" on the map.
export const STAGES = [
  { n: 1, name: 'Home Turf', tag: 'Stephens County and the neighbors around it', color: '#f97316', emoji: '🏠' },
  { n: 2, name: 'Metro Crossroads', tag: 'Oklahoma City and the counties around it', color: '#38bdf8', emoji: '🏙️' },
  { n: 3, name: 'Tulsa Territory', tag: 'Tulsa and the Arkansas River country', color: '#a78bfa', emoji: '🛢️' },
  { n: 4, name: 'Green Country', tag: 'The hills and lakes of the northeast', color: '#22c55e', emoji: '🌲' },
  { n: 5, name: 'Cherokee Outlet', tag: 'North-central Oklahoma and the Land Run strip', color: '#facc15', emoji: '🌾' },
  { n: 6, name: "No Man's Land", tag: 'The Panhandle and the far northwest', color: '#f43f5e', emoji: '🌵' },
  { n: 7, name: 'Plains & Canyons', tag: 'Western Oklahoma and Caddo County', color: '#2dd4bf', emoji: '🏜️' },
  { n: 8, name: 'Red River West', tag: 'Southwest Oklahoma along the Texas line', color: '#fb923c', emoji: '🌅' },
  { n: 9, name: 'Lake Texoma Country', tag: 'South-central Oklahoma', color: '#818cf8', emoji: '🎣' },
  { n: 10, name: 'River Valley', tag: 'East-central Oklahoma', color: '#e879f9', emoji: '🚣' },
  { n: 11, name: 'Kiamichi Country', tag: 'The mountains of southeast Oklahoma', color: '#84cc16', emoji: '⛰️' },
];

export const COUNTY_BY_NAME = Object.fromEntries(COUNTIES.map((c) => [c.name, c]));
export const stageOf = (name) => COUNTY_BY_NAME[name].stage;
export const stageColor = (name) => STAGES[COUNTY_BY_NAME[name].stage - 1].color;
export const countiesInStage = (n) => COUNTIES.filter((c) => c.stage === n);
export const fullName = (name) => `${name} County`;
