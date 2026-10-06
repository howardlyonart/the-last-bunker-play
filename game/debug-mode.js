import {NEW_WEAPONS,NEW_BOOSTS,ARSENAL_NAMES} from './arsenal.js?v=b0edb1b3bbff';
const catalog=keys=>Object.fromEntries(keys.map(key=>[key,ARSENAL_NAMES[key]]));
export const DEBUG_WEAPONS={pulse:'Pulse cannon',triple:'Triple shot',bounce:'Bouncing shots',missile:'Swarm missiles',lightning:'Chain lightning',gravity:'Gravity gun',freeze:'Freeze ray',acid:'Acid shotgun',seeker:'Seeker balls',repulser:'Repulser blast',mount:'Asteroid turrets',chain:'Chain shot',thruster:'Thruster missiles',...catalog(NEW_WEAPONS)};
export const DEBUG_BOOSTS={charge:'Charged bunker blast',shield:'Shield',shield2:'Shield II',turret:'Ground turret',turret2:'Turret II',drone:'Fighter drone',minelayer:'Minelayer',...catalog(NEW_BOOSTS)};
export const DEBUG_STORAGE='last-bunker-debug-v1';
export function normalizeDebug(value){const mode=['normal','all','custom'].includes(value?.mode)?value.mode:'normal';const pick=(list,catalog)=>Array.isArray(list)?Object.keys(catalog).filter(key=>list.includes(key)):Object.keys(catalog);return {mode,weapons:pick(value?.weapons,DEBUG_WEAPONS),boosts:pick(value?.boosts,DEBUG_BOOSTS)};}
export function debugOptions(value){const saved=normalizeDebug(value);return saved.mode==='normal'?null:saved.mode==='all'?{weapons:Object.keys(DEBUG_WEAPONS),boosts:Object.keys(DEBUG_BOOSTS)}:{weapons:saved.weapons,boosts:saved.boosts};}
export function loadDebug(storage){try{return normalizeDebug(JSON.parse(storage.getItem(DEBUG_STORAGE)));}catch{return normalizeDebug(null);}}
export function saveDebug(storage,value){const saved=normalizeDebug(value);try{storage.setItem(DEBUG_STORAGE,JSON.stringify(saved));}catch{}return saved;}
