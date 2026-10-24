import { useCallback, useEffect, useRef, useState } from "react";

import {
  speakable,
  Speaker,
  transcriptOf,
  type TranscriptResult,
  voiceSupport,
} from "@/features/interview/utils";

interface RecognitionEvent {
  results: ArrayLike<TranscriptResult>;
}

interface RecognitionErrorEvent {
  error: string;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;

interface VoiceScope {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
}

const LANGUAGE = "en-US";
const RESTART_MS = 250;
const QUIET_CYCLES = 4;

export interface SpokenReply {
  id: string;
  text: string;
}

interface VoiceModeOptions {
  active: boolean;
  canListen: boolean;
  replies: readonly SpokenReply[];
  onUtterance: (text: string) => void;
  onProblem: (message: string) => void;
}

export interface VoiceMode {
  listening: boolean;
  speaking: boolean;
  caption: string;
  skip: () => void;
}

export const useVoiceMode = ({
  active,
  canListen,
  replies,
  onUtterance,
  onProblem,
}: VoiceModeOptions): VoiceMode => {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const handlers = useRef({ onUtterance, onProblem });
  const heard = useRef(new Set<string>());
  const speakerRef = useRef<Speaker | null>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    handlers.current = { onUtterance, onProblem };
  });

  useEffect(() => {
    if (!voiceSupport(window as never).speak) return;

    const speaker = new Speaker(LANGUAGE, setSpeaking);

    speakerRef.current = speaker;

    return () => {
      speaker.dispose();
      speakerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      wasActive.current = false;
      speakerRef.current?.cancel();

      return;
    }

    if (!wasActive.current) {
      wasActive.current = true;
      for (const reply of replies) heard.current.add(reply.id);

      return;
    }

    for (const reply of replies) {
      if (heard.current.has(reply.id)) continue;

      heard.current.add(reply.id);

      const text = speakable(reply.text);

      if (text) speakerRef.current?.say(text);
    }
  }, [active, replies]);

  useEffect(() => {
    if (!active || !canListen || speaking) return;

    const scope = window as unknown as VoiceScope;
    const Recognizer = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;

    if (!Recognizer) return;

    const recognition = new Recognizer();
    let delivered = false;
    let quiet = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    recognition.lang = LANGUAGE;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const { final, interim } = transcriptOf(event.results);

      setCaption(final || interim);

      if (final && !delivered) {
        delivered = true;
        quiet = 0;
        setCaption("");
        recognition.stop();
        handlers.current.onUtterance(final);
      }
    };

    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        stopped = true;
        handlers.current.onProblem(
          "The microphone is blocked. Allow it in your browser to talk to the interviewer.",
        );
      } else if (event.error === "no-speech") {
        quiet += 1;
      }
    };

    recognition.onend = () => {
      setListening(false);
      setCaption("");

      if (stopped || delivered) return;

      if (quiet >= QUIET_CYCLES) {
        stopped = true;
        handlers.current.onProblem(
          "Voice mode stopped after a quiet while. Turn it on to carry on.",
        );

        return;
      }

      retry = setTimeout(() => {
        if (stopped) return;

        try {
          recognition.start();
        } catch {
          stopped = true;
        }
      }, RESTART_MS);
    };

    try {
      recognition.start();
    } catch {
      stopped = true;
    }

    return () => {
      stopped = true;
      clearTimeout(retry);
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      setListening(false);
      setCaption("");
    };
  }, [active, canListen, speaking]);

  const skip = useCallback(() => speakerRef.current?.cancel(), []);

  return { listening, speaking, caption, skip };
};
