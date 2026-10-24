export interface TranscriptResult {
  isFinal: boolean;
  [index: number]: { transcript: string } | undefined;
}

export interface Transcript {
  final: string;
  interim: string;
}

export const transcriptOf = (
  results: ArrayLike<TranscriptResult>,
): Transcript => {
  let final = "";
  let interim = "";

  for (const result of Array.from(results)) {
    const text = result[0]?.transcript ?? "";

    if (result.isFinal) final += text;
    else interim += text;
  }

  return { final: final.trim(), interim: interim.trim() };
};

export const speakable = (markdown: string): string =>
  markdown
    .replace(/```[\s\S]*?```/g, " (a code block) ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/(\*\*|__|\*|_)(\S[^*_]*?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();

export interface VoiceChoice {
  lang: string;
  name: string;
  default: boolean;
  localService: boolean;
}

export const chooseVoice = <Voice extends VoiceChoice>(
  voices: readonly Voice[],
  lang: string,
): Voice | null => {
  const language = lang.toLowerCase();
  const base = language.split("-")[0]!;
  const rank = (voice: Voice) => {
    const spoken = voice.lang.toLowerCase().replace("_", "-");
    const match =
      spoken === language ? 0 : spoken.split("-")[0] === base ? 1 : 2;

    return [match, voice.default ? 0 : 1, voice.localService ? 0 : 1];
  };
  const fitting = voices.filter((voice) => rank(voice)[0]! < 2);

  return (
    [...fitting].sort((a, b) => {
      const left = rank(a);
      const right = rank(b);

      return (
        left[0]! - right[0]! || left[1]! - right[1]! || left[2]! - right[2]!
      );
    })[0] ?? null
  );
};

export interface VoiceSupport {
  listen: boolean;
  speak: boolean;
}

export const voiceSupport = (
  scope: Partial<Record<string, unknown>> | undefined,
): VoiceSupport => ({
  listen:
    scope?.SpeechRecognition !== undefined ||
    scope?.webkitSpeechRecognition !== undefined,
  speak:
    scope?.speechSynthesis !== undefined &&
    scope.SpeechSynthesisUtterance !== undefined,
});
