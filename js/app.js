import { WEAPONS } from "./config.js?v=2.3.2";
import { Campaign } from "./campaign.js?v=2.3.2";
import { STAGES } from "./stages.js?v=2.3.2";
import { Renderer } from "./render.js?v=2.3.2";
import { Input } from "./input.js?v=2.3.2";
import { AudioSystem } from "./audio.js?v=2.3.2";
export function mount({ stages = STAGES, storagePrefix = "gravity" } = {}) {
  const $ = (id) => document.getElementById(id),
    audio = new AudioSystem(),
    campaign = new Campaign(audio, stages),
    renderer = new Renderer($("game"));
  let world = campaign.world;
  let state = "menu",
    best = 0,
    last = 0,
    accumulator = 0;
  try {
    best = Number(localStorage.getItem(`${storagePrefix}.best`)) || 0;
    audio.sound = localStorage.getItem(`${storagePrefix}.sound`) !== "off";
    audio.music = localStorage.getItem(`${storagePrefix}.music`) === "on";
  } catch {}
  function save(key, value) {
    try {
      localStorage.setItem(
        key.replace(/^gravity\./, `${storagePrefix}.`),
        value,
      );
    } catch {}
  }
  function settings() {
    for (const [id, label] of [
      ["sound", "SOM"],
      ["music", "MÚSICA"],
    ]) {
      $(id).textContent = `${label} ${audio[id] ? "ON" : "OFF"}`;
      $(id).setAttribute("aria-pressed", String(audio[id]));
    }
    $("best").textContent = `BEST ${String(best).padStart(6, "0")}`;
  }
  function ui() {
    const playing = state === "playing";
    $("menu").hidden = state !== "menu";
    $("dialog").hidden = playing || state === "menu";
    $("hud").hidden = !playing;
    $("controls").hidden = !playing;
    input.enabled = playing;
    input.reset();
    if (!playing && state !== "menu") {
      $("dialogTag").textContent =
        state === "paused" ? "FLIGHT INTERRUPTED" : "PANORAMA ARCADE";
      $("dialogTitle").textContent = {
        paused: "PAUSED",
        over: "GAME OVER",
        clear: campaign.hasNext ? "STAGE CLEAR" : "ALL CLEAR",
      }[state];
      $("dialogText").textContent =
        state === "paused"
          ? "SUA EXPEDIÇÃO ESTÁ EM PAUSA."
          : state === "clear"
            ? `${world.stage.name} COMPLETED\nSCORE ${Math.floor(world.score)}\n${campaign.hasNext ? "NEXT / " + stages[campaign.index + 1].name : "FIVE WORLDS. ONE FLIGHT."}`
            : `SCORE ${Math.floor(world.score)}\nBEST ${best}`;
      $("next").hidden = state !== "clear" || !campaign.hasNext;
      $("next").textContent = campaign.hasNext
        ? `PRÓXIMO / ${stages[campaign.index + 1].name} →`
        : "";
      $("resume").hidden = state !== "paused";
      $("restart").textContent =
        state === "paused"
          ? "REINICIAR FASE"
          : state === "clear" && !campaign.hasNext
            ? "NOVA EXPEDIÇÃO →"
            : "REPETIR FASE →";
      (state === "paused"
        ? $("resume")
        : state === "clear" && campaign.hasNext
          ? $("next")
          : $("restart")
      ).focus();
    }
    settings();
  }
  function start() {
    audio.unlock();
    campaign.start();
    world = campaign.world;
    state = "playing";
    last = performance.now();
    accumulator = 0;
    ui();
    document.activeElement?.blur();
  }
  function pause() {
    if (state === "playing") {
      state = "paused";
      audio.stop();
      ui();
    } else if (state === "paused") {
      audio.unlock();
      state = "playing";
      last = performance.now();
      accumulator = 0;
      ui();
      document.activeElement?.blur();
    }
  }
  function cheat(index) {
    if (campaign.jump(index)) enterStage();
  }
  const input = new Input(
    pause,
    () => {
      if (state === "menu") start();
      else if (state === "clear" && campaign.hasNext) nextStage();
      else if (state === "over" || state === "clear") replay();
    },
    cheat,
  );
  $("start").onclick = start;
  $("pause").onclick = pause;
  $("resume").onclick = pause;
  function enterStage() {
    audio.unlock();
    world = campaign.world;
    state = "playing";
    last = performance.now();
    accumulator = 0;
    ui();
    document.activeElement?.blur();
  }
  function replay() {
    campaign.restart();
    enterStage();
  }
  function nextStage() {
    if (campaign.advance()) enterStage();
  }
  $("restart").onclick = () => {
    if (state === "clear" && !campaign.hasNext) start();
    else replay();
  };
  $("next").onclick = nextStage;
  $("home").onclick = () => {
    state = "menu";
    campaign.start();
    world = campaign.world;
    audio.stop();
    ui();
  };
  for (const id of ["sound", "music"])
    $(id).onclick = () => {
      audio.unlock();
      audio[id] = !audio[id];
      save(`gravity.${id}`, audio[id] ? "on" : "off");
      if (!audio[id]) {
        if (id === "music") audio.stopMusic();
        else audio.stop();
      }
      settings();
    };
  const suspend = () => {
    input.reset();
    if (state === "playing") {
      state = "paused";
      audio.stop();
      ui();
    }
  };
  window.addEventListener("blur", suspend);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
  });
  window.addEventListener("pagehide", suspend);
  let previousAmmo = -1;
  function cockpit() {
    const ammo = world.missiles;
    if (ammo !== previousAmmo) {
      $("ammo").textContent = String(ammo).padStart(2, "0");
      $("missile").classList.toggle("empty", ammo === 0);
      $("missile").setAttribute("aria-disabled", String(ammo === 0));
      $("missile").setAttribute(
        "aria-label",
        ammo === 0
          ? "Mísseis esgotados"
          : `Lançar míssil — ${ammo} disponíveis`,
      );
      if (ammo < previousAmmo) {
        $("missile").classList.remove("launching");
        void $("missile").offsetWidth;
        $("missile").classList.add("launching");
      }
      previousAmmo = ammo;
    }
    $("weaponIndicator").textContent = WEAPONS[world.weapon];
  }
  function loop(now) {
    let elapsed = Math.min((now - last) / 1000 || 0, 0.1);
    last = now;
    if (state === "playing") {
      accumulator += elapsed;
      const controls = input.read();
      let special = input.special;
      while (accumulator >= 1 / 60) {
        world.update(1 / 60, controls, special);
        special = false;
        input.special = false;
        accumulator -= 1 / 60;
      }
      audio.update(elapsed);
      if (world.status !== "playing") {
        audio.stopMusic();
        state = world.status;
        best = Math.max(best, Math.floor(world.score));
        save("gravity.best", String(best));
        ui();
      }
    } else if (state === "menu") {
      world.distance = (world.distance + elapsed * 9) % world.stage.length;
      world.time += elapsed;
    }
    cockpit();
    renderer.draw(world, state === "menu");
    requestAnimationFrame(loop);
  }
  ui();
  requestAnimationFrame(loop);
}
