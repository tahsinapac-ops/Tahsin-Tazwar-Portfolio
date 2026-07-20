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
    .atmosphereColor("#a855f7")
    .atmosphereAltitude(0.17)

    // Bangladesh marker
    .pointsData([{ lat: DHAKA.lat, lng: DHAKA.lng }])
    .pointColor(function () { return "#ff8a2b"; })
    .pointAltitude(0.035)
    .pointRadius(0.62)

    // Pulsing ring over Bangladesh
    .ringsData(reduce ? [] : [{ lat: DHAKA.lat, lng: DHAKA.lng }])
    .ringColor(function () { return function (t) { return "rgba(255,138,43," + (1 - t) + ")"; }; })
    .ringMaxRadius(7)
    .ringPropagationSpeed(2.2)
    .ringRepeatPeriod(1100)

    // Label
    .labelsData([{ lat: DHAKA.lat, lng: DHAKA.lng, text: "Bangladesh" }])
    .labelText("text")
    .labelSize(1.5)
    .labelDotRadius(0.45)
    .labelColor(function () { return "#ffc48a"; })
    .labelAltitude(0.04)

    // Connections out to the world
    .arcsData(arcs)
    .arcColor(function () { return ["rgba(255,138,43,0.95)", "rgba(168,85,247,0.75)"]; })
    .arcAltitudeAutoScale(0.45)
    .arcStroke(0.45)
    .arcDashLength(0.38)
    .arcDashGap(0.6)
    .arcDashAnimateTime(reduce ? 0 : 2400);

  // Start looking at Bangladesh
  globe.pointOfView({ lat: DHAKA.lat, lng: DHAKA.lng, altitude: 2.3 }, 0);

  var controls = globe.controls();
  controls.enableZoom = false;          // don't hijack page scroll
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.55;
  controls.rotateSpeed = 0.8;
  // On touch devices let one finger scroll the page; the globe still auto-rotates.
  if (controls.touches) controls.touches.ONE = null;

  // Pause auto-rotation while the visitor is dragging
  el.addEventListener("pointerdown", function () { controls.autoRotate = false; });
  window.addEventListener("pointerup", function () {
    if (!reduce) setTimeout(function () { controls.autoRotate = true; }, 2500);
  });

  // Responsive sizing
  function size() {
    var w = el.clientWidth || 460;
    globe.width(w).height(w);
  }
  size();
  window.addEventListener("resize", size);
})();
