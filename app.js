/**
 * Countdown Timer Logic
 * High precision ticker with Web Audio API chime, progress calculation, and confetti.
 */

// Target Configuration
const DEFAULT_CONFIG = {
  title: 'Target: March 30, 2027',
  // Target: March 30, 2027 00:00:00
  targetTimestamp: new Date(2027, 2, 30, 0, 0, 0).getTime(),
  // Initial reference start time (Nov 24, 2026 or when first launched)
  startTimestamp: new Date(2026, 10, 24, 2, 54, 0).getTime(),
  soundEnabled: true,
  theme: 'dark'
};

class CountdownApp {
  constructor() {
    this.config = this.loadConfig();
    this.elements = {};
    this.audioCtx = null;
    this.isCelebrated = false;
    this.confettiParticles = [];
    this.animationFrameId = null;

    this.cacheDOMElements();
    this.bindEvents();
    this.applyTheme(this.config.theme);
    this.initURLParams();
    this.startTicker();
  }

  loadConfig() {
    try {
      const stored = localStorage.getItem('countdown_timer_config');
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  saveConfig() {
    try {
      localStorage.setItem('countdown_timer_config', JSON.stringify(this.config));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  cacheDOMElements() {
    this.elements = {
      days: document.getElementById('days'),
      hours: document.getElementById('hours'),
      minutes: document.getElementById('minutes'),
      seconds: document.getElementById('seconds'),
      millis: document.getElementById('millis-display'),
      daysSub: document.getElementById('days-sub'),
      eventTitle: document.getElementById('event-title'),
      targetDisplay: document.getElementById('target-date-display'),
      timezoneBadge: document.getElementById('timezone-badge'),
      progressBar: document.getElementById('progress-bar'),
      progressPercent: document.getElementById('progress-percent'),
      startDateLabel: document.getElementById('start-date-label'),
      endDateLabel: document.getElementById('end-date-label'),
      statTotalDays: document.getElementById('stat-total-days'),
      statTotalHours: document.getElementById('stat-total-hours'),
      statTotalMinutes: document.getElementById('stat-total-minutes'),
      statTotalSeconds: document.getElementById('stat-total-seconds'),
      btnTheme: document.getElementById('btn-theme-toggle'),
      btnSound: document.getElementById('btn-sound-toggle'),
      soundText: document.getElementById('sound-btn-text'),
      btnShare: document.getElementById('btn-share'),
      btnCustomize: document.getElementById('btn-customize'),
      modal: document.getElementById('custom-modal'),
      btnCloseModal: document.getElementById('btn-close-modal'),
      btnResetDefault: document.getElementById('btn-reset-default'),
      editForm: document.getElementById('edit-form'),
      inputTitle: document.getElementById('input-title'),
      inputDate: document.getElementById('input-date'),
      inputTime: document.getElementById('input-time'),
      canvas: document.getElementById('confetti-canvas')
    };
  }

  bindEvents() {
    this.elements.btnTheme.addEventListener('click', () => this.toggleTheme());
    this.elements.btnSound.addEventListener('click', () => this.toggleSound());
    this.elements.btnShare.addEventListener('click', () => this.copyShareLink());
    this.elements.btnCustomize.addEventListener('click', () => this.openModal());
    this.elements.btnCloseModal.addEventListener('click', () => this.closeModal());
    this.elements.btnResetDefault.addEventListener('click', () => this.resetDefault());
    this.elements.editForm.addEventListener('submit', (e) => this.handleCustomSave(e));

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  initURLParams() {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('target');
    const titleParam = params.get('title');

    if (dateParam) {
      const parsedTime = Date.parse(dateParam);
      if (!isNaN(parsedTime)) {
        this.config.targetTimestamp = parsedTime;
      }
    }
    if (titleParam) {
      this.config.title = titleParam;
    }

    this.updateTargetUI();
  }

  updateTargetUI() {
    const targetDate = new Date(this.config.targetTimestamp);
    this.elements.eventTitle.textContent = this.config.title;
    
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    this.elements.targetDisplay.textContent = `Counting down to ${targetDate.toLocaleDateString(undefined, options)}`;
    this.elements.endDateLabel.textContent = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Display local timezone
    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    this.elements.timezoneBadge.textContent = tzName;
  }

  startTicker() {
    const tick = () => {
      this.updateCountdown();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  updateCountdown() {
    const now = Date.now();
    const remaining = this.config.targetTimestamp - now;

    if (remaining <= 0) {
      this.handleComplete();
      return;
    }

    // Calculations
    const totalSeconds = Math.floor(remaining / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const days = totalDays;
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;
    const millis = Math.floor(remaining % 1000);

    // Update main units
    this.elements.days.textContent = String(days).padStart(3, '0');
    this.elements.hours.textContent = String(hours).padStart(2, '0');
    this.elements.minutes.textContent = String(minutes).padStart(2, '0');
    this.elements.seconds.textContent = String(seconds).padStart(2, '0');
    this.elements.millis.textContent = `${String(millis).padStart(3, '0')} ms`;

    // Months approximation
    const approxMonths = (days / 30.4375).toFixed(1);
    this.elements.daysSub.textContent = `~${approxMonths} months left`;

    // Progress bar
    const start = this.config.startTimestamp;
    const end = this.config.targetTimestamp;
    const totalDuration = end - start;
    const elapsed = now - start;
    let percent = 0;
    if (totalDuration > 0) {
      percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    }
    this.elements.progressBar.style.width = `${percent.toFixed(2)}%`;
    this.elements.progressPercent.textContent = `${percent.toFixed(2)}%`;

    // Metrics breakdown
    this.elements.statTotalDays.textContent = totalDays.toLocaleString();
    this.elements.statTotalHours.textContent = totalHours.toLocaleString();
    this.elements.statTotalMinutes.textContent = totalMinutes.toLocaleString();
    this.elements.statTotalSeconds.textContent = totalSeconds.toLocaleString();
  }

  handleComplete() {
    this.elements.days.textContent = '000';
    this.elements.hours.textContent = '00';
    this.elements.minutes.textContent = '00';
    this.elements.seconds.textContent = '00';
    this.elements.millis.textContent = '000 ms';
    this.elements.progressBar.style.width = '100%';
    this.elements.progressPercent.textContent = '100.00%';
    this.elements.targetDisplay.textContent = 'The countdown target has arrived!';

    if (!this.isCelebrated) {
      this.isCelebrated = true;
      if (this.config.soundEnabled) {
        this.playMilestoneChime();
      }
      this.launchConfetti();
    }
  }

  toggleTheme() {
    const nextTheme = this.config.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  }

  applyTheme(theme) {
    this.config.theme = theme;
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';
    this.saveConfig();
  }

  toggleSound() {
    this.config.soundEnabled = !this.config.soundEnabled;
    this.elements.soundText.textContent = `Sound: ${this.config.soundEnabled ? 'On' : 'Off'}`;
    this.saveConfig();

    if (this.config.soundEnabled) {
      this.playBeep(880, 0.1); // Quick feedback chirp
    }
  }

  playMilestoneChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audioCtx) this.audioCtx = new AudioContext();

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        setTimeout(() => this.playBeep(freq, 0.4), index * 180);
      });
    } catch (e) {
      console.warn('Audio chime could not be played', e);
    }
  }

  playBeep(freq, duration = 0.2) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!this.audioCtx) this.audioCtx = new AudioContext();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy might require interaction
    }
  }

