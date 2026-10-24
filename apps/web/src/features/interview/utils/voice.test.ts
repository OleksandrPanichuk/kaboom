import { describe, expect, test } from "bun:test";

import {
  chooseVoice,
  speakable,
  transcriptOf,
  type TranscriptResult,
  voiceSupport,
} from "./voice";

const result = (transcript: string, isFinal: boolean): TranscriptResult => ({
  isFinal,
  0: { transcript },
});

describe("transcriptOf", () => {
  test("splits what is settled from what may still change", () => {
    expect(
      transcriptOf([result("How many users ", true), result("a day", false)]),
    ).toEqual({ final: "How many users", interim: "a day" });
  });

  test("is empty before anything is heard", () => {
    expect(transcriptOf([])).toEqual({ final: "", interim: "" });
  });
});

describe("speakable", () => {
  test("reads a reply without its markdown", () => {
    expect(
      speakable("**Good question.** See [the docs](https://x.test) for `rps`."),
    ).toBe("Good question. See the docs for rps.");
  });

  test("does not read a code block aloud", () => {
    expect(speakable("Try this:\n```ts\nconst a = 1;\n```\nThen scale.")).toBe(
      "Try this: (a code block) Then scale.",
    );
  });

  test("drops list markers and headings", () => {
    expect(speakable("# Plan\n- cache reads\n- shard writes\n1. measure")).toBe(
      "Plan cache reads shard writes measure",
    );
  });
});

describe("chooseVoice", () => {
  const voice = (
    lang: string,
    name: string,
    patch: Partial<{ default: boolean; localService: boolean }> = {},
  ) => ({ lang, name, default: false, localService: true, ...patch });

  test("prefers the exact language, then the same language", () => {
    const voices = [
      voice("de-DE", "German"),
      voice("en-GB", "British"),
      voice("en-US", "American"),
    ];

    expect(chooseVoice(voices, "en-US")?.name).toBe("American");
    expect(chooseVoice(voices, "en-AU")?.name).toBe("British");
  });

  test("prefers the browser's default, then one that runs on the device", () => {
    const voices = [
      voice("en-US", "Cloud", { localService: false }),
      voice("en-US", "Local"),
      voice("en-US", "Default", { default: true }),
    ];

    expect(chooseVoice(voices, "en-US")?.name).toBe("Default");
    expect(chooseVoice(voices.slice(0, 2), "en-US")?.name).toBe("Local");
  });

  test("answers null when no voice speaks the language", () => {
    expect(chooseVoice([voice("de-DE", "German")], "en-US")).toBeNull();
  });
});

describe("voiceSupport", () => {
  test("needs a recogniser to listen and a synthesiser to speak", () => {
    expect(voiceSupport({ webkitSpeechRecognition: class {} })).toEqual({
      listen: true,
      speak: false,
    });
    expect(
      voiceSupport({
        speechSynthesis: {},
        SpeechSynthesisUtterance: class {},
      }),
    ).toEqual({ listen: false, speak: true });
    expect(voiceSupport(undefined)).toEqual({ listen: false, speak: false });
  });
});
