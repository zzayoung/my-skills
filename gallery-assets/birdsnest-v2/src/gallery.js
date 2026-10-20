/* zz.gallery/1 trusted owner-authored module. Native unit: 1 metre.
 * Assets: all geometry and canvas material textures are generated locally.
 * No network requests, bundled THREE, renderer, RAF or input listeners.
 * Import uses the host THREE r180. The standalone experience uses this same source.
 */
import { createBirdsnestWorld } from './world.js';
export function createExhibit(THREE, options={}) {
  const world=createBirdsnestWorld(THREE,{preview:false});
  world.materials.redGlow.side=THREE.DoubleSide;
  world.setWeather('afterrain');
  let visit='outside',disposed=false;
  return {
    group:world.group,
    bounds:world.bounds,
    update(dt,time){if(!disposed)world.update(Math.min(Math.max(dt,0),.1),time);},
    dispose(){if(disposed)return;disposed=true;world.dispose();},
    setGrowth:world.setGrowth,
    getNavigation:world.getNavigation,
    resolveMovement:world.resolveMovement,
    activateSpot:world.activateSpot,
    getInteractions:world.getInteractions,
    activateInteraction(id){return visit==='inside'&&world.activateInteraction(id);},
    setVisitState(state){if(['entering','inside','leaving','emerging','outside'].includes(state))visit=state;}
  };
}
