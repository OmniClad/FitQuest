export const zones =[
    {id:'foret',name:'Forêt de Débutant',element:'wind',levelMin:1,levelMax:15,requiredLevel:1,requiredRegionalBoss:null,regionalBossId:'wolf_king',enterStepCost:0,travelKm:0,themeColor:'#22c55e',accent:'#86efac',desc:'Une forêt sombre et silencieuse. Les sentiers serpentent entre des arbres millénaires.',bgImage:'/environnements/foret-dashboard.png',combatBgImage:'/environnements/foret-combat.png',preSessionBgImage:'/environnements/foret-presession.png',svgKey:'forest'},
    {id:'marais',name:'Marais des Ombres',element:'dark',levelMin:16,levelMax:30,requiredLevel:12,requiredRegionalBoss:'wolf_king',regionalBossId:'corrupted_dryad',enterStepCost:0,travelKm:2,themeColor:'#a855f7',accent:'#c084fc',desc:'Brume violette et eaux stagnantes. Les ombres grouillent dans les roseaux.',bgImage:'/environnements/marais-dashboard.png',combatBgImage:'/environnements/marais-combat.png',preSessionBgImage:'/environnements/marais-presession.png',svgKey:'swamp'},
    {id:'caverne',name:'Caverne de Cristal',element:'water',levelMin:31,levelMax:50,requiredLevel:28,requiredRegionalBoss:'corrupted_dryad',regionalBossId:null,enterStepCost:0,travelKm:5,themeColor:'#22d3ee',accent:'#67e8f9',desc:'Profondeurs scintillantes. Les cristaux résonnent d\'une magie ancienne.',bgImage:'/environnements/caverne-dashboard.png',combatBgImage:'/environnements/caverne-combat.png',preSessionBgImage:'/environnements/caverne-presession.png',svgKey:'crystal'}
];
export const ZONE_SVG ={
  forest:`<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
    <defs>
      <linearGradient id="fSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#1e4a32"/><stop offset="55%" stop-color="#0d3020"/><stop offset="100%" stop-color="#04140d"/></linearGradient>
    </defs>
    <rect width="800" height="200" fill="url(#fSky)"/>
    <circle cx="100" cy="30" r="1.2" fill="#fff" opacity="0.8"/>
    <circle cx="220" cy="22" r="1" fill="#fff" opacity="0.6"/>
    <circle cx="350" cy="38" r="1.2" fill="#fff" opacity="0.85"/>
    <circle cx="480" cy="18" r="1" fill="#fff" opacity="0.7"/>
    <circle cx="720" cy="28" r="1" fill="#fff" opacity="0.7"/>
    <circle cx="640" cy="48" r="24" fill="#fff" opacity="0.25"/>
    <circle cx="640" cy="48" r="17" fill="#e8f5e8" opacity="0.95"/>
    <path d="M0,135 L120,75 L260,108 L420,68 L580,98 L800,85 L800,200 L0,200 Z" fill="#1f5a3e" opacity="0.85"/>
    <path d="M0,170 L25,95 L42,148 L72,82 L102,140 L132,72 L168,140 L202,92 L242,150 L282,82 L322,140 L362,94 L402,150 L442,82 L478,140 L512,92 L552,150 L592,82 L628,140 L662,94 L702,150 L742,82 L782,140 L800,105 L800,200 L0,200 Z" fill="#256a45"/>
    <path d="M0,200 L18,130 L42,180 L72,108 L108,170 L148,93 L188,180 L228,123 L268,185 L308,103 L352,175 L398,123 L442,180 L488,98 L532,180 L578,123 L622,180 L668,108 L708,170 L748,98 L788,180 L800,138 L800,200 Z" fill="#0c2e1d"/>
  </svg>`,
  swamp:`<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
    <defs>
      <linearGradient id="sSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#1a0a2a"/><stop offset="100%" stop-color="#0a0518"/></linearGradient>
      <radialGradient id="sFog" cx="0.5" cy="0.7" r="0.7"><stop offset="0%" stop-color="rgba(150,80,200,0.4)"/><stop offset="100%" stop-color="rgba(100,40,160,0)"/></radialGradient>
    </defs>
    <rect width="800" height="200" fill="url(#sSky)"/>
    <ellipse cx="400" cy="180" rx="500" ry="100" fill="url(#sFog)"/>
    <circle cx="200" cy="50" r="2" fill="#e9b8ff" opacity="0.8"/><circle cx="400" cy="35" r="2" fill="#fff" opacity="0.6"/><circle cx="600" cy="60" r="2" fill="#e9b8ff" opacity="0.7"/>
    <g opacity="0.6"><path d="M50,180 L50,130 M55,180 L55,135 M60,180 L60,140" stroke="#3a1f4a" stroke-width="1.5"/><path d="M120,180 L120,120 M125,180 L125,128 M130,180 L130,135 M135,180 L135,125" stroke="#3a1f4a" stroke-width="1.5"/><path d="M250,180 L250,135 M255,180 L255,140 M260,180 L260,130" stroke="#3a1f4a" stroke-width="1.5"/><path d="M380,180 L380,118 M385,180 L385,125 M390,180 L390,130 M395,180 L395,135" stroke="#3a1f4a" stroke-width="1.5"/><path d="M520,180 L520,130 M525,180 L525,140 M530,180 L530,128 M535,180 L535,138" stroke="#3a1f4a" stroke-width="1.5"/><path d="M660,180 L660,135 M665,180 L665,140 M670,180 L670,128 M675,180 L675,135" stroke="#3a1f4a" stroke-width="1.5"/></g>
    <ellipse cx="200" cy="195" rx="80" ry="6" fill="#1a0a2a"/><ellipse cx="500" cy="195" rx="120" ry="6" fill="#1a0a2a"/>
    <circle cx="180" cy="100" r="2" fill="#ffe066" opacity="0.9"><animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite"/></circle>
    <circle cx="450" cy="80" r="2" fill="#ffe066" opacity="0.7"><animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite"/></circle>
    <circle cx="650" cy="110" r="2" fill="#ffe066" opacity="0.8"><animate attributeName="opacity" values="0.3;1;0.3" dur="3.5s" repeatCount="indefinite"/></circle>
  </svg>`,
  crystal:`<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
    <defs>
      <linearGradient id="cSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#0a1f2a"/><stop offset="100%" stop-color="#020a14"/></linearGradient>
      <linearGradient id="cCrystal" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#67e8f9" stop-opacity="0.9"/><stop offset="100%" stop-color="#0e7490" stop-opacity="0.4"/></linearGradient>
    </defs>
    <rect width="800" height="200" fill="url(#cSky)"/>
    <g opacity="0.5"><path d="M50,0 L60,80 L70,0 Z" fill="url(#cCrystal)"/><path d="M180,0 L195,90 L210,0 Z" fill="url(#cCrystal)"/><path d="M350,0 L365,70 L380,0 Z" fill="url(#cCrystal)"/><path d="M500,0 L520,100 L540,0 Z" fill="url(#cCrystal)"/><path d="M650,0 L665,80 L680,0 Z" fill="url(#cCrystal)"/></g>
    <g opacity="0.8"><path d="M30,200 L60,120 L90,200 Z" fill="url(#cCrystal)"/><path d="M140,200 L170,90 L200,200 Z" fill="url(#cCrystal)"/><path d="M280,200 L320,100 L360,200 Z" fill="url(#cCrystal)"/><path d="M440,200 L475,80 L510,200 Z" fill="url(#cCrystal)"/><path d="M570,200 L610,110 L650,200 Z" fill="url(#cCrystal)"/><path d="M700,200 L740,95 L780,200 Z" fill="url(#cCrystal)"/></g>
    <circle cx="100" cy="40" r="1.5" fill="#67e8f9"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="300" cy="60" r="1" fill="#a5f3fc"><animate attributeName="opacity" values="0;1;0" dur="2.8s" repeatCount="indefinite"/></circle>
    <circle cx="500" cy="40" r="1.5" fill="#67e8f9"><animate attributeName="opacity" values="0;1;0" dur="3.2s" repeatCount="indefinite"/></circle>
    <circle cx="700" cy="55" r="1" fill="#a5f3fc"><animate attributeName="opacity" values="0;1;0" dur="2.4s" repeatCount="indefinite"/></circle>
  </svg>`,
  default:`<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
    <defs><linearGradient id="dSky" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#1a1228"/><stop offset="100%" stop-color="#0a0612"/></linearGradient></defs>
    <rect width="800" height="200" fill="url(#dSky)"/>
  </svg>`
};
