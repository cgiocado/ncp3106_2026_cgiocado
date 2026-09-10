(function () {
  var PLAYLIST = [
    { title: "A Corner of Memories - Persona 4 ", src: "assets/audio/site-music.mp3" },
    { title: "Track 2 — Heaven by Shihoko Hirata (Persona 4)", src: "assets/audio/track-2.mp3" },
    { title: "Track 3 — Heartbeat, Heartbreak by Shihoko Hirata (Persona 4)", src: "assets/audio/track-3.mp3" },
    { title: "Track 4 — Signs of Love by Shihoko Hirata (Persona 4)", src: "assets/audio/track-4.mp3" },
    { title: "Track 5 — Your Affection by Shihoko Hirata (Persona 4)", src: "assets/audio/track-5.mp3" }
  ];

  var STORAGE_KEY = "cpe-player-state-v1";

  function loadState() {
    var defaults = { trackIndex: 0, currentTime: 0, volume: 0.6, playing: false };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      var parsed = JSON.parse(raw);
      return {
        trackIndex: typeof parsed.trackIndex === "number" ? parsed.trackIndex : defaults.trackIndex,
        currentTime: typeof parsed.currentTime === "number" ? parsed.currentTime : defaults.currentTime,
        volume: typeof parsed.volume === "number" ? parsed.volume : defaults.volume,
        playing: !!parsed.playing
      };
    } catch (e) {
      return defaults;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable, ignore */ }
  }

  var state = loadState();
  if (state.trackIndex < 0 || state.trackIndex >= PLAYLIST.length) state.trackIndex = 0;

  /* ---------- audio element ---------- */
  var audio = new Audio();
  audio.preload = "auto";
  audio.volume = state.volume;

  function setTrack(index, resumeTime) {
    state.trackIndex = ((index % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    audio.src = PLAYLIST[state.trackIndex].src;
    if (resumeTime) {
      audio.currentTime = resumeTime;
    }
    trackNameEl.textContent = PLAYLIST[state.trackIndex].title;
  }

  /* ---------- build widget markup ---------- */
  var wrap = document.createElement("div");
  wrap.className = "cpe-player";
  wrap.innerHTML =
    '<button type="button" id="cpe-player-toggle" class="cpe-player-toggle" aria-expanded="false" aria-controls="cpe-player-panel" aria-label="Open music player">' +
      '<span class="cpe-player-icon" aria-hidden="true">&#9834;</span>' +
    '</button>' +
    '<div id="cpe-player-panel" class="cpe-player-panel" hidden>' +
      '<div class="cpe-player-track" id="cpe-player-track-name"></div>' +
      '<div class="cpe-player-row">' +
        '<button type="button" id="cpe-player-prev" class="cpe-player-btn" aria-label="Previous track">&#9198;</button>' +
        '<button type="button" id="cpe-player-playpause" class="cpe-player-btn cpe-player-btn-main" aria-label="Play">&#9654;</button>' +
        '<button type="button" id="cpe-player-next" class="cpe-player-btn" aria-label="Next track">&#9197;</button>' +
      '</div>' +
      '<div class="cpe-player-volume-row">' +
        '<span class="cpe-player-vol-icon" aria-hidden="true">&#128266;</span>' +
        '<input type="range" id="cpe-player-volume" min="0" max="1" step="0.01" aria-label="Volume">' +
      '</div>' +
    '</div>';

  document.body.appendChild(wrap);

  var toggleBtn   = document.getElementById("cpe-player-toggle");
  var panel       = document.getElementById("cpe-player-panel");
  var trackNameEl = document.getElementById("cpe-player-track-name");
  var prevBtn     = document.getElementById("cpe-player-prev");
  var playBtn     = document.getElementById("cpe-player-playpause");
  var nextBtn     = document.getElementById("cpe-player-next");
  var volumeInput = document.getElementById("cpe-player-volume");

  volumeInput.value = state.volume;
  setTrack(state.trackIndex, state.currentTime);

  /* ---------- play / pause ---------- */
  function updatePlayIcon(isPlaying) {
    playBtn.innerHTML = isPlaying ? "&#10074;&#10074;" : "&#9654;";
    playBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    toggleBtn.classList.toggle("is-playing", isPlaying);
  }

  function play() {
    audio.play().then(function () {
      state.playing = true;
      updatePlayIcon(true);
      saveState(state);
    }).catch(function () {
      /* autoplay blocked until the user interacts — that's fine */
      state.playing = false;
      updatePlayIcon(false);
    });
  }

  function pause() {
    audio.pause();
    state.playing = false;
    updatePlayIcon(false);
    saveState(state);
  }

  playBtn.addEventListener("click", function () {
    if (audio.paused) play(); else pause();
  });

  /* ---------- next / back ---------- */
  function goToTrack(newIndex, autoplay) {
    var wasPlaying = autoplay !== undefined ? autoplay : !audio.paused;
    setTrack(newIndex, 0);
    saveState(state);
    if (wasPlaying) play();
  }

  prevBtn.addEventListener("click", function () {
    goToTrack(state.trackIndex - 1);
  });
  nextBtn.addEventListener("click", function () {
    goToTrack(state.trackIndex + 1);
  });
  audio.addEventListener("ended", function () {
    goToTrack(state.trackIndex + 1, true);
  });

  /* ---------- volume ---------- */
  volumeInput.addEventListener("input", function () {
    var v = parseFloat(volumeInput.value);
    audio.volume = v;
    state.volume = v;
    saveState(state);
  });

  /* ---------- expand / collapse panel ---------- */
  toggleBtn.addEventListener("click", function () {
    var isOpen = panel.hasAttribute("hidden") === false;
    if (isOpen) {
      panel.setAttribute("hidden", "");
      toggleBtn.setAttribute("aria-expanded", "false");
    } else {
      panel.removeAttribute("hidden");
      toggleBtn.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("click", function (e) {
    if (!wrap.contains(e.target) && !panel.hasAttribute("hidden")) {
      panel.setAttribute("hidden", "");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- persist playback position periodically ---------- */
  var lastSave = 0;
  audio.addEventListener("timeupdate", function () {
    var now = Date.now();
    if (now - lastSave > 3000) {
      state.currentTime = audio.currentTime;
      saveState(state);
      lastSave = now;
    }
  });

  window.addEventListener("pagehide", function () {
    state.currentTime = audio.currentTime;
    saveState(state);
  });

  /* ---------- resume on load if it was playing on the last page ---------- */
  if (state.playing) {
    play();
  } else {
    updatePlayIcon(false);
  }
})();
