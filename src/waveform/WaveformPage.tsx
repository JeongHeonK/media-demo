import {
  type ChangeEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { computePeaks } from "./peaks";
import { playbackTime, timeToX, xToTime } from "./timeline";
import "./waveform.css";

const WAVE_COLOR = "#14a38b";
const PLAYHEAD_COLOR = "#e4572e";
// Dark edge keeps the playhead >= 3:1 where it crosses the waveform.
const PLAYHEAD_EDGE_COLOR = "#14202e";

const SAMPLES = [
  { file: "silence-then-sine.wav", label: "무음 → 사인파" },
  { file: "speech.m4a", label: "음성" },
  { file: "beats.m4a", label: "비트" },
];

export function WaveformPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const waveRef = useRef<OffscreenCanvas | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef(0);
  const pickRef = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState("");

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      sourceRef.current?.stop();
    },
    [],
  );

  function currentTime() {
    const audio = audioRef.current;
    const buffer = bufferRef.current;
    if (!audio || !buffer || !sourceRef.current) return offsetRef.current;
    return playbackTime(
      audio.currentTime,
      startedAtRef.current,
      offsetRef.current,
      buffer.duration,
    );
  }

  function draw(time: number) {
    const canvas = canvasRef.current;
    const wave = waveRef.current;
    const buffer = bufferRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !wave || !buffer || !g) return;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(wave, 0, 0);
    const x = timeToX(time, buffer.duration, canvas.width);
    g.fillStyle = PLAYHEAD_EDGE_COLOR;
    g.fillRect(
      x - 2 * devicePixelRatio,
      0,
      4 * devicePixelRatio,
      canvas.height,
    );
    g.fillStyle = PLAYHEAD_COLOR;
    g.fillRect(x - devicePixelRatio, 0, 2 * devicePixelRatio, canvas.height);
  }

  function start(offset: number) {
    const audio = audioRef.current;
    const buffer = bufferRef.current;
    if (!audio || !buffer) return;
    const source = new AudioBufferSourceNode(audio, { buffer });
    source.connect(audio.destination);
    source.start(0, offset);
    sourceRef.current = source;
    startedAtRef.current = audio.currentTime;
    offsetRef.current = offset;
  }

  function stop() {
    cancelAnimationFrame(rafRef.current);
    sourceRef.current?.stop();
    sourceRef.current = null;
    setPlaying(false);
  }

  function tick() {
    const buffer = bufferRef.current;
    if (!buffer) return;
    const time = currentTime();
    if (time >= buffer.duration) {
      stop();
      offsetRef.current = 0;
      draw(0);
      return;
    }
    draw(time);
    rafRef.current = requestAnimationFrame(tick);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Without this, picking the same file again fires no change event.
    e.target.value = "";
    if (!file) return;
    await load(file.arrayBuffer(), file.name);
  }

  async function load(data: Promise<ArrayBuffer>, label: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pick = ++pickRef.current;
    stop();
    offsetRef.current = 0;
    audioRef.current ??= new AudioContext();
    let buffer: AudioBuffer;
    try {
      buffer = await audioRef.current.decodeAudioData(await data);
    } catch {
      if (pick !== pickRef.current) return;
      // Play may have been pressed on the previous file while this one loaded.
      stop();
      offsetRef.current = 0;
      draw(0);
      setSource(`불러오지 못했습니다: ${label}`);
      return;
    }
    if (pick !== pickRef.current) return;
    // Play may have been pressed on the previous file while this one decoded.
    stop();
    offsetRef.current = 0;
    bufferRef.current = buffer;

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const wave = new OffscreenCanvas(canvas.width, canvas.height);
    const g = wave.getContext("2d");
    if (!g) return;
    const { min, max } = computePeaks(buffer.getChannelData(0), wave.width);
    const half = wave.height / 2;
    g.fillStyle = WAVE_COLOR;
    for (let x = 0; x < wave.width; x++) {
      const top = (1 - max[x]) * half;
      const bottom = (1 - min[x]) * half;
      g.fillRect(x, top, 1, Math.max(1, bottom - top));
    }
    waveRef.current = wave;
    draw(0);
    setLoaded(true);
    setSource(`Loaded: ${label}`);
  }

  function togglePlay() {
    if (sourceRef.current) {
      offsetRef.current = currentTime();
      stop();
      draw(offsetRef.current);
      return;
    }
    if (audioRef.current?.state === "suspended") void audioRef.current.resume();
    start(offsetRef.current);
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }

  function handleSeek(e: MouseEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget;
    const buffer = bufferRef.current;
    if (!buffer) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
    const time = xToTime(x, canvas.width, buffer.duration);
    if (sourceRef.current) {
      sourceRef.current.stop();
      start(time);
      return;
    }
    offsetRef.current = time;
    draw(time);
  }

  return (
    <main className="waveform">
      <header className="waveform-header">
        <h1>WebAudio Waveform</h1>
        <p>
          Decode an audio file in the browser, draw its peaks, and click
          anywhere to seek.
        </p>
      </header>
      <label className="waveform-picker">
        <input
          className="visually-hidden"
          type="file"
          accept="audio/*"
          onChange={handleFile}
        />
        {loaded ? "Choose another file" : "Choose an audio file"}
      </label>
      <div className="waveform-samples">
        <span className="waveform-hint">Or try a sample:</span>
        {SAMPLES.map(({ file, label }) => (
          <button
            key={file}
            type="button"
            className="waveform-sample"
            onClick={() =>
              load(
                fetch(`${import.meta.env.BASE_URL}samples/${file}`).then(
                  (r) => {
                    if (!r.ok) throw new Error(`${r.status}`);
                    return r.arrayBuffer();
                  },
                ),
                label,
              )
            }
          >
            {label}
          </button>
        ))}
      </div>
      {source ? (
        <p className="waveform-hint waveform-source">{source}</p>
      ) : null}
      <div className="waveform-card" data-loaded={loaded}>
        <canvas
          ref={canvasRef}
          className="waveform-canvas"
          onClick={handleSeek}
        />
        {loaded ? null : (
          <p className="waveform-empty">Your waveform will appear here.</p>
        )}
      </div>
      <div className="waveform-controls">
        <button
          type="button"
          className="waveform-play"
          onClick={togglePlay}
          disabled={!loaded}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <p className="waveform-hint">
          Click the waveform to jump to that moment.
        </p>
      </div>
    </main>
  );
}
