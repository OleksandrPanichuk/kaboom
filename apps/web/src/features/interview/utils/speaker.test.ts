import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { Speaker } from "./speaker";

class FakeUtterance {
  public lang = "";

  public voice: unknown = null;

  public onend: (() => void) | null = null;

  public onerror: (() => void) | null = null;

  constructor(public readonly text: string) {}
}

interface Fake {
  spoken: FakeUtterance[];
  cancelled: number;
}

const install = (): Fake => {
  const fake: Fake = { spoken: [], cancelled: 0 };

  Object.assign(globalThis, {
    SpeechSynthesisUtterance: FakeUtterance,
    window: {
      speechSynthesis: {
        getVoices: () => [],
        speak: (utterance: FakeUtterance) => fake.spoken.push(utterance),
        cancel: () => {
          fake.cancelled += 1;
        },
      },
    },
  });

  return fake;
};

let fake: Fake;
let states: boolean[];
let speaker: Speaker;

beforeEach(() => {
  fake = install();
  states = [];
  speaker = new Speaker("en-US", (speaking) => states.push(speaking));
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
});

describe("Speaker", () => {
  test("speaks one thing at a time, in order, and says when it is done", () => {
    speaker.say("First.");
    speaker.say("Second.");

    expect(fake.spoken.map((item) => item.text)).toEqual(["First."]);

    fake.spoken[0]!.onend?.();

    expect(fake.spoken.map((item) => item.text)).toEqual(["First.", "Second."]);

    fake.spoken[1]!.onend?.();

    expect(states).toEqual([true, true, false]);
  });

  test("a failing utterance does not hold up the next", () => {
    speaker.say("A");
    speaker.say("B");
    fake.spoken[0]!.onerror?.();

    expect(fake.spoken.map((item) => item.text)).toEqual(["A", "B"]);
  });

  test("cancelling drops what was queued and stops reporting speech", () => {
    speaker.say("A");
    speaker.say("B");
    speaker.cancel();

    expect(fake.cancelled).toBe(1);
    expect(states.at(-1)).toBe(false);
  });

  test("the end of a cancelled utterance does not start another over a new one", () => {
    speaker.say("A");

    const stale = fake.spoken[0]!;

    speaker.cancel();
    speaker.say("B");
    stale.onend?.();

    expect(fake.spoken.map((item) => item.text)).toEqual(["A", "B"]);
    expect(states.at(-1)).toBe(true);
  });

  test("disposing stops speech without reporting it", () => {
    speaker.say("A");
    states.length = 0;
    speaker.dispose();

    expect(fake.cancelled).toBe(1);
    expect(states).toEqual([]);
  });
});
