import { cloudRayPoint } from "../js/atmosphere.js?v=2.3.2";
import { STAGES } from "../js/stages.js?v=2.3.2";
import { World } from "../js/world.js?v=2.3.2";
import { Renderer } from "../js/render.js?v=2.3.2";
let world = new World({ fx() {} });
const canvas = document.querySelector("canvas"),
  renderer = new Renderer(canvas),
  report = document.querySelector("#report");
function reset() {
  world.reset();
  world.nextWave = Infinity;
  world.nextPickup = Infinity;
  world.scenery = [];
  world.noticeTime = 0;
}
function draw() {
  renderer.frame = 0;
  renderer.draw(world);
}
function moon() {
  world = new World({ fx() {} }, STAGES[0]);
  reset();
  world.scenery = [
    { type: "crater", x: -46, s: 46, size: 8, decor: true },
    { type: "crater", x: 0, s: 68, size: 9, decor: true },
    { type: "crater", x: 46, s: 46, size: 8, decor: true },
    { type: "rock", x: 34, s: 100, size: 10, decor: true },
  ];
  draw();
  report.textContent =
    "Crateras central e laterais: contornos sobre a esfera, recorte nas bordas e pirâmide preservada.";
}
document.querySelector("#moon").onclick = moon;
document.querySelector("#items").onclick = () => {
  reset();
  world.entities = ["2", "3", "W", "R", "M", "S"].map((type, i) => ({
    kind: "pickup",
    type,
    x: ((i % 3) - 1) * 17,
    s: i < 3 ? 65 : 30,
    h: 9,
  }));
  draw();
  report.textContent = "DOUBLE / TRIPLE / WIDE — RAPID / MISSILE / SHIELD";
};
document.querySelector("#impact").onclick = () => {
  reset();
  world.entities = [
    {
      kind: "enemy",
      type: "satellite",
      x: 0,
      baseX: 0,
      s: 45,
      h: 10,
      phase: 0,
      hp: 2,
    },
  ];
  world.player.h = 10;
  world.weapon = 1;
  draw();
  report.textContent =
    "Satellite: 2 HP. Avance 1 segundo para disparar e observar remoção/pontos.";
};
document.querySelector("#step").onclick = () => {
  for (let i = 0; i < 60; i++) world.update(1 / 60, { x: 0, y: 0, fire: true });
  draw();
  report.textContent = `Distância ${world.distance.toFixed(1)} / inimigos ${world.entities.filter((e) => e.kind === "enemy").length} / destruídos ${world.kills} / pontos ${Math.floor(world.score)}`;
};
document.querySelector("#palette").onclick = () => {
  const data = canvas.getContext("2d").getImageData(0, 0, 240, 400).data,
    colors = new Set();
  for (let i = 0; i < data.length; i += 4)
    colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
  report.textContent = `${colors.size === 2 && colors.has("106,101,158,255") && colors.has("255,255,255,255") ? "PASS" : "FAIL"} — paleta do canvas: ${[...colors].join(" | ")}`;
};
moon();

for (const stage of STAGES.slice(1))
  document.getElementById(stage.id).onclick = () => {
    world = new World({ fx() {} }, stage);
    world.distance = 400;
    world.time = 30;
    world.noticeTime = 0;
    world.nextWave = Infinity;
    world.nextPickup = Infinity;
    draw();
    report.textContent = `${stage.name} — geometria original, superfície esférica e mesma engine.`;
  };

document.getElementById("validate").onclick = () => {
  const results = [];
  for (const stage of STAGES) {
    world = new World({ fx() {} }, stage);
    let valid = true,
      peak = 0;
    for (const distance of [0, 80, 400, 900, 1700, 2300]) {
      world.distance = distance;
      world.time = distance / 25;
      const t = performance.now();
      draw();
      peak = Math.max(peak, performance.now() - t);
      const data = canvas.getContext("2d").getImageData(0, 0, 240, 400).data;
      for (let i = 0; i < data.length; i += 4)
        if (
          !(
            (data[i] === 106 && data[i + 1] === 101 && data[i + 2] === 158) ||
            (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255)
          ) ||
          data[i + 3] !== 255
        ) {
          valid = false;
          break;
        }
    }
    results.push(
      `${valid ? "PASS" : "FAIL"} ${stage.name}: 6 posições, 2 cores; maior render ${peak.toFixed(1)} ms neste navegador.`,
    );
  }
  report.textContent = results.join("\n");
};

for (const type of ["bridge", "lowgate"])
  document.getElementById(type).onclick = () => {
    world = new World({ fx() {} }, STAGES[1]);
    world.distance = 400;
    world.noticeTime = 0;
    world.nextWave = Infinity;
    world.nextPickup = Infinity;
    world.player.h = type === "bridge" ? 6 : 13;
    world.entities = [{ kind: "obstacle", type, x: 0, s: type === "bridge" ? 404 : 435, h: 0 }];
    draw();
    report.textContent =
      type === "bridge"
        ? "Desça: vão sob o tabuleiro."
        : "Suba: passe sobre a estrutura baixa.";
  };
document.getElementById("fog").onclick = () => {
  world = new World({ fx() {} }, STAGES[3]);
  reset();
  world.distance = 400;
  const hit = cloudRayPoint(world.player, world.distance, 25);
  world.scenery = [
    {
      type: "fog",
      x: hit.x,
      s: hit.s,
      size: 30,
      depth: 6,
      h: 25,
      seed: 0,
      decor: true,
    },
  ];
  world.entities = [
    {
      kind: "enemy",
      type: "shooter",
      x: 10,
      baseX: 10,
      s: 440,
      h: 10,
      hp: 3,
      phase: 0,
      charge: 0.2,
    },
  ];
  const times = [];
  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    draw();
    times.push(performance.now() - start);
  }
  report.textContent =
    "Nuvem intercepta o raio câmera/nave; ameaça permanece visível. 30 renders: média " +
    (times.reduce((a, b) => a + b) / 30).toFixed(1) +
    " ms; máximo " +
    Math.max(...times).toFixed(1) +
    " ms.";
};