  openModal() {
    const d = new Date(this.config.targetTimestamp);
    this.elements.inputTitle.value = this.config.title;
    
    // Format YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.elements.inputDate.value = `${yyyy}-${mm}-${dd}`;

    // Format HH:MM
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    this.elements.inputTime.value = `${hours}:${minutes}`;

    this.elements.modal.removeAttribute('hidden');
  }

  closeModal() {
    this.elements.modal.setAttribute('hidden', '');
  }

  handleCustomSave(e) {
    e.preventDefault();
    const title = this.elements.inputTitle.value.trim() || 'My Target Countdown';
    const dateStr = this.elements.inputDate.value;
    const timeStr = this.elements.inputTime.value || '00:00';

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const targetDate = new Date(year, month - 1, day, hours, minutes, 0);

    this.config.title = title;
    this.config.targetTimestamp = targetDate.getTime();
    this.config.startTimestamp = Date.now();
    this.isCelebrated = false;
    this.saveConfig();

    this.updateTargetUI();
    this.closeModal();
  }

  resetDefault() {
    this.config = { ...DEFAULT_CONFIG };
    this.isCelebrated = false;
    this.saveConfig();
    this.updateTargetUI();
    this.closeModal();
  }

  copyShareLink() {
    const url = new URL(window.location.href);
    const targetISO = new Date(this.config.targetTimestamp).toISOString();
    url.searchParams.set('target', targetISO);
    url.searchParams.set('title', this.config.title);

    navigator.clipboard.writeText(url.toString()).then(() => {
      alert('Link copied to clipboard! You can share this exact countdown.');
    }).catch(() => {
      prompt('Copy this link to share:', url.toString());
    });
  }

  /* Confetti Particle Engine */
  resizeCanvas() {
    const canvas = this.elements.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  launchConfetti() {
    const canvas = this.elements.canvas;
    this.resizeCanvas();
    const ctx = canvas.getContext('2d');
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

    for (let i = 0; i < 150; i++) {
      this.confettiParticles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8,
        gravity: 0.35,
        opacity: 1
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.confettiParticles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rot += p.rotSpeed;
        p.opacity -= 0.005;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        if (p.opacity <= 0) {
          this.confettiParticles.splice(index, 1);
        }
      });

      if (this.confettiParticles.length > 0) {
        requestAnimationFrame(render);
      }
    };
    render();
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  new CountdownApp();
});
