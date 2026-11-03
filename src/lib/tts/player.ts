// Gapless playback of generated sentences on the Web Audio clock (task 13.1).
// Sentence n + 1 is scheduled to start exactly when sentence n (and the pause
// after it) ends, as soon as its audio is ready; only one sentence is lined up
// beyond the one playing. If it is not ready in time it starts the moment it
// is, and the listener sees "waiting". Kept apart from React so it can be
// tested and measured with a fake audio clock (src/lib/tts/player.test.ts).
import type { PrefetchQueue } from "./prefetch";

export interface GeneratedAudio {
  pcm: Float32Array;
  sampleRate: number;
}

/** The part of AudioContext the player uses. */
export interface AudioOut {
  readonly currentTime: number;
  readonly destination: AudioNode;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer;
  createBufferSource(): AudioBufferSourceNode;
}

export interface PlayerEvents {
  /** The sentence now heard (or about to be). */
  onIndex(index: number): void;
  /** Waiting for the sentence to be heard to be generated. */
  onWaiting(waiting: boolean): void;
  onFinished(): void;
  onFailed(): void;
  /** Called each time a sentence is scheduled (measurements). */
  onScheduled?(index: number, startAt: number, duration: number): void;
}

export interface SentencePlayer {
  /** Stops anything scheduled and plays from sentence `at`. */
  start(at: number): void;
  /** Stops anything playing or scheduled. */
  stop(): void;
}

export function createSentencePlayer({
  output,
  queue,
  count,
  gapSeconds,
  events,
}: {
  output: () => AudioOut;
  queue: PrefetchQueue<GeneratedAudio>;
  count: () => number;
  /** Silence added after each sentence (part of the text's rhythm, as in the MP3). */
  gapSeconds: number;
  events: PlayerEvents;
}): SentencePlayer {
  const nodes = new Set<AudioBufferSourceNode>();
  /** Audio-clock end of each scheduled sentence (its pause included). */
  const ends = new Map<number, number>();
  let token = 0;

  function silence() {
    ends.clear();
    for (const node of nodes) {
      node.onended = null;
      try {
        node.stop();
      } catch {
        // Never started.
      }
      node.disconnect();
    }
    nodes.clear();
  }

  function fail(mine: number) {
    if (mine !== token) return;
    token++;
    silence();
    events.onWaiting(false);
    events.onFailed();
  }

  async function schedule(at: number, mine: number, when: number | null) {
    let audio: GeneratedAudio;
    try {
      audio = await queue.get(at);
    } catch {
      return fail(mine);
    }
    if (mine !== token) return;
    let out: AudioOut;
    let node: AudioBufferSourceNode;
    try {
      out = output();
      const buffer = out.createBuffer(1, audio.pcm.length + Math.round(gapSeconds * audio.sampleRate), audio.sampleRate);
      buffer.copyToChannel(audio.pcm as Float32Array<ArrayBuffer>, 0);
      node = out.createBufferSource();
      node.buffer = buffer;
      node.connect(out.destination);
    } catch {
      return fail(mine);
    }
    const now = out.currentTime;
    const late = when === null || when <= now;
    const startAt = late ? now : when;
    const duration = node.buffer!.duration;
    ends.set(at, startAt + duration);
    node.onended = () => {
      if (mine !== token) return;
      nodes.delete(node);
      ends.delete(at);
      if (at + 1 >= count()) {
        token++;
        events.onFinished();
        return;
      }
      events.onIndex(at + 1);
      const nextEnd = ends.get(at + 1);
      // The next sentence was ready and starts now: line up the one after it.
      if (nextEnd !== undefined) {
        if (at + 2 < count()) void schedule(at + 2, mine, nextEnd);
      } else events.onWaiting(true);
    };
    nodes.add(node);
    node.start(startAt);
    events.onScheduled?.(at, startAt, duration);
    if (late) {
      // It plays now: the first sentence, or the generation was slower than the playback.
      events.onIndex(at);
      events.onWaiting(false);
      if (at + 1 < count()) void schedule(at + 1, mine, startAt + duration);
    }
  }

  return {
    start(at) {
      const mine = ++token;
      silence();
      events.onIndex(at);
      events.onWaiting(true);
      void schedule(at, mine, null);
    },
    stop() {
      token++;
      silence();
    },
  };
}
