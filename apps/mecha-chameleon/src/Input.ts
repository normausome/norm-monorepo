export class Input {
  keys = new Set<string>();
  touchMove = { x: 0, y: 0 };
  touchShoot = false;
  touchMelee = false;
  touchDash = false;

  constructor(private overlay: HTMLElement) {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.resetTouch();
    });

    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      this.setupTouchControls();
    }
  }

  private setupTouchControls(): void {
    const container = document.createElement("div");
    container.className = "touch-controls";

    const dpad = document.createElement("div");
    dpad.className = "touch-dpad";
    const dirs = ["up", "down", "left", "right"] as const;
    const dirKeys: Record<(typeof dirs)[number], string> = {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    };
    for (const dir of dirs) {
      const btn = document.createElement("button");
      btn.className = `touch-btn ${dir}`;
      btn.textContent = dir === "up" ? "▲" : dir === "down" ? "▼" : dir === "left" ? "◀" : "▶";
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.keys.add(dirKeys[dir]);
        btn.classList.add("active");
      });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.keys.delete(dirKeys[dir]);
        btn.classList.remove("active");
      });
      dpad.appendChild(btn);
    }

    const actions = document.createElement("div");
    actions.className = "touch-actions";
    const actionBtns: { cls: string; label: string; key: "shoot" | "melee" | "dash" }[] = [
      { cls: "shoot", label: "FIRE", key: "shoot" },
      { cls: "melee", label: "HIT", key: "melee" },
      { cls: "dash", label: "DASH", key: "dash" },
    ];
    for (const { cls, label, key } of actionBtns) {
      const btn = document.createElement("button");
      btn.className = `touch-btn ${cls}`;
      btn.textContent = label;
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (key === "shoot") this.touchShoot = true;
        if (key === "melee") this.touchMelee = true;
        if (key === "dash") this.touchDash = true;
        btn.classList.add("active");
      });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        if (key === "shoot") this.touchShoot = false;
        if (key === "melee") this.touchMelee = false;
        if (key === "dash") this.touchDash = false;
        btn.classList.remove("active");
      });
      actions.appendChild(btn);
    }

    container.appendChild(dpad);
    container.appendChild(actions);
    this.overlay.appendChild(container);
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  moveVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown("KeyA", "ArrowLeft")) x -= 1;
    if (this.isDown("KeyD", "ArrowRight")) x += 1;
    if (this.isDown("KeyW", "ArrowUp")) y -= 1;
    if (this.isDown("KeyS", "ArrowDown")) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  wantsShoot(): boolean {
    return this.isDown("KeyJ", "Space") || this.touchShoot;
  }

  wantsMelee(): boolean {
    return this.isDown("KeyK", "KeyE") || this.touchMelee;
  }

  wantsDash(): boolean {
    return this.isDown("ShiftLeft", "ShiftRight") || this.touchDash;
  }

  resetTouch(): void {
    this.touchShoot = false;
    this.touchMelee = false;
    this.touchDash = false;
  }

  clearFrame(): void {
    // one-shot flags handled by game
  }
}
