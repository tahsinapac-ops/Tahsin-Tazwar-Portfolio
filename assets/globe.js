/* =========================================================
   Interactive 3D globe — real Earth imagery, drag to rotate.
   Powered by globe.gl (three.js). Loaded from CDN.
   ========================================================= */
(function () {
  "use strict";

  var el = document.getElementById("globeViz");
  if (!el) return;

  // Library failed to load (offline / blocked) — hide the stage gracefully.
  if (typeof Globe !== "function") {
    el.classList.add("globe-failed");
    return;
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DHAKA = { lat: 23.8103, lng: 90.4125 };

  // Real destinations Bangladesh's tech sector serves
  var CITIES = [
    { name: "London",        lat: 51.5074, lng: -0.1278 },
    { name: "New York",      lat: 40.7128, lng: -74.0060 },
    { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
    { name: "Berlin",        lat: 52.5200, lng: 13.4050 },
    { name: "Dubai",         lat: 25.2048, lng: 55.2708 },
    { name: "Singapore",     lat: 1.3521,  lng: 103.8198 },
    { name: "Tokyo",         lat: 35.6762, lng: 139.6503 },
    { name: "Sydney",        lat: -33.8688, lng: 151.2093 },
    { name: "Toronto",       lat: 43.6532, lng: -79.3832 }
  ];

  var arcs = CITIES.map(function (c) {
    return { startLat: DHAKA.lat, startLng: DHAKA.lng, endLat: c.lat, endLng: c.lng };
  });

  var CDN = "https://unpkg.com/three-globe/example/img/";

  var globe = Globe()(el)
    .globeImageUrl(CDN + "earth-blue-marble.jpg")
    .bumpImageUrl(CDN + "earth-topology.png")
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true)
    .atmosphereColor("#ccff00")
    .atmosphereAltitude(0.17)

    // Bangladesh marker — the whole point of the visual, so it is deliberately
    // oversized and lime rather than a to-scale dot lost in the Bay of Bengal.
    .pointsData([{ lat: DHAKA.lat, lng: DHAKA.lng }])
    .pointColor(function () { return "#ccff00"; })
    .pointAltitude(0.06)
    .pointRadius(0.95)

    // Pulsing ring over Bangladesh
    .ringsData(reduce ? [] : [{ lat: DHAKA.lat, lng: DHAKA.lng }])
    .ringColor(function () { return function (t) { return "rgba(204,255,0," + (1 - t) + ")"; }; })
    .ringMaxRadius(9)
    .ringPropagationSpeed(2.2)
    .ringRepeatPeriod(1100)

    // Label
    .labelsData([{ lat: DHAKA.lat, lng: DHAKA.lng, text: "Bangladesh" }])
    .labelText("text")
    .labelSize(2.4)
    .labelDotRadius(0.55)
    .labelColor(function () { return "#ccff00"; })
    .labelAltitude(0.07)

    // Connections out to the world
    .arcsData(arcs)
    .arcColor(function () { return ["rgba(255,138,43,0.95)", "rgba(204,255,0,0.8)"]; })
    .arcAltitudeAutoScale(0.45)
    .arcStroke(0.45)
    .arcDashLength(0.38)
    .arcDashGap(0.6)
    .arcDashAnimateTime(reduce ? 0 : 2400);

  // Start looking at Bangladesh
  globe.pointOfView({ lat: DHAKA.lat, lng: DHAKA.lng, altitude: 2.3 }, 0);

  var controls = globe.controls();
  controls.enableZoom = false;          // don't hijack page scroll
  controls.rotateSpeed = 0.8;
  // autoRotate is OFF on purpose. A continuous spin carries Bangladesh around
  // the far side for half of every revolution, which defeats the point of the
  // section. The sway below keeps it on screen at all times instead.
  controls.autoRotate = false;

  // Touch devices never drive the globe: OrbitControls swallowing a drag is
  // what made the section feel like a scroll trap on phones. CSS also sets
  // pointer-events:none there; this is the belt to that braces.
  var touch = window.matchMedia("(hover:none) and (pointer:coarse)").matches;
  if (touch) {
    controls.enabled = false;
  } else if (controls.touches) {
    controls.touches.ONE = null;
  }

  /* Gentle sway around Bangladesh instead of a full spin: the camera arcs a
     little either side of Dhaka, so the marker is always in view but the globe
     still reads as alive. Handing off to the visitor is one-way — once someone
     drags, the sway stops for good rather than fighting them for the camera. */
  var swayed = 0, swaying = !reduce;
  function sway() {
    if (!swaying) return;
    swayed += 0.0022;
    globe.pointOfView({
      lat: DHAKA.lat - 4,
      lng: DHAKA.lng + Math.sin(swayed) * 26,
      altitude: 2.3
    }, 0);
    requestAnimationFrame(sway);
  }
  if (swaying) requestAnimationFrame(sway);

  el.addEventListener("pointerdown", function () { swaying = false; });

  // Responsive sizing
  function size() {
    var w = el.clientWidth || 460;
    globe.width(w).height(w);
  }
  size();
  window.addEventListener("resize", size);
})();
