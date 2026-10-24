import { chooseVoice } from "./voice";

export class Speaker {
  private queue: string[] = [];

  private generation = 0;

  private busy = false;

  constructor(
    private readonly lang: string,
    private readonly onChange: (speaking: boolean) => void,
  ) {}

  public say(text: string): void {
    this.queue.push(text);

    if (!this.busy) this.next(this.generation);
  }

  public cancel(): void {
    this.generation += 1;
    this.queue = [];
    this.busy = false;
    window.speechSynthesis.cancel();
    this.onChange(false);
  }

  public dispose(): void {
    this.generation += 1;
    this.queue = [];
    this.busy = false;
    window.speechSynthesis.cancel();
  }

  private next(generation: number): void {
    if (generation !== this.generation) return;

    const text = this.queue.shift();

    if (text === undefined) {
      this.busy = false;
      this.onChange(false);

      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = chooseVoice(window.speechSynthesis.getVoices(), this.lang);
    const advance = () => this.next(generation);

    utterance.lang = this.lang;
    if (voice) utterance.voice = voice;
    utterance.onend = advance;
    utterance.onerror = advance;
    this.busy = true;
    this.onChange(true);
    window.speechSynthesis.speak(utterance);
  }
}
