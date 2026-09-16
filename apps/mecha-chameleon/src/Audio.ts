export class Audio {
  muted = false;
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  resume(): void {
    if (this.ctx?.state === "suspended") {
      void this.ctx.resume();
    }
  }

  playTone(freq: number, duration: number, type: OscillatorType = "square", volume = 0.08): void {
    if (this.muted) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  shoot(): void {
    this.playTone(880, 0.06, "square", 0.05);
  }

  melee(): void {
    this.playTone(220, 0.1, "sawtooth", 0.07);
  }

  dash(): void {
    this.playTone(440, 0.08, "triangle", 0.04);
  }

  hitPlayer(): void {
    this.playTone(120, 0.15, "sawtooth", 0.1);
  }

  hitBoss(): void {
    this.playTone(160, 0.08, "square", 0.06);
  }

  bossSlam(): void {
    this.playTone(60, 0.25, "sine", 0.12);
  }

  win(): void {
    if (this.muted) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, "sine", 0.08), i * 120);
    });
  }

  lose(): void {
    if (this.muted) return;
    [400, 320, 240].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, "sine", 0.08), i * 180);
    });
  }
}
