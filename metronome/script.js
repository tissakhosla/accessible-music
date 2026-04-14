(() => {
  const DEFAULT_TEMPO = 120;
  const MIN_TEMPO = 10;
  const MAX_TEMPO = 300;
  const LOOKAHEAD = 25; // ms between scheduler runs
  const SCHEDULE_AHEAD_TIME = 0.1; // seconds to schedule ahead

  const tempoDisplay = document.getElementById("tempo-value");
  const keypad = document.querySelector(".controls");
  const playToggle = document.getElementById("play-toggle");
  const playLabel = document.getElementById("play-label");
  const playIcon = document.getElementById("play-icon");

  let audioCtx;
  let isPlaying = false;
  let nextTickTime = 0;
  let timerId = null;
  let tempo = DEFAULT_TEMPO;
  let tempoBuffer = String(DEFAULT_TEMPO);

  function ensureAudioCtx() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function updateTempoDisplay() {
    tempoDisplay.textContent = tempoBuffer || String(tempo);
  }

  function applyTempoFromBuffer() {
    const numeric = parseInt(tempoBuffer, 10);
    if (Number.isNaN(numeric)) {
      updateTempoDisplay();
      return;
    }

    if (numeric > MAX_TEMPO) {
      tempo = MAX_TEMPO;
      tempoBuffer = String(MAX_TEMPO);
    } else if (numeric >= MIN_TEMPO) {
      tempo = numeric;
    }

    updateTempoDisplay();
  }

  function handleKeypadInput(key) {
    if (key === "CLR") {
      tempo = DEFAULT_TEMPO;
      tempoBuffer = "";
      updateTempoDisplay();
      return;
    }

    if (key === "DEL") {
      tempoBuffer = tempoBuffer.slice(0, -1);
      applyTempoFromBuffer();
      return;
    }

    if (tempoBuffer.length >= 3) {
      return;
    }

    tempoBuffer += key;
    if (tempoBuffer.length > 1) {
      tempoBuffer = tempoBuffer.replace(/^0+/, "");
      if (tempoBuffer === "") {
        tempoBuffer = "0";
      }
    }
    applyTempoFromBuffer();
  }

  function scheduleTick(time) {
    const osc = audioCtx.createOscillator();
    const envelope = audioCtx.createGain();

    osc.frequency.value = 1000;
    envelope.gain.setValueAtTime(1, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(envelope);
    envelope.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  function scheduler() {
    if (!isPlaying) {
      return;
    }

    while (nextTickTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleTick(nextTickTime);
      const secondsPerBeat = 60 / tempo;
      nextTickTime += secondsPerBeat;
    }

    timerId = window.setTimeout(scheduler, LOOKAHEAD);
  }

  function startMetronome() {
    ensureAudioCtx();
    nextTickTime = audioCtx.currentTime;
    isPlaying = true;
    scheduler();
    updatePlayButton();
  }

  function stopMetronome() {
    isPlaying = false;
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = null;
    }
    updatePlayButton();
  }

  function updatePlayButton() {
    if (isPlaying) {
      playLabel.textContent = "Pause";
      playIcon.setAttribute("d", "M7 5h3v14H7zm7 0h3v14h-3z");
    } else {
      playLabel.textContent = "Play";
      playIcon.setAttribute("d", "M8 5v14l11-7z");
    }
  }

  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-key]");
    if (!button) {
      return;
    }
    handleKeypadInput(button.dataset.key);
  });

  playToggle.addEventListener("click", () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  });

  // Update icon and display on load
  updatePlayButton();
  updateTempoDisplay();
})();
