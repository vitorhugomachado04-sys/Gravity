// Original four-voice chip scores. MIDI pitches, sixteenth-note grid, 16-bar form.
const REST = null;
export const SCORES = Object.freeze({
  moon: {
    title: "Silent Monolith",
    bpm: 82,
    wave: "triangle",
    roots: [45, 41, 48, 44],
    lead: [
      0,
      REST,
      7,
      REST,
      12,
      REST,
      10,
      REST,
      REST,
      7,
      REST,
      3,
      REST,
      1,
      REST,
      7,
    ],
    answer: [
      12,
      REST,
      19,
      REST,
      15,
      REST,
      13,
      REST,
      12,
      REST,
      10,
      REST,
      7,
      REST,
      REST,
      REST,
    ],
  },
  earth: {
    title: "Last Exit 3027",
    bpm: 124,
    wave: "square",
    roots: [40, 41, 36, 35],
    lead: [0, 7, 12, 7, 1, 7, 13, 7, 0, 7, 12, 10, 8, 7, 1, REST],
    answer: [12, 7, 13, 12, 10, 7, 8, 7, 12, 13, 15, 13, 12, 10, 8, 7],
  },
  mars: {
    title: "No Signal",
    bpm: 68,
    wave: "sine",
    roots: [38, 34, 41, 36],
    lead: [
      12,
      REST,
      REST,
      REST,
      7,
      REST,
      REST,
      REST,
      3,
      REST,
      REST,
      5,
      REST,
      REST,
      REST,
      REST,
    ],
    answer: [
      19,
      REST,
      REST,
      REST,
      17,
      REST,
      REST,
      REST,
      15,
      REST,
      12,
      REST,
      REST,
      REST,
      REST,
      REST,
    ],
  },
  neptune: {
    title: "Pressure Front",
    bpm: 148,
    wave: "square",
    roots: [42, 38, 45, 40],
    lead: [0, 12, 7, 12, 3, 12, 10, 7, 0, 12, 7, 15, 14, 12, 10, 7],
    answer: [12, 19, 15, 19, 10, 17, 14, 17, 12, 19, 15, 22, 21, 19, 17, 14],
  },
  saturn: {
    title: "Falling Around Forever",
    bpm: 132,
    wave: "triangle",
    roots: [36, 38, 40, 42],
    lead: [0, 4, 8, 12, 16, 20, 12, 8, 4, 8, 12, 16, 20, 24, 16, 8],
    answer: [24, 20, 16, 12, 8, 4, 16, 20, 24, 20, 16, 12, 8, 4, 0, REST],
  },
});
export const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
export function scoreEvents(id, step) {
  step = ((step % 256) + 256) % 256;
  const score = SCORES[id] || SCORES.moon,
    bar = Math.floor(step / 16) % 16,
    beat = step % 16,
    section = Math.floor(bar / 4),
    root = score.roots[bar % 4],
    unit = 60 / score.bpm / 4,
    events = [];
  const note = (midi, length, wave, volume, end = midi) =>
    events.push({
      freq: frequency(midi),
      duration: length * unit,
      wave,
      volume,
      end: frequency(end),
    });
  // Intro, response, crest, and a sparse turnaround; the loop has a composed ending.
  const melody = section % 2 ? score.answer : score.lead;
  const pitch = melody[beat];
  if (pitch !== REST && !(section === 3 && bar === 15 && beat >= 12)) {
    note(
      root + 12 + pitch,
      id === "mars" ? 3.4 : id === "moon" ? 1.8 : 0.72,
      score.wave,
      id === "earth" || id === "neptune" ? 0.012 : 0.027,
    );
    if ((id === "moon" || id === "mars") && beat < 12)
      events.push({
        freq: frequency(root + 12 + pitch),
        duration: unit * 1.7,
        wave: "sine",
        volume: 0.007,
        end: frequency(root + 12 + pitch),
        delay: unit * 3,
      });
  }
  const bassBeats =
    id === "mars" ? [0] : id === "moon" ? [0, 8] : [0, 6, 8, 14];
  if (bassBeats.includes(beat))
    note(
      root - (beat === 14 ? 0 : 12),
      id === "mars" ? 9 : 2.4,
      "triangle",
      0.032,
    );
  if (beat === 0 && (id === "moon" || id === "mars" || section === 2)) {
    note(root + 7, id === "mars" ? 12 : 6, "sine", 0.009);
    note(root + 12, id === "mars" ? 12 : 6, "sine", 0.008);
  }
  if (id === "earth" || id === "neptune" || id === "saturn") {
    if (beat % 4 === 0 || (id === "neptune" && section === 2 && beat === 14))
      events.push({
        freq: 125,
        duration: 0.11,
        wave: "sine",
        volume: 0.04,
        end: 38,
      });
    if (beat === 4 || beat === 12) {
      events.push({
        freq: 185,
        duration: 0.085,
        wave: "triangle",
        volume: 0.025,
        end: 65,
      });
      events.push({
        freq: 1550,
        duration: 0.035,
        wave: "square",
        volume: 0.006,
        end: 480,
      });
    }
    if (beat % 2 === (id === "saturn" ? 1 : 0))
      events.push({
        freq: 4200,
        duration: 0.018,
        wave: "square",
        volume: 0.003,
        end: 1900,
      });
  } else if (id === "moon" && section === 2 && beat % 4 === 0)
    events.push({
      freq: 90,
      duration: 0.16,
      wave: "sine",
      volume: 0.018,
      end: 35,
    });
  // Saturn's three-step counter-rhythm slides against the four-beat pulse.
  if (id === "saturn" && step % 3 === 0)
    note(root + 24 + (step % 12), 0.6, "sine", 0.009, root + 25 + (step % 12));
  return events;
}
