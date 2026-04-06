import{r as f}from"./react-vendor-BTQ2hBVo.js";var g={exports:{}},d={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var O=f,A=Symbol.for("react.element"),C=Symbol.for("react.fragment"),R=Object.prototype.hasOwnProperty,$=O.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,M={key:!0,ref:!0,__self:!0,__source:!0};function w(e,t,r){var n,o={},i=null,u=null;r!==void 0&&(i=""+r),t.key!==void 0&&(i=""+t.key),t.ref!==void 0&&(u=t.ref);for(n in t)R.call(t,n)&&!M.hasOwnProperty(n)&&(o[n]=t[n]);if(e&&e.defaultProps)for(n in t=e.defaultProps,t)o[n]===void 0&&(o[n]=t[n]);return{$$typeof:A,type:e,key:i,ref:u,props:o,_owner:$.current}}d.Fragment=C;d.jsx=w;d.jsxs=w;g.exports=d;var Y=g.exports;/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),x=(...e)=>e.filter((t,r,n)=>!!t&&t.trim()!==""&&n.indexOf(t)===r).join(" ").trim();/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var T={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=f.forwardRef(({color:e="currentColor",size:t=24,strokeWidth:r=2,absoluteStrokeWidth:n,className:o="",children:i,iconNode:u,...s},a)=>f.createElement("svg",{ref:a,...T,width:t,height:t,stroke:e,strokeWidth:n?Number(r)*24/Number(t):r,className:x("lucide",o),...s},[...u.map(([c,v])=>f.createElement(c,v)),...Array.isArray(i)?i:[i]]));/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=(e,t)=>{const r=f.forwardRef(({className:n,...o},i)=>f.createElement(U,{ref:i,iconNode:t,className:x(`lucide-${I(e)}`,n),...o}));return r.displayName=`${e}`,r};/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=m("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ee=m("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=m("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const re=m("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=m("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);function E(e){var t,r,n="";if(typeof e=="string"||typeof e=="number")n+=e;else if(typeof e=="object")if(Array.isArray(e)){var o=e.length;for(t=0;t<o;t++)e[t]&&(r=E(e[t]))&&(n&&(n+=" "),n+=r)}else for(r in e)e[r]&&(n&&(n+=" "),n+=r);return n}function oe(){for(var e,t,r=0,n="",o=arguments.length;r<o;r++)(e=arguments[r])&&(t=E(e))&&(n&&(n+=" "),n+=t);return n}var _={exports:{}},j={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var y=f;function N(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var q=typeof Object.is=="function"?Object.is:N,B=y.useState,D=y.useEffect,z=y.useLayoutEffect,G=y.useDebugValue;function V(e,t){var r=t(),n=B({inst:{value:r,getSnapshot:t}}),o=n[0].inst,i=n[1];return z(function(){o.value=r,o.getSnapshot=t,h(o)&&i({inst:o})},[e,r,t]),D(function(){return h(o)&&i({inst:o}),e(function(){h(o)&&i({inst:o})})},[e]),G(r),r}function h(e){var t=e.getSnapshot;e=e.value;try{var r=t();return!q(e,r)}catch{return!0}}function W(e,t){return t()}var F=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?W:V;j.useSyncExternalStore=y.useSyncExternalStore!==void 0?y.useSyncExternalStore:F;_.exports=j;var ue=_.exports;const K="modulepreload",X=function(e){return"/"+e},b={},ie=function(t,r,n){let o=Promise.resolve();if(r&&r.length>0){document.getElementsByTagName("link");const u=document.querySelector("meta[property=csp-nonce]"),s=(u==null?void 0:u.nonce)||(u==null?void 0:u.getAttribute("nonce"));o=Promise.allSettled(r.map(a=>{if(a=X(a),a in b)return;b[a]=!0;const c=a.endsWith(".css"),v=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${v}`))return;const l=document.createElement("link");if(l.rel=c?"stylesheet":K,c||(l.as="script"),l.crossOrigin="",l.href=a,s&&l.setAttribute("nonce",s),document.head.appendChild(l),c)return new Promise((P,L)=>{l.addEventListener("load",P),l.addEventListener("error",()=>L(new Error(`Unable to preload CSS for ${a}`)))})}))}function i(u){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=u,window.dispatchEvent(s),!s.defaultPrevented)throw u}return o.then(u=>{for(const s of u||[])s.status==="rejected"&&i(s.reason);return t().catch(i)})};function p(e){"@babel/helpers - typeof";return p=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},p(e)}function S(e,t){(t==null||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function se(e,t){if(e){if(typeof e=="string")return S(e,t);var r={}.toString.call(e).slice(8,-1);return r==="Object"&&e.constructor&&(r=e.constructor.name),r==="Map"||r==="Set"?Array.from(e):r==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?S(e,t):void 0}}function k(e,t,r,n,o,i,u){try{var s=e[i](u),a=s.value}catch(c){return void r(c)}s.done?t(a):Promise.resolve(a).then(n,o)}function ae(e){return function(){var t=this,r=arguments;return new Promise(function(n,o){var i=e.apply(t,r);function u(a){k(i,n,o,u,s,"next",a)}function s(a){k(i,n,o,u,s,"throw",a)}u(void 0)})}}function Z(e,t){if(p(e)!="object"||!e)return e;var r=e[Symbol.toPrimitive];if(r!==void 0){var n=r.call(e,t);if(p(n)!="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(e)}function H(e){var t=Z(e,"string");return p(t)=="symbol"?t:t+""}function ce(e,t,r){return(t=H(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}export{Q as L,ee as M,re as S,ne as X,se as _,te as a,p as b,oe as c,ie as d,ae as e,ce as f,Y as j,ue as s};
