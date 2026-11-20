(() => {
  "use strict";
  const canvas = document.getElementById("game"),
    ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id),
    rand = (a, b) => Math.random() * (b - a) + a,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let W = 0,
    H = 0,
    DPR = 1,
    last = 0,
    active = false,
    paused = false,
    choosing = false,
    muted = true,
    audio = null,
    musicEnabled = true,
    hudElapsed = 0,
    toastTimer = 0,
    victoryMode = null;
  const MAX_ENEMIES = 72,
    MAX_SONG_MONSTERS = 8,
    MAX_ORBS = 80;
  const keys = new Set(),
    pointer = { x: 0, y: 0, down: false, seen: false };
  const state = {
    player: null,
    enemies: [],
    bullets: [],
    hostile: [],
    orbs: [],
    particles: [],
    rocks: [],
    drones: [],
    arcs: [],
    weapon: "pulse",
    weaponLevels: { scatter: 0, pierce: 0 },
    score: 0,
    kills: 0,
    wave: 1,
    level: 1,
    xp: 0,
    nextXp: 36,
    time: 0,
    spawn: 0,
    pickupSpawn: 5.4,
    healthSpawn: 12,
    eventTimer: 20,
    event: null,
    songSpawn: 8,
    songQueue: [],
    songPlaying: false,
    songEndTimer: 0,
    songCurrent: null,
    bossWave: 0,
    combo: 0,
    comboTimer: 0,
    shake: 0,
    freezePulse: 0,
    scoreMilestoneShown: false,
    scoreChoiceShown: false,
    upgrades: {
      damage: 0,
      rate: 0,
      speed: 0,
      hull: 0,
      magnet: 0,
      extra: 0,
      thorns: 0,
      explosive: 0,
      frost: 0,
      chain: 0,
      shield: 0,
      volley: 0,
      nova: 0,
    },
    mobile: { x: 0, y: 0 },
    touchFire: false,
  };
  let best = Number(localStorage.getItem("void-runner-best") || 0);
  $("best").textContent = String(best).padStart(6, "0");
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 1.25);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (state.player) {
      state.player.x = clamp(state.player.x, 20, W - 20);
      state.player.y = clamp(state.player.y, 20, H - 20);
    }
    state.stars = Array.from({ length: Math.floor((W * H) / 5500) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(0.4, 1.7),
      a: rand(0.15, 0.8),
      s: rand(2, 13),
    }));
  }
  addEventListener("resize", () => {
    resize();
    draw();
  });
  resize();
  function sound(freq = 440, duration = 0.06, type = "sine", volume = 0.025) {
    if (muted) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(volume, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + duration);
    } catch {}
  }
  function playMusic() {
    if (!musicEnabled || paused || (!active && !choosing)) return;
    if (state.songPlaying) {
      const p = $("songAudio").play();
      if (p) p.catch(() => {});
      return;
    }
    if (state.songQueue.length) {
      playNextSong();
      return;
    }
    const bgm = $("bgm");
    bgm.volume = 0.28;
    const promise = bgm.play();
    if (promise) promise.catch(() => {});
  }
  const SONGS = [
    {
      name: "越来越不懂",
      artist: "蔡健雅",
      file: "assets/audio/music-monsters/tanya-yue-lai-yue-bu-dong.mp3",
      duration: 20,
    },
    {
      name: "虚拟",
      artist: "陈粒",
      file: "assets/audio/music-monsters/chenli-xu-ni.mp3",
      duration: 20,
    },
    {
      name: "心墙",
      artist: "郭静",
      file: "assets/audio/music-monsters/guojing-xin-qiang.mp3",
      duration: 20,
    },
    {
      name: "我怀念的",
      artist: "孙燕姿",
      file: "assets/audio/music-monsters/sunyanzi-wo-huai-nian-de.mp3",
      duration: 20,
    },
    {
      name: "如果呢",
      artist: "郑润泽",
      file: "assets/audio/music-monsters/zhengrunze-ru-guo-ne.mp3",
      duration: 20,
    },
    {
      name: "如果可以",
      artist: "韦礼安",
      file: "assets/audio/music-monsters/weilian-ru-guo-ke-yi.mp3",
      duration: 20,
    },
    {
      name: "恋人",
      artist: "李荣浩",
      file: "assets/audio/music-monsters/lironghao-lian-ren.mp3",
      duration: 20,
    },
    {
      name: "不值得",
      artist: "梦飞船",
      file: "assets/audio/music-monsters/mengfeichuan-bu-zhi-de.mp3",
      duration: 20,
    },
    {
      name: "Letting Go",
      artist: "蔡健雅",
      file: "assets/audio/music-monsters-new/tanya-letting-go.mp3",
      duration: 20,
    },
    {
      name: "你是我的风景",
      artist: "何洁",
      file: "assets/audio/music-monsters-new/hejie-ni-shi-wo-de-fengjing.mp3",
      duration: 20,
    },
    {
      name: "偏爱",
      artist: "张芸京",
      file: "assets/audio/music-monsters-new/zhangyunjing-pianai.mp3",
      duration: 20,
    },
    {
      name: "兰亭序",
      artist: "周杰伦",
      file: "assets/audio/music-monsters-new/jay-lantingxu.mp3",
      duration: 20,
    },
    {
      name: "只对你有感觉",
      artist: "飞轮海&田馥甄",
      file: "assets/audio/music-monsters-new/feilunhai-zhi-dui-ni-you-ganjue.mp3",
      duration: 20,
    },
    {
      name: "告白气球",
      artist: "周杰伦",
      file: "assets/audio/music-monsters-new/jay-gaobaiqiqiu.mp3",
      duration: 20,
    },
    {
      name: "如果爱忘了",
      artist: "汪苏泷&单依纯",
      file: "assets/audio/music-monsters-new/wangsulong-ruguo-ai-wangle.mp3",
      duration: 20,
    },
    {
      name: "我走后",
      artist: "小咪",
      file: "assets/audio/music-monsters-new/xiaomi-wo-zou-hou.mp3",
      duration: 20,
    },
    {
      name: "日不落",
      artist: "蔡依林",
      file: "assets/audio/music-monsters-new/jolin-ribuluo.mp3",
      duration: 20,
    },
    {
      name: "晴天",
      artist: "周杰伦",
      file: "assets/audio/music-monsters-new/jay-qingtian.mp3",
      duration: 20,
    },
    {
      name: "海屿你",
      artist: "林希泽",
      file: "assets/audio/music-monsters-new/linxize-haiyu-ni.mp3",
      duration: 20,
    },
    {
      name: "爱情讯息",
      artist: "郭静",
      file: "assets/audio/music-monsters-new/guojing-aiqing-xunxi.mp3",
      duration: 20,
    },
    {
      name: "爱错",
      artist: "王力宏",
      file: "assets/audio/music-monsters-new/leehom-ai-cuo.mp3",
      duration: 20,
    },
    {
      name: "甲乙丙丁（你我怎么两清）",
      artist: "李佳薇",
      file: "assets/audio/music-monsters-new/lijiawei-jia-yi-bing-ding.mp3",
      duration: 20,
    },
    {
      name: "瞬",
      artist: "郑润泽",
      file: "assets/audio/music-monsters-new/zhengrunze-shun.mp3",
      duration: 20,
    },
    {
      name: "天龙八部之宿敌",
      artist: "许嵩",
      file: "assets/audio/music-monsters-new/xusong-tianlongbabu-sudi.mp3",
      duration: 20,
    },
    {
      name: "离开我的依赖",
      artist: "王艳薇",
      file: "assets/audio/music-monsters-new/wangyanwei-likai-wode-yilai.mp3",
      duration: 20,
    },
    {
      name: "稻香",
      artist: "周杰伦",
      file: "assets/audio/music-monsters-new/jay-daoxiang.mp3",
      duration: 20,
    },
    {
      name: "第57次取消发送",
      artist: "菲菲公主（陆绮菲）",
      file: "assets/audio/music-monsters-new/feifeigongzhu-di57.mp3",
      duration: 20,
    },
    {
      name: "红尘客栈",
      artist: "周杰伦",
      file: "assets/audio/music-monsters-new/jay-hongchenkezhan.mp3",
      duration: 20,
    },
    {
      name: "花海",
      artist: "周杰伦",
      file: "assets/audio/music-monsters-new/jay-huahai.mp3",
      duration: 20,
    },
    {
      name: "说了再见",
      artist: "周杰伦",
      file: "assets/audio/music-monsters-new/jay-shuolezaijian.mp3",
      duration: 20,
    },
    {
      name: "隔岸",
      artist: "可楼",
      file: "assets/audio/music-monsters-new/kelou-gean.mp3",
      duration: 20,
    },
    {
      name: "雨爱",
      artist: "杨丞琳",
      file: "assets/audio/music-monsters-new/rainie-yuai.mp3",
      duration: 20,
    },
    {
      name: "青花瓷",
      artist: "周杰伦",
      file: "assets/audio/music-monsters-new/jay-qinghuaci.mp3",
      duration: 20,
    },
  ];
  function playNextSong() {
    if (paused || (!active && !choosing)) return;
    if (!musicEnabled) {
      state.songPlaying = false;
      state.songCurrent = null;
      $("songNow").classList.add("hidden");
      return;
    }
    if (!state.songQueue.length) {
      state.songPlaying = false;
      state.songCurrent = null;
      playMusic();
      return;
    }
    const track = state.songQueue.shift(),
      player = $("songAudio");
    state.songPlaying = true;
    state.songCurrent = track;
    player.src = track.file;
    player.volume = 0.5;
    player.currentTime = 0;
    state.songEndTimer = track.duration;
    player.onended = () => {
      if (state.songCurrent === track) {
        state.songPlaying = false;
        state.songCurrent = null;
        playNextSong();
      }
    };
    const p = player.play();
    if (p) p.catch(() => {});
  }
  function queueSong(track) {
    const interrupted = state.songPlaying;
    const player = $("songAudio");
    player.pause();
    player.currentTime = 0;
    state.songQueue.length = 0;
    state.songPlaying = false;
    state.songCurrent = null;
    state.songQueue.push(track);
    $("bgm").pause();
    playNextSong();
    if (interrupted) showToast("歌曲切换 // 立即播放 " + track.name);
  }
  function setMusic(on) {
    musicEnabled = on;
    const button = $("musicBtn");
    button.textContent = on ? "♪" : "♩";
    button.title = on ? "背景音乐：开" : "背景音乐：关";
    button.style.color = on ? "var(--mint)" : "";
    if (on) {
      if (active && !paused) playMusic();
    } else {
      $("bgm").pause();
      $("songAudio").pause();
    }
  }
  function reset() {
    Object.assign(state, {
      player: {
        x: W / 2,
        y: H / 2,
        vx: 0,
        vy: 0,
        r: 12,
        hp: 100,
        maxHp: 100,
        fire: 0,
        dash: 0,
        dashCd: 0,
        inv: 0,
        angle: -Math.PI / 2,
        shield: 0,
        shieldMax: 0,
        volleyTimer: 0,
        novaTimer: 4,
      },
      enemies: [],
      bullets: [],
      hostile: [],
      orbs: [],
      particles: [],
      rocks: [],
      drones: [],
      arcs: [],
      weapon: "pulse",
      weaponLevels: { scatter: 0, pierce: 0 },
      score: 0,
      kills: 0,
      wave: 1,
      level: 1,
      xp: 0,
      nextXp: 36,
      time: 0,
      spawn: 0.8,
      pickupSpawn: rand(3.9, 6.9),
      healthSpawn: rand(10.7, 19.1),
      eventTimer: 20,
      event: null,
      songSpawn: 8,
      songQueue: [],
      songPlaying: false,
      songEndTimer: 0,
      songCurrent: null,
      combo: 0,
      comboTimer: 0,
      shake: 0,
      freezePulse: 0,
      scoreMilestoneShown: false,
      scoreChoiceShown: false,
      upgrades: {
        damage: 0,
        rate: 0,
        speed: 0,
        hull: 0,
        magnet: 0,
        extra: 0,
        thorns: 0,
        explosive: 0,
        frost: 0,
        chain: 0,
        shield: 0,
        volley: 0,
        nova: 0,
      },
      mobile: { x: 0, y: 0 },
      touchFire: false,
    });
    $("songAudio").pause();
    $("songAudio").removeAttribute("src");
    $("bossHud").classList.add("hidden");
    $("comboHud").classList.add("hidden");
    $("songNow").classList.add("hidden");
    updateHUD();
  }
  function resetVictoryScreen() {
    const video = $("victoryVideo");
    video.pause();
    video.currentTime = 0;
    $("victoryScreen").classList.add("hidden");
    $("victoryActions").classList.add("hidden");
    $("replayVictoryBtn").classList.remove("hidden");
    $("milestoneActions").classList.add("hidden");
    $("scoreChoiceScreen").classList.add("hidden");
    $("victoryHint").textContent = "庆祝视频播放中";
    victoryMode = null;
  }
  function start() {
    reset();
    resetVictoryScreen();
    $("gameOverScreen").classList.remove("has-epilogue");
    $("deathEpilogue").classList.add("hidden");
    active = true;
    paused = false;
    choosing = false;
    $("startScreen").classList.add("hidden");
    $("gameOverScreen").classList.add("hidden");
    $("pauseScreen").classList.add("hidden");
    $("upgradeScreen").classList.add("hidden");
    last = performance.now();
    playMusic();
    requestLoop();
  }
  function setPause(v) {
    if (!active || choosing) return;
    paused = v;
    $("pauseScreen").classList.toggle("hidden", !paused);
    if (paused) {
      $("bgm").pause();
      $("songAudio").pause();
    } else if (state.songPlaying) {
      const p = $("songAudio").play();
      if (p) p.catch(() => {});
      last = performance.now();
      requestLoop();
    } else {
      last = performance.now();
      playMusic();
      requestLoop();
    }
  }
  function addParticle(x, y, color, n = 7, power = 120) {
    const count = Math.min(n, Math.max(0, 600 - state.particles.length));
    for (let i = 0; i < count; i++) {
      let a = rand(0, Math.PI * 2),
        s = rand(power * 0.25, power);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.22, 0.65),
        max: 0.65,
        r: rand(1, 3),
        color,
      });
    }
  }
  function spawnPickup(
    kind,
    x = rand(55, W - 55),
    y = rand(90, H - 75),
    value = null,
  ) {
    if (state.orbs.length >= MAX_ORBS) return;
    state.orbs.push({
      x,
      y,
      r: kind === "health" ? 10 : 6,
      vx: rand(-22, 22),
      vy: rand(-22, 22),
      value: value ?? (kind === "health" ? 5 : 2),
      kind,
    });
  }
  function fireVolley() {
    const p = state.player;
    if (!p || state.upgrades.volley <= 0 || p.volleyTimer > 0) return;
    const shots = 2 + state.upgrades.volley,
      damage = (1 + state.upgrades.damage * 0.35) * 0.62;
    for (let i = 0; i < shots; i++) {
      const a = p.angle + (i - (shots - 1) / 2) * 0.23;
      const b = {
        x: p.x + Math.cos(a) * 14,
        y: p.y + Math.sin(a) * 14,
        vx: Math.cos(a) * 560,
        vy: Math.sin(a) * 560,
        r: 3.2,
        life: 0.82,
        damage,
        pierce: 0,
        hitTargets: [],
        kind: "volley",
        color: "#c3a7ff",
      };
      if (state.bullets.length < 300) state.bullets.push(b);
    }
    p.volleyTimer = Math.max(0.82, 1.35 - state.upgrades.volley * 0.12);
    sound(860, 0.06, "triangle", 0.012);
  }
  function novaPulse() {
    const p = state.player;
    if (!p || state.upgrades.nova <= 0) return;
    const range = 145 + state.upgrades.nova * 26,
      damage = 5 + state.upgrades.nova * 3;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (Math.hypot(e.x - p.x, e.y - p.y) <= range) {
        e.hp -= damage;
        e.slowTimer = Math.max(e.slowTimer || 0, 1.1);
        e.slowFactor = 0.35;
        if (e.hp <= 0) {
          kill(e);
          state.enemies.splice(i, 1);
        }
      }
    }
    addParticle(p.x, p.y, "#d18cff", 28, 240);
    state.shake = Math.max(state.shake, 4);
    showToast("磁暴脉冲 // 范围清场");
    sound(130, 0.2, "sawtooth", 0.035);
  }
  function drawExtraSkillVisuals() {
    const p = state.player;
    if (!p) return;
    for (const d of state.drones) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle + (d.type === "drone" ? Math.PI / 2 : 0));
      ctx.shadowBlur = 14;
      ctx.shadowColor = d.type === "drone" ? "#8be8ff" : "#ffc46b";
      ctx.fillStyle = d.type === "drone" ? "#8be8ff" : "#ffc46b";
      ctx.strokeStyle = "#eaffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (d.type === "drone") {
        ctx.moveTo(0, -9);
        ctx.lineTo(7, 7);
        ctx.lineTo(0, 4);
        ctx.lineTo(-7, 7);
      } else {
        ctx.moveTo(0, -9);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 9);
        ctx.lineTo(-8, 0);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#07140f";
      ctx.font = '8px "Barlow Condensed"';
      ctx.textAlign = "center";
      ctx.fillText(d.level, 0, 3);
      ctx.restore();
    }
    for (const a of state.arcs) {
      ctx.save();
      ctx.globalAlpha = clamp(a.life / a.max, 0, 1);
      ctx.strokeStyle = "#e7b5ff";
      ctx.shadowBlur = 14;
      ctx.shadowColor = "#b777ff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x2, a.y2);
      ctx.stroke();
      ctx.restore();
    }
    if (p.shieldMax > 0) {
      const ratio = clamp(p.shield / p.shieldMax, 0, 1),
        r = 29 + Math.sin(state.time * 5) * 1.5;
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.55 * ratio;
      ctx.strokeStyle = "#8be8ff";
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#64d9ef";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.8;
      ctx.font = '9px "Barlow Condensed"';
      ctx.fillStyle = "#b8f5ff";
      ctx.textAlign = "center";
      ctx.fillText("SHIELD " + Math.ceil(p.shield), p.x, p.y + 38);
      ctx.restore();
    }
    for (const b of state.bullets) {
      if (b.kind === "volley") {
        ctx.save();
        ctx.strokeStyle = "#c3a7ff";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#c3a7ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (state.upgrades.nova > 0 && p.novaTimer <= 0.15) {
      ctx.save();
      ctx.strokeStyle = "#d18cff88";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        145 + state.upgrades.nova * 26,
        -state.time,
        state.time,
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
  function xpForEnemy(e) {
    return e.type === "boss"
      ? 100
      : e.type === "song"
        ? 24
        : e.type === "tank"
          ? 30
          : e.type === "splitter"
            ? 25
            : e.type === "shooter"
              ? 20
              : e.type === "dasher"
                ? 15
                : e.type === "mini"
                  ? 5
                  : 10;
  }
  function enemySpawn() {
    if (state.enemies.length >= MAX_ENEMIES) return;
    const edge = Math.floor(Math.random() * 4),
      pad = 30;
    let x = edge === 0 ? -pad : edge === 1 ? W + pad : rand(0, W),
      y = edge === 2 ? -pad : edge === 3 ? H + pad : rand(0, H);
    if (
      Math.hypot(x - state.player.x, y - state.player.y) <
      Math.min(W, H) * 0.32
    ) {
      x = x < W / 2 ? W + pad : -pad;
      y = rand(0, H);
    }
    let pool = ["chaser", "chaser", "chaser"];
    if (state.wave >= 2) pool.push("dasher", "mini", "mini");
    if (state.wave >= 3) pool.push("shooter", "splitter");
    if (state.wave >= 4) pool.push("tank", "dasher");
    const type = pool[Math.floor(Math.random() * pool.length)],
      spec = {
        tank: [22, 9 + state.wave, 38, 34],
        shooter: [15, Math.ceil((7 + Math.floor(state.wave / 2)) / 2), 58, 15],
        splitter: [
          17,
          Math.ceil((10 + Math.floor(state.wave / 2)) / 2),
          67,
          23,
        ],
        dasher: [12, Math.ceil((7 + Math.floor(state.wave / 3)) / 2), 86, 18],
        mini: [8, 1, 128, 5],
        chaser: [12, Math.ceil((5 + Math.floor(state.wave / 2)) / 2), 80, 12],
      }[type],
      scaledHp = Math.max(
        1,
        Math.ceil(spec[1] * (1 + (state.wave - 1) * 0.12)),
      );
    state.enemies.push({
      x,
      y,
      vx: 0,
      vy: 0,
      r: spec[0],
      hp: scaledHp,
      max: scaledHp,
      type,
      speed: spec[2] + state.wave * 1.5,
      fire: rand(1.3, 2.5),
      phase: rand(1.2, 2.4),
      dashTime: 0,
      value: spec[3],
    });
  }
  function spawnBoss() {
    if (state.enemies.length >= MAX_ENEMIES) return;
    const hp = 18 + state.wave * 4;
    state.enemies.push({
      x: W / 2,
      y: -45,
      vx: 0,
      vy: 0,
      r: 29,
      hp,
      max: hp,
      type: "boss",
      speed: 48 + state.wave * 1.5,
      fire: 1.6,
      phase: 4,
      dashTime: 0,
      value: 180,
    });
    state.bossWave = state.wave;
    showToast("警报 // 深空收割者进入战区");
  }
  function spawnSongMonster() {
    if (
      state.enemies.length >= MAX_ENEMIES ||
      state.enemies.filter((e) => e.type === "song").length >= MAX_SONG_MONSTERS
    )
      return;
    const edge = Math.floor(Math.random() * 4),
      pad = 42;
    let x = edge === 0 ? -pad : edge === 1 ? W + pad : rand(80, W - 80),
      y = edge === 2 ? -pad : edge === 3 ? H + pad : rand(100, H - 100);
    const song = SONGS[Math.floor(Math.random() * SONGS.length)],
      hp = 1;
    state.enemies.push({
      x,
      y,
      vx: 0,
      vy: 0,
      r: 34,
      hp,
      max: hp,
      type: "song",
      song,
      speed: 62 + state.wave,
      fire: 0,
      phase: rand(0, 6),
      dashTime: 0,
      value: 42,
    });
    showToast("音乐怪物出现 // " + song.name + " - 一击播放歌曲");
  }
  function fire() {
    const p = state.player;
    if (!p || p.fire > 0) return;
    p.fire = Math.max(0.085, 0.22 - state.upgrades.rate * 0.025);
    const level = state.weaponLevels[state.weapon] || 1,
      baseDamage = 1 + state.upgrades.damage * 0.55,
      count =
        (1 + state.upgrades.extra) *
        (state.weapon === "scatter" ? 3 + 2 * (level - 1) : 1),
      spread = state.weapon === "scatter" ? 0.68 : 0.13;
    for (let i = 0; i < count; i++) {
      let off =
          count === 1
            ? 0
            : ((i - (count - 1) / 2) * spread) /
              Math.max(1, Math.floor(count / 2)),
        a = p.angle + off,
        speed =
          state.weapon === "pierce"
            ? 690
            : state.weapon === "scatter"
              ? 520
              : 590,
        bullet = {
          x: p.x + Math.cos(a) * 18,
          y: p.y + Math.sin(a) * 18,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          r:
            state.weapon === "pierce"
              ? 5
              : state.weapon === "scatter"
                ? 3.2
                : 3.5,
          life: state.weapon === "pierce" ? 1.15 : 0.9,
          damage: baseDamage * (state.weapon === "scatter" ? 0.72 : 1),
          pierce: state.weapon === "pierce" ? 1 + level : 0,
          hitTargets: [],
          color:
            state.weapon === "pierce"
              ? "#9ff7ff"
              : state.weapon === "scatter"
                ? "#ffd58a"
                : "#8df5ca",
          kind: state.weapon,
        };
      if (state.bullets.length < 300) state.bullets.push(bullet);
    }
    sound(
      state.weapon === "scatter" ? 420 : state.weapon === "pierce" ? 720 : 520,
      0.045,
      state.weapon === "pierce" ? "sawtooth" : "square",
      0.012,
    );
  }
  function dash() {
    let p = state.player;
    if (p.dashCd > 0) return;
    let dx =
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
        state.mobile.x,
      dy =
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
        (keys.has("w") || keys.has("arrowup") ? 1 : 0) +
        state.mobile.y;
    let m = Math.hypot(dx, dy);
    if (m < 0.1) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
      m = 1;
    }
    p.vx = (dx / m) * 560;
    p.vy = (dy / m) * 560;
    p.dash = 0.18;
    p.dashCd = 2.4;
    p.inv = 0.35;
    addParticle(p.x, p.y, "#70f0c0", 15, 180);
    sound(180, 0.18, "sawtooth", 0.04);
  }
  function takeDamage(n) {
    const p = state.player;
    if (p.inv > 0) return;
    if (p.shield > 0) {
      const blocked = Math.min(p.shield, n);
      p.shield -= blocked;
      n -= blocked;
      addParticle(p.x, p.y, "#8be8ff", 6, 85);
      if (n <= 0) {
        p.inv = 0.35;
        showToast("棱镜护盾吸收伤害");
        return;
      }
    }
    p.hp -= n;
    p.inv = 0.85;
    state.shake = 9;
    addParticle(p.x, p.y, "#ff6477", 14, 160);
    sound(90, 0.24, "sawtooth", 0.05);
    if (p.hp <= 0) {
      endGame();
      return;
    }
    if (state.upgrades.thorns) {
      let target = null,
        bestDistance = 185;
      for (const enemy of state.enemies) {
        if (enemy.type === "song") continue;
        const d = dist(enemy, p);
        if (d < bestDistance) {
          bestDistance = d;
          target = enemy;
        }
      }
      if (target) {
        target.hp -= 2 * state.upgrades.thorns;
        addParticle(target.x, target.y, "#ffc46b", 7, 95);
        if (target.hp <= 0) {
          kill(target);
          const index = state.enemies.indexOf(target);
          if (index >= 0) state.enemies.splice(index, 1);
        }
      }
    }
  }
  function kill(e) {
    state.kills++;
    if (state.comboTimer > 0) state.combo++;
    else state.combo = 1;
    state.comboTimer = 3.4;
    const multiplier = 1 + Math.min(9, state.combo - 1) * 0.08;
    addScore(Math.round((e.value * 10 + state.wave * 3) * multiplier));
    if (e.type === "boss") addScore(1000);
    gainXp(Math.max(1, Math.floor(xpForEnemy(e) * 0.4)));
    const color =
      e.type === "boss"
        ? "#ff6477"
        : e.type === "song"
          ? "#e78cff"
          : e.type === "tank"
            ? "#ffc46b"
            : e.type === "shooter"
              ? "#c594ff"
              : e.type === "dasher"
                ? "#64d9ef"
                : e.type === "splitter"
                  ? "#ff9c68"
                  : "#ff687b";
    addParticle(
      e.x,
      e.y,
      color,
      e.type === "boss" ? 36 : e.type === "tank" ? 18 : 10,
      e.type === "boss" ? 250 : 180,
    );
    if (e.type === "splitter") {
      for (let n = 0; n < 2 && state.enemies.length < MAX_ENEMIES; n++)
        state.enemies.push({
          x: e.x + rand(-10, 10),
          y: e.y + rand(-10, 10),
          vx: 0,
          vy: 0,
          r: 7,
          hp: 1,
          max: 1,
          type: "mini",
          speed: 133 + state.wave * 2,
          fire: 0,
          phase: 0,
          dashTime: 0,
          value: 5,
        });
    }
    if (e.type === "song") {
      queueSong(e.song);
      showToast(
        "歌曲怪物击破 // " + e.song.name + " - " + e.song.artist + " 播放中",
      );
    } else if (e.type === "boss") {
      showToast("精英击破 // 40% 能量已回收");
    } else if (state.combo >= 3 && state.combo % 3 === 0)
      showToast(
        "连杀 ×" +
          state.combo +
          " // 得分加成 " +
          Math.min(72, (state.combo - 1) * 8) +
          "%",
      );
    else showToast("敌舰击破  +经验");
    sound(120, 0.07, "triangle", 0.02);
  }
  function addScore(points) {
    state.score += points;
  }
  function checkScoreThresholds() {
    if (!active || victoryMode) return;
    if (state.score >= 150000 && !state.scoreChoiceShown) {
      state.scoreChoiceShown = true;
      state.scoreMilestoneShown = true;
      showScoreChoice();
      return;
    }
    if (state.score >= 30000 && !state.scoreMilestoneShown) {
      state.scoreMilestoneShown = true;
      showToast("3 万分达成 // 阵亡后可播放萧炎庆祝视频");
    }
  }
  function gainXp(n) {
    state.xp += n;
    while (state.xp >= state.nextXp) {
      state.xp -= state.nextXp;
      state.level++;
      state.nextXp = 36 * state.level;
      chooseUpgrade();
      if (choosing) break;
    }
  }
  const upgradeList = [
    ["scatter", "星火散射", "切换为扇形三连发；升级增加弹丸", "✣", "weapon"],
    ["pierce", "相位穿透", "切换为高速穿透弹；可贯穿更多敌人", "➤", "weapon"],
    ["drone", "攻击无人机", "召唤自动瞄准最近敌人的小跟班", "◈", "buddy"],
    ["guard", "守卫蜂", "召唤可拦截敌方弹幕的护卫跟班", "⬡", "buddy"],
    ["explosive", "裂变弹芯", "命中时产生小范围爆炸", "✹", "passive"],
    ["frost", "冷凝弹头", "命中减速敌人 1.5 秒", "❄", "passive"],
    ["chain", "电弧链接", "命中后跳跃电击附近敌人", "ϟ", "passive"],
    ["shield", "棱镜护盾", "抵挡伤害，受击后短暂充能", "⬡", "passive"],
    ["volley", "星轨齐射", "自动周期性发射交叉星弹", "✦", "passive"],
    ["nova", "磁暴脉冲", "周期释放范围冲击波", "✺", "passive"],
    ["damage", "穿甲弹", "每级伤害 +35%", "↗", "passive"],
    ["rate", "超频线圈", "每级射速提升 12%", "⌁", "passive"],
    ["speed", "离子推进器", "移动速度 +12%（最多 3 次）", "»", "passive"],
    ["hull", "纳米修复", "修复 35 点船体", "✚", "passive"],
    ["magnet", "引力回收", "拾取吸附范围扩大", "◎", "passive"],
    ["extra", "分裂弹头", "同时多发一枚弹药", "⋔", "passive"],
    ["thorns", "反应装甲", "受到攻击时反伤附近敌人", "◈", "passive"],
  ];
  const weaponNames = {
    pulse: "脉冲炮",
    scatter: "星火散射",
    pierce: "相位穿透",
  };
  function chooseUpgrade() {
    active = false;
    choosing = true;
    const grid = $("upgradeGrid");
    grid.innerHTML = "";
    const available = upgradeList.filter(([id, , , _icon, kind]) =>
      kind === "weapon"
        ? state.weaponLevels[id] < 3
        : kind === "buddy"
          ? state.drones.some((d) => d.type === id)
            ? state.drones.find((d) => d.type === id).level < 3
            : state.drones.length < 2
          : id === "speed"
            ? state.upgrades[id] < 3
            : state.upgrades[id] < 5,
    );
    const choices = [...available].sort(() => Math.random() - 0.5).slice(0, 3);
    for (const [id, name, desc, icon, kind] of choices) {
      const b = document.createElement("button");
      b.className = "upgrade";
      b.innerHTML = `<div class="upgrade-icon">${icon}</div><div class="upgrade-name">${kind === "weapon" ? "武器 · " : kind === "buddy" ? "跟班 · " : ""}${name}</div><div class="upgrade-desc">${id === "speed" ? "移动速度 +12%（最多 3 次）" : desc}</div>`;
      b.onclick = () => {
        if (kind === "weapon") {
          state.weaponLevels[id]++;
          state.weapon = id;
          showToast(
            "武器形态切换 // " + name + " Lv." + state.weaponLevels[id],
          );
        } else if (kind === "buddy") {
          let buddy = state.drones.find((d) => d.type === id);
          if (buddy) buddy.level = Math.min(3, buddy.level + 1);
          else
            state.drones.push({
              type: id,
              level: 1,
              angle: Math.random() * Math.PI * 2,
              x: state.player.x,
              y: state.player.y,
              fire: rand(0.2, 0.8),
              blockCd: 0,
              radius: 38 + state.drones.length * 20,
            });
          showToast("跟班加入 // " + name);
        } else {
          state.upgrades[id]++;
          if (id === "hull")
            state.player.hp = Math.min(
              state.player.maxHp,
              state.player.hp + 35,
            );
          if (id === "speed" && state.upgrades.speed <= 3)
            state.player.speed = (state.player.speed || 245) * 1.12;
          if (id === "shield") {
            state.player.shieldMax = 18 + state.upgrades.shield * 9;
            state.player.shield = state.player.shieldMax;
            showToast("棱镜护盾上线 // " + state.player.shield);
          }
          if (id === "volley") {
            state.player.volleyTimer = 0.15;
          }
          if (id === "nova") {
            state.player.novaTimer = 0.15;
          }
          showToast("系统强化完成 // " + name);
        }
        $("upgradeScreen").classList.add("hidden");
        choosing = false;
        active = true;
        last = performance.now();
        updateHUD();
        requestLoop();
      };
      grid.appendChild(b);
    }
    $("upgradeCount").textContent =
      `等级 ${String(state.level).padStart(2, "0")} · 武器形态 / 跟班 / 被动任选 1 项`;
    $("upgradeScreen").classList.remove("hidden");
    updateHUD();
  }
  function showToast(s) {
    const t = $("toast");
    t.textContent = s;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1900);
  }
  function updateHUD() {
    $("score").textContent = String(state.score).padStart(6, "0");
    $("kills").textContent = String(state.kills).padStart(2, "0");
    $("hpText").textContent =
      Math.ceil(Math.max(0, state.player?.hp || 100)) + "%";
    $("hpBar").style.width =
      clamp(
        ((state.player?.hp || 0) / (state.player?.maxHp || 100)) * 100,
        0,
        100,
      ) + "%";
    $("hpBar").style.background =
      (state.player?.hp || 0) < 30 ? "var(--red)" : "var(--mint)";
    $("levelText").textContent = "LV." + String(state.level).padStart(2, "0");
    $("xpText").textContent = `能量碎片 ${state.xp} / ${state.nextXp}`;
    $("xpBar").style.width = (state.xp / state.nextXp) * 100 + "%";
    if ($("weaponHud"))
      $("weaponHud").textContent =
        (weaponNames[state.weapon] || "脉冲炮") +
        " · Lv." +
        String(
          state.weapon === "pulse" ? 1 : state.weaponLevels[state.weapon] || 1,
        ).padStart(2, "0");
    if ($("buddyHud"))
      $("buddyHud").textContent = state.drones.length
        ? state.drones
            .map(
              (d) =>
                (d.type === "drone" ? "攻击无人机" : "守卫蜂") +
                " Lv." +
                d.level,
            )
            .join(" · ")
        : "暂无跟班";
    $("waveText").innerHTML =
      `第 ${String(state.wave).padStart(2, "0")} 波<small id="waveSub">${state.enemies.length ? "威胁正在接近" : "星区暂时安静"}</small>`;
    const boss = state.enemies.find((e) => e.type === "boss");
    $("bossHud").classList.toggle("hidden", !boss);
    if (boss) {
      $("bossHpText").textContent = `${Math.ceil((boss.hp / boss.max) * 100)}%`;
      $("bossHpBar").style.width =
        clamp((boss.hp / boss.max) * 100, 0, 100) + "%";
    }
    $("comboHud").classList.toggle(
      "hidden",
      state.combo < 3 || state.comboTimer <= 0,
    );
    if (state.combo >= 3)
      $("comboHud").textContent =
        `连击 ×${state.combo}　得分 +${Math.min(72, (state.combo - 1) * 8)}%`;
    const playing = state.songPlaying && state.songCurrent;
    $("songNow").classList.toggle("hidden", !playing);
    if (playing)
      $("songNow").textContent =
        "♫ " +
        state.songCurrent.name +
        " - " +
        state.songCurrent.artist +
        "（片段播放中）";
  }
  function endGame() {
    active = false;
    paused = false;
    choosing = false;
    $("bgm").pause();
    $("songAudio").pause();
    state.songQueue.length = 0;
    state.songPlaying = false;
    state.songCurrent = null;
    $("songNow").classList.add("hidden");
    $("victoryScreen").classList.add("hidden");
    $("victoryActions").classList.add("hidden");
    $("milestoneActions").classList.add("hidden");
    $("scoreChoiceScreen").classList.add("hidden");
    $("deathCelebrateBtn").classList.toggle("hidden", state.score < 30000);
    $("deathEpilogue").classList.toggle("hidden", state.score < 30000);
    $("gameOverScreen").classList.toggle("has-epilogue", state.score >= 30000);
    victoryMode = null;
    best = Math.max(best, state.score);
    localStorage.setItem("void-runner-best", best);
    $("best").textContent = String(best).padStart(6, "0");
    $("finalBest").textContent = String(best).padStart(6, "0");
    $("finalScore").textContent = String(state.score).padStart(6, "0");
    let min = Math.floor(state.time / 60),
      sec = Math.floor(state.time % 60);
    $("endStats").textContent =
      "你在星区坚持了 " +
      String(min).padStart(2, "0") +
      ":" +
      String(sec).padStart(2, "0") +
      "，击破 " +
      state.kills +
      " 艘敌舰。";
    $("gameOverScreen").classList.remove("hidden");
  }
  function showScoreChoice() {
    paused = true;
    $("pauseScreen").classList.add("hidden");
    $("bgm").pause();
    $("songAudio").pause();
    $("scoreChoiceScreen").classList.remove("hidden");
  }
  function resumeGameAudio() {
    if (state.songPlaying && state.songCurrent) {
      const promise = $("songAudio").play();
      if (promise) promise.catch(() => {});
    } else playMusic();
  }
  function showVictory(mode = "ending") {
    victoryMode = mode;
    paused = true;
    if (mode === "ending" || mode === "death" || mode === "choice") {
      active = false;
      choosing = false;
      best = Math.max(best, state.score);
      localStorage.setItem("void-runner-best", best);
      $("best").textContent = String(best).padStart(6, "0");
      $("finalBest").textContent = String(best).padStart(6, "0");
      $("finalScore").textContent = String(state.score).padStart(6, "0");
    }
    const video = $("victoryVideo");
    updateVideoDebug("showVictory");
    $("gameOverScreen").classList.add("hidden");
    $("scoreChoiceScreen").classList.add("hidden");
    $("victoryScreen").classList.remove("hidden");
    $("victoryActions").classList.add("hidden");
    $("replayVictoryBtn").classList.toggle("hidden", mode !== "replayable");
    $("milestoneActions").classList.add("hidden");
    if (mode === "death") {
      $("victoryEyebrow").textContent = "30,000+ // DEATH TRANSMISSION";
      $("victoryTitle").innerHTML = "庆祝萧炎<br><em>双帝之战</em>";
      $("victoryMessage").textContent = "本局达到 30,000 分，庆祝视频播放中。";
      $("victoryHint").textContent = "庆祝视频播放中";
    } else if (mode === "choice") {
      $("victoryEyebrow").textContent = "150,000 // VICTORY TRANSMISSION";
      $("victoryTitle").innerHTML = "恭喜你<br><em>你已通关</em>";
      $("victoryMessage").textContent = "庆祝视频播放中，播放结束后可以再来一局。";
      $("victoryHint").textContent = "庆祝视频播放中";
    } else if (mode === "milestone") {
      $("victoryEyebrow").textContent = "30,000 // SIGNAL RELEASE";
      $("victoryTitle").innerHTML = "达到<br><em>30,000 分</em>";
      $("victoryMessage").textContent =
        "阶段庆祝完成后可返回战斗，继续冲击 150,000 分。";
      $("victoryHint").textContent = "庆祝视频播放中";
    } else {
      $("victoryEyebrow").textContent = "FINAL TRANSMISSION // VICTORY";
      $("victoryTitle").innerHTML = "勇士，恭喜你<br><em>已取得胜利</em>";
      $("victoryMessage").textContent = "让我们一起为双帝之战庆贺。";
      $("victoryHint").textContent = "庆祝视频播放中";
    }
    $("bgm").pause();
    $("songAudio").pause();
    video.currentTime = 0;
    const promise = video.play();
    if (promise)
      promise.catch(() => {
        $("victoryHint").textContent = "自动播放受浏览器限制，请点击视频播放";
      });
  }
  function finishVictoryVideo() {
    updateVideoDebug("ended");
    $("victoryActions").classList.remove("hidden");
    $("replayVictoryBtn").classList.toggle("hidden", victoryMode !== "replayable");
    $("victoryHint").textContent = "庆贺完成！选择重播视频，或再来一局。";
  }
  function updateVideoDebug(eventName = "") {
    const video = $("victoryVideo");
    const panel = $("videoDebug");
    if (!video || !panel) return;
    const error = video.error;
    panel.textContent = [
      eventName ? `event: ${eventName}` : "video diagnostics",
      `videoWidth: ${video.videoWidth}`,
      `videoHeight: ${video.videoHeight}`,
      `readyState: ${video.readyState}`,
      `networkState: ${video.networkState}`,
      `currentSrc: ${video.currentSrc || video.src}`,
      `error: ${error ? `${error.code} ${error.message || ""}` : "none"}`,
    ].join("\n");
  }
  function continueAfterMilestone() {
    $("victoryScreen").classList.add("hidden");
    $("milestoneActions").classList.add("hidden");
    victoryMode = null;
    paused = false;
    last = performance.now();
    resumeGameAudio();
    requestLoop();
  }
  function damageEnemy(e, amount) {
    if (!e || e.hp <= 0) return false;
    e.hp -= amount;
    if (e.hp <= 0) {
      const idx = state.enemies.indexOf(e);
      kill(e);
      if (idx >= 0) state.enemies.splice(idx, 1);
      return true;
    }
    return false;
  }
  function slowEnemy(e, duration = 1.5, factor = 0.34) {
    if (!e || e.type === "song") return;
    e.slowTimer = Math.max(e.slowTimer || 0, duration);
    e.slowFactor = Math.min(e.slowFactor || 1, factor);
  }
  function damageArea(x, y, range, amount, source) {
    for (let k = state.enemies.length - 1; k >= 0; k--) {
      const e = state.enemies[k];
      if (e !== source && Math.hypot(e.x - x, e.y - y) <= range)
        damageEnemy(e, amount);
    }
  }
  function chainAttack(source, damage) {
    const hit = [source];
    let from = source;
    for (let n = 0; n < 2; n++) {
      let target = null,
        best = 155;
      for (const e of state.enemies) {
        if (hit.includes(e) || e.type === "song") continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d < best) {
          best = d;
          target = e;
        }
      }
      if (!target) break;
      hit.push(target);
      damageEnemy(target, damage * 0.55);
      if (state.arcs.length < 120)
        state.arcs.push({
          x1: from.x,
          y1: from.y,
          x2: target.x,
          y2: target.y,
          life: 0.2,
          max: 0.2,
        });
      from = target;
    }
  }
  function updateDrones(dt) {
    const p = state.player;
    for (const d of state.drones) {
      d.angle += (d.type === "drone" ? 1 : -0.75) * dt * (1 + d.level * 0.12);
      d.x = p.x + Math.cos(d.angle) * d.radius;
      d.y = p.y + Math.sin(d.angle) * d.radius;
      d.fire -= dt;
      d.blockCd = Math.max(0, (d.blockCd || 0) - dt);
      if (d.type === "drone" && d.fire <= 0) {
        let target = null,
          nearest = Infinity;
        for (const enemy of state.enemies) {
          if (enemy.type === "song") continue;
          const distance = Math.hypot(enemy.x - d.x, enemy.y - d.y);
          if (distance < nearest) {
            nearest = distance;
            target = enemy;
          }
        }
        if (target) {
          const a = Math.atan2(target.y - d.y, target.x - d.x),
            damage = 1.1 + d.level * 0.65;
          if (state.bullets.length < 300)
            state.bullets.push({
              x: d.x,
              y: d.y,
              vx: Math.cos(a) * 520,
              vy: Math.sin(a) * 520,
              r: 3.2,
              life: 0.95,
              damage,
              pierce: 0,
              hitTargets: [],
              kind: "drone",
              color: "#8be8ff",
            });
          sound(980, 0.025, "sine", 0.006);
        }
        d.fire = Math.max(0.42, 1.05 - d.level * 0.16);
      }
      if (d.type === "guard" && d.blockCd <= 0) {
        const idx = state.hostile.findIndex(
          (b) => Math.hypot(b.x - d.x, b.y - d.y) < 24,
        );
        if (idx >= 0) {
          state.hostile.splice(idx, 1);
          d.blockCd = 0.22;
          addParticle(d.x, d.y, "#8be8ff", 7, 80);
          showToast("守卫蜂拦截弹幕");
        }
      }
    }
  }
  function update(dt) {
    if (!active || paused || choosing) return;
    const p = state.player;
    state.time += dt;
    state.spawn -= dt;
    state.pickupSpawn -= dt;
    state.healthSpawn -= dt;
    state.eventTimer -= dt;
    state.songSpawn -= dt;
    state.songEndTimer -= dt;
    if (state.songPlaying && state.songEndTimer <= 0) {
      $("songAudio").pause();
      playNextSong();
    }
    if (state.songSpawn <= 0) {
      spawnSongMonster();
      state.songSpawn = rand(12, 19);
    }
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (!state.comboTimer) state.combo = 0;
    if (!state.event && state.eventTimer <= 0) {
      state.event = { remaining: 9, spawn: 0.1 };
      showToast("星区事件 // 陨石雨即将来袭");
    }
    if (state.event) {
      state.event.remaining -= dt;
      state.event.spawn -= dt;
      if (state.event.spawn <= 0 && state.event.remaining > 1) {
        state.rocks.push({
          x: rand(35, W - 35),
          y: rand(75, H - 35),
          r: rand(20, 32),
          warning: 0.95,
          life: 1.25,
        });
        state.event.spawn = 0.72;
      }
      if (state.event.remaining <= 0) {
        state.event = null;
        state.eventTimer = rand(30, 42);
      }
    }
    for (let i = state.rocks.length - 1; i >= 0; i--) {
      const rock = state.rocks[i];
      if (rock.warning > 0) {
        rock.warning -= dt;
        if (rock.warning <= 0) {
          addParticle(rock.x, rock.y, "#ffc46b", 20, 210);
          state.shake = Math.max(state.shake, 3);
          if (Math.hypot(p.x - rock.x, p.y - rock.y) < rock.r + p.r)
            takeDamage(15);
          for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e = state.enemies[j];
            if (
              e.type !== "song" &&
              Math.hypot(e.x - rock.x, e.y - rock.y) < rock.r + e.r
            )
              damageEnemy(e, 5);
          }
        }
      } else rock.life -= dt;
      if (rock.warning <= 0 && rock.life <= 0) state.rocks.splice(i, 1);
    }
    if (state.spawn <= 0) {
      const pack = Math.min(
        4,
        1 + Math.floor(state.wave / 3) + (Math.random() < 0.45 ? 1 : 0),
      );
      for (
        let n = 0;
        n < pack && state.enemies.length < MAX_ENEMIES - MAX_SONG_MONSTERS;
        n++
      )
        enemySpawn();
      state.spawn = Math.max(0.38, 1.05 - state.wave * 0.025) * rand(0.8, 1.15);
    }
    if (state.pickupSpawn <= 0) {
      spawnPickup("xp");
      state.pickupSpawn = rand(3.9, 6.9);
    }
    if (state.healthSpawn <= 0) {
      spawnPickup("health");
      state.healthSpawn = rand(10.7, 19.1);
    }
    const wave = 1 + Math.floor(state.time / 24);
    if (wave !== state.wave) {
      state.wave = wave;
      showToast(`警告 // 第 ${String(wave).padStart(2, "0")} 波敌群抵达`);
      state.spawn = 0;
      if (wave % 3 === 0) spawnBoss();
    }
    let mx =
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
        state.mobile.x,
      my =
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
        (keys.has("w") || keys.has("arrowup") ? 1 : 0) +
        state.mobile.y,
      mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }
    let speed = (p.speed || 245) * 1.5;
    if (p.dash > 0) {
      p.dash -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.02, dt);
      p.vy *= Math.pow(0.02, dt);
    } else {
      p.vx += (mx * speed - p.vx) * Math.min(1, dt * 9);
      p.vy += (my * speed - p.vy) * Math.min(1, dt * 9);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    p.x = clamp(p.x, 15, W - 15);
    p.y = clamp(p.y, 15, H - 15);
    p.fire -= dt;
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.inv = Math.max(0, p.inv - dt);
    if (p.shieldMax > 0 && p.shield < p.shieldMax) {
      p.shieldRegen = (p.shieldRegen || 0) - dt;
      if (p.shieldRegen <= 0)
        p.shield = Math.min(p.shieldMax, p.shield + dt * 2);
    }
    if (pointer.seen) {
      p.angle = Math.atan2(pointer.y - p.y, pointer.x - p.x);
    } else if (state.enemies.length) {
      const e = state.enemies.reduce((a, b) =>
        dist(a, p) < dist(b, p) ? a : b,
      );
      p.angle = Math.atan2(e.y - p.y, e.x - p.x);
    }
    if (pointer.down || state.touchFire) fire();
    p.volleyTimer = Math.max(0, (p.volleyTimer || 0) - dt);
    p.novaTimer = Math.max(0, (p.novaTimer || 0) - dt);
    if (state.upgrades.volley > 0 && p.volleyTimer <= 0) fireVolley();
    if (state.upgrades.nova > 0 && p.novaTimer <= 0) {
      novaPulse();
      p.novaTimer = Math.max(5.5, 8.5 - state.upgrades.nova * 0.6);
    }
    for (const e of state.enemies) {
      e.slowTimer = Math.max(0, (e.slowTimer || 0) - dt);
    }
    if (state.upgrades.frost > 0) {
      state.freezePulse = (state.freezePulse || 0) - dt;
      if (state.freezePulse <= 0) {
        for (const e of state.enemies)
          if (
            Math.hypot(e.x - p.x, e.y - p.y) <
            145 + state.upgrades.frost * 22
          )
            slowEnemy(e, 1.7, 0.18);
        state.freezePulse = 4.2;
        addParticle(p.x, p.y, "#9defff", 18, 160);
      }
    }
    updateDrones(dt);
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i],
        a = Math.atan2(p.y - e.y, p.x - e.x),
        d = dist(e, p),
        slow = e.slowTimer > 0 ? e.slowFactor || 0.35 : 1;
      let vx = Math.cos(a),
        vy = Math.sin(a),
        es = e.speed * slow;
      if (e.type === "boss") {
        if (e.y < 92) e.y += es * dt;
        else if (d > 205) {
          e.x += vx * es * dt;
          e.y += vy * es * dt;
        } else {
          e.x += Math.cos(state.time * 0.8) * es * 0.35 * dt;
          e.y += Math.sin(state.time * 0.9) * es * 0.25 * dt;
        }
        e.fire -= dt;
        if (e.fire <= 0) {
          e.fire = 2.25;
          const count = 10,
            offset = state.time * 0.35;
          for (let n = 0; n < count; n++) {
            const q = offset + (n * Math.PI * 2) / count;
            if (state.hostile.length < 300)
              state.hostile.push({
                x: e.x,
                y: e.y,
                vx: Math.cos(q) * 180,
                vy: Math.sin(q) * 180,
                r: 5,
                life: 4,
                bossShot: true,
              });
          }
        }
      } else if (e.type === "song") {
        e.phase += dt;
        e.x += vx * es * dt + Math.cos(e.phase) * 18 * dt;
        e.y += vy * es * dt + Math.sin(e.phase * 1.3) * 18 * dt;
      } else if (e.type === "shooter") {
        if (d > 230) {
          e.x += vx * es * dt;
          e.y += vy * es * dt;
        } else if (d < 165) {
          e.x -= vx * es * 0.65 * dt;
          e.y -= vy * es * 0.65 * dt;
        }
        e.fire -= dt;
        if (e.fire <= 0 && d < 440) {
          e.fire = rand(1.35, 2.2);
          if (state.hostile.length < 300)
            state.hostile.push({
              x: e.x,
              y: e.y,
              vx: vx * 235,
              vy: vy * 235,
              r: 4,
              life: 3,
            });
        }
      } else if (e.type === "dasher") {
        e.phase -= dt;
        if (e.dashTime > 0) {
          e.dashTime -= dt;
          e.x += e.vx * slow * dt;
          e.y += e.vy * slow * dt;
        } else if (e.phase <= 0) {
          e.phase = rand(1.6, 2.4);
          e.dashTime = 0.24;
          e.vx = vx * 430;
          e.vy = vy * 430;
        } else {
          e.x += vx * es * 0.55 * dt;
          e.y += vy * es * 0.55 * dt;
        }
      } else {
        e.x += vx * es * dt;
        e.y += vy * es * dt;
      }
      if (d < e.r + p.r) {
        takeDamage(15);
        if (e.type !== "song") damageEnemy(e, 1.5);
      }
    }
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let remove = false;
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (
          b.hitTargets.includes(e) ||
          Math.hypot(b.x - e.x, b.y - e.y) >= b.r + e.r
        )
          continue;
        b.hitTargets.push(e);
        const amount = e.type === "song" ? 1 : b.damage;
        damageEnemy(e, amount);
        if (state.upgrades.frost > 0) slowEnemy(e, 1.8, 0.3);
        if (state.upgrades.explosive > 0)
          damageArea(
            e.x,
            e.y,
            42 + state.upgrades.explosive * 8,
            b.damage * 0.38,
            e,
          );
        if (state.upgrades.chain > 0) chainAttack(e, b.damage);
        addParticle(
          b.x,
          b.y,
          e.type === "song" ? "#ffd7ff" : b.color || "#a5f7d6",
          e.type === "song" ? 5 : 3,
          45,
        );
        if (b.pierce > 0) b.pierce--;
        else {
          remove = true;
          break;
        }
      }
      if (remove || b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H)
        state.bullets.splice(i, 1);
    }
    for (let i = state.hostile.length - 1; i >= 0; i--) {
      const b = state.hostile[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) {
        takeDamage(13.5);
        state.hostile.splice(i, 1);
      } else if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H)
        state.hostile.splice(i, 1);
    }
    for (let i = state.orbs.length - 1; i >= 0; i--) {
      const o = state.orbs[i],
        d = dist(o, p),
        range = 115 + state.upgrades.magnet * 65;
      if (d < range) {
        const a = Math.atan2(p.y - o.y, p.x - o.x),
          pull = (1 - d / range) * 650;
        o.vx += (Math.cos(a) * pull - o.vx) * dt * 5;
        o.vy += (Math.sin(a) * pull - o.vy) * dt * 5;
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vx *= Math.pow(0.1, dt);
      o.vy *= Math.pow(0.1, dt);
      if (d < 28) {
        state.orbs.splice(i, 1);
        if (o.kind === "health") {
          const healed = Math.min(o.value, p.maxHp - p.hp);
          p.hp = Math.min(p.maxHp, p.hp + o.value);
          showToast(`船体修复 +${healed}`);
          addParticle(p.x, p.y, "#70f0c0", 12, 100);
        } else {
          gainXp(o.value);
          addScore(5);
        }
        sound(o.kind === "health" ? 740 : 900, 0.05, "sine", 0.012);
      }
    }
    for (let i = state.arcs.length - 1; i >= 0; i--) {
      state.arcs[i].life -= dt;
      if (state.arcs[i].life <= 0) state.arcs.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const q = state.particles[i];
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= Math.pow(0.06, dt);
      q.vy *= Math.pow(0.06, dt);
      q.life -= dt;
      if (q.life <= 0) state.particles.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - dt * 24);
    hudElapsed += dt;
    if (hudElapsed >= 0.1) {
      hudElapsed = 0;
      updateHUD();
    }
    checkScoreThresholds();
  }
  function draw() {
    ctx.save();
    if (state.shake) {
      ctx.translate(
        rand(-state.shake, state.shake),
        rand(-state.shake, state.shake),
      );
    }
    ctx.clearRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = "#081016";
    ctx.fillRect(-20, -20, W + 40, H + 40);
    for (const s of state.stars) {
      ctx.globalAlpha = s.a * (0.75 + 0.25 * Math.sin(state.time * s.s + s.x));
      ctx.fillStyle = "#c3ede3";
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // Subtle navigation grid and distant orbital rings.
    ctx.strokeStyle = "#7dc9b90a";
    ctx.lineWidth = 1;
    let grid = 72,
      ox = (state.time * 4) % grid;
    for (let x = -grid + ox; x < W + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = -grid + ((state.time * 4) % grid); y < H + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (const rock of state.rocks) {
      if (rock.warning > 0) {
        const pulse = 0.72 + 0.28 * Math.sin(state.time * 18);
        ctx.fillStyle = `rgba(255,100,119,${0.08 * pulse})`;
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,130,140,${0.65 * pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.globalAlpha = clamp(rock.life / 1.25, 0, 1);
        ctx.strokeStyle = "#ffc46b";
        ctx.lineWidth = 4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#ff9b55";
        ctx.beginPath();
        ctx.arc(
          rock.x,
          rock.y,
          rock.r * (1.4 - rock.life * 0.25),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }
    for (const o of state.orbs) {
      const c = o.kind === "health" ? "#70f0c0" : "#64d9ef";
      ctx.shadowBlur = o.kind === "health" ? 20 : 13;
      ctx.shadowColor = c;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(
        o.x,
        o.y,
        o.r + (o.kind === "health" ? Math.sin(state.time * 5 + o.x) * 1.5 : 0),
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = c + "aa";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        o.x,
        o.y,
        o.r + 6 + Math.sin(state.time * 4 + o.x) * 2,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      if (o.kind === "health") {
        ctx.strokeStyle = "#07140f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(o.x - 5, o.y);
        ctx.lineTo(o.x + 5, o.y);
        ctx.moveTo(o.x, o.y - 5);
        ctx.lineTo(o.x, o.y + 5);
        ctx.stroke();
      }
    }
    for (const b of state.bullets) {
      const c = b.color || "#8df5ca";
      ctx.strokeStyle = c;
      ctx.lineWidth = b.kind === "pierce" ? 4 : b.kind === "scatter" ? 2.5 : 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = c;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    for (const b of state.hostile) {
      ctx.fillStyle = b.bossShot ? "#ffc46b" : "#ff7181";
      ctx.shadowBlur = b.bossShot ? 16 : 12;
      ctx.shadowColor = b.bossShot ? "#ffc46b" : "#ff6477";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const e of state.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.type === "song") {
        const pulse = 1 + Math.sin(state.time * 5 + e.phase) * 0.08;
        ctx.shadowBlur = 22;
        ctx.shadowColor = "#df8cff";
        ctx.strokeStyle = "#edbaff88";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, (e.r + 10) * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (let n = 0; n < 3; n++) {
          const q = state.time * 0.8 + (n * Math.PI * 2) / 3;
          ctx.fillStyle = n === 1 ? "#fff0b8" : "#e9b5ff";
          ctx.beginPath();
          ctx.arc(
            Math.cos(q) * (e.r + 10),
            Math.sin(q) * (e.r + 10),
            2.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      let a = Math.atan2(state.player.y - e.y, state.player.x - e.x);
      ctx.rotate(a);
      let c =
        e.type === "song"
          ? "#e78cff"
          : e.type === "boss"
            ? "#ff6477"
            : e.type === "tank"
              ? "#ffc46b"
              : e.type === "shooter"
                ? "#bb91ff"
                : e.type === "dasher"
                  ? "#64d9ef"
                  : e.type === "splitter"
                    ? "#ff9c68"
                    : e.type === "mini"
                      ? "#ff83ac"
                      : "#ff687b";
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      ctx.shadowBlur = e.type === "boss" ? 30 : 16;
      ctx.shadowColor = c;
      ctx.beginPath();
      if (e.type === "song") {
        for (let n = 0; n < 10; n++) {
          const q = (n * Math.PI) / 5,
            rr = n % 2 ? e.r * 0.68 : e.r;
          ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffd7ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, -3);
        ctx.lineTo(12, -12);
        ctx.lineTo(12, 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(9, 5, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd7ff";
        ctx.fill();
      } else if (e.type === "boss") {
        for (let n = 0; n < 8; n++) {
          const q = (n * Math.PI) / 4,
            rr = n % 2 ? e.r * 0.78 : e.r;
          ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr);
        }
      } else if (e.type === "tank") {
        ctx.moveTo(e.r, 0);
        ctx.lineTo(e.r * 0.35, e.r * 0.8);
        ctx.lineTo(-e.r * 0.8, e.r * 0.7);
        ctx.lineTo(-e.r, 0);
        ctx.lineTo(-e.r * 0.8, -e.r * 0.7);
        ctx.lineTo(e.r * 0.35, -e.r * 0.8);
      } else if (e.type === "shooter") {
        ctx.moveTo(e.r, 0);
        ctx.lineTo(0, e.r);
        ctx.lineTo(-e.r, 0);
        ctx.lineTo(0, -e.r);
      } else if (e.type === "splitter") {
        for (let n = 0; n < 6; n++) {
          const q = (n * Math.PI) / 3;
          ctx.lineTo(Math.cos(q) * e.r, Math.sin(q) * e.r);
        }
      } else if (e.type === "dasher") {
        ctx.moveTo(e.r, 0);
        ctx.lineTo(-e.r * 0.7, e.r * 0.65);
        ctx.lineTo(-e.r * 0.35, 0);
        ctx.lineTo(-e.r * 0.7, -e.r * 0.65);
      } else if (e.type === "mini") {
        ctx.moveTo(e.r, 0);
        ctx.lineTo(0, e.r);
        ctx.lineTo(-e.r, 0);
        ctx.lineTo(0, -e.r);
      } else {
        ctx.moveTo(e.r, 0);
        ctx.lineTo(-e.r * 0.8, e.r * 0.7);
        ctx.lineTo(-e.r * 0.4, 0);
        ctx.lineTo(-e.r * 0.8, -e.r * 0.7);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      if (e.hp < e.max && e.type !== "mini" && e.type !== "boss") {
        ctx.fillStyle = "#302a2a";
        ctx.fillRect(-e.r, -e.r - 8, e.r * 2, 3);
        ctx.fillStyle = c;
        ctx.fillRect(-e.r, -e.r - 8, (e.r * 2 * e.hp) / e.max, 3);
      }
      ctx.restore();
      if (e.type === "song") {
        ctx.save();
        ctx.fillStyle = "#f5d8ff";
        ctx.font = '600 11px \"Noto Sans SC\"';
        ctx.textAlign = "center";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#e78cff";
        ctx.fillText(e.song.name + " - " + e.song.artist, e.x, e.y - e.r - 13);
        ctx.restore();
      }
    }
    for (const e of state.enemies) {
      if (e.slowTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.45 + 0.25 * Math.sin(state.time * 12);
        ctx.strokeStyle = "#a8efff";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#64d9ef";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
    for (const boss of state.enemies) {
      if (boss.type === "boss") {
        const x = boss.x - 42,
          y = boss.y - boss.r - 21;
        ctx.fillStyle = "#32141c";
        ctx.fillRect(x, y, 84, 7);
        ctx.fillStyle = "#ff6477";
        ctx.fillRect(x, y, 84 * clamp(boss.hp / boss.max, 0, 1), 7);
        ctx.strokeStyle = "#ffd1d6";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 84, 7);
        ctx.fillStyle = "#ffd1d6";
        ctx.font = '10px \"Barlow Condensed\"';
        ctx.textAlign = "center";
        ctx.fillText("ELITE", boss.x, y - 4);
      }
    }
    for (const q of state.particles) {
      ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.r, q.r);
    }
    ctx.globalAlpha = 1;
    if (state.player) {
      const p = state.player;
      ctx.save();
      ctx.translate(p.x, p.y);
      const pulse = 1 + Math.sin(state.time * 4) * 0.08;
      ctx.strokeStyle = "#70f0c055";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#70f0c0";
      ctx.beginPath();
      ctx.arc(0, 0, 25 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(p.angle);
      if (p.dash > 0) {
        ctx.strokeStyle = "#70f0c077";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-38, 0);
        ctx.lineTo(-8, 0);
        ctx.stroke();
      }
      if (p.inv > 0 && Math.floor(state.time * 20) % 2) ctx.globalAlpha = 0.32;
      ctx.shadowBlur = 26;
      ctx.shadowColor = "#70f0c0";
      ctx.fillStyle = "#e6fff6";
      ctx.strokeStyle = "#70f0c0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(25, 0);
      ctx.lineTo(4, 13);
      ctx.lineTo(-13, 11);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-13, -11);
      ctx.lineTo(4, -13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#70f0c0";
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(-21, 7);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-21, -7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#17342f";
      ctx.beginPath();
      ctx.arc(8, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (p.dashCd > 0) {
        ctx.strokeStyle = "#ffc46b77";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          p.x,
          p.y,
          26,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / 2.4),
        );
        ctx.stroke();
      }
    }
    drawExtraSkillVisuals();
    ctx.restore();
  }
  let loopFrame = 0;
  function requestLoop() {
    if (!loopFrame) loopFrame = requestAnimationFrame(loop);
  }
  function loop(now) {
    loopFrame = 0;
    if (document.hidden) {
      last = now;
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.04);
    last = now;
    if (!paused && !choosing && active) update(dt);
    draw();
    if (!paused && !choosing && active) requestLoop();
  }
  draw();
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
    keys.clear();
    pointer.down = false;
    if (!document.hidden && active && !paused && !choosing) requestLoop();
  });
  addEventListener("keydown", (e) => {
    let k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
      e.preventDefault();
    keys.add(k);
    if (k === "shift" && active && !paused) dash();
    if (k === "escape") {
      if (
        !$("victoryScreen").classList.contains("hidden") ||
        !$("scoreChoiceScreen").classList.contains("hidden")
      )
        return;
      if (paused) setPause(false);
      else if (active) setPause(true);
    }
    if (
      k === "enter" &&
      !active &&
      !choosing &&
      $("victoryScreen").classList.contains("hidden")
    )
      start();
  });
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  canvas.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.seen = true;
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") {
      pointer.down = true;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = true;
      if (active && !paused && !choosing) fire();
    }
  });
  addEventListener("pointerup", () => (pointer.down = false));
  $("startBtn").onclick = start;
  $("againBtn").onclick = start;
  $("deathCelebrateBtn").onclick = () => showVictory("death");
  $("claimVictoryBtn").onclick = () => showVictory("choice");
  $("newGameAt150kBtn").onclick = start;
  $("continueAt150kBtn").onclick = () => {
    $("scoreChoiceScreen").classList.add("hidden");
    paused = false;
    last = performance.now();
    resumeGameAudio();
    requestLoop();
  };
  $("victoryVideo").addEventListener("ended", () => {
    finishVictoryVideo();
  });
  ["loadedmetadata", "loadeddata", "canplay", "playing"].forEach((name) =>
    $("victoryVideo").addEventListener(name, () => updateVideoDebug(name)),
  );
  $("victoryVideo").addEventListener("error", () => {
    updateVideoDebug("error");
    $("victoryHint").textContent =
      "视频无法播放，请检查 assets/video/xiaoyan-compatible.mp4";
    finishVictoryVideo();
  });
  $("continueAfterVideoBtn").onclick = continueAfterMilestone;
  $("replayVictoryBtn").onclick = () => {
    showVictory(victoryMode || "ending");
  };
  $("playAgainVictoryBtn").onclick = start;
  $("pauseBtn").onclick = () => setPause(!paused);
  $("resumeBtn").onclick = () => setPause(false);
  $("musicBtn").onclick = () => setMusic(!musicEnabled);
  $("soundBtn").onclick = () => {
    muted = !muted;
    $("soundBtn").textContent = muted ? "♫" : "♪";
    $("soundBtn").style.color = muted ? "" : "var(--mint)";
    if (!muted) sound(660, 0.08);
  };
  const stick = $("stick");
  let stickId = null,
    stickRect = null;
  function stickMove(e) {
    if (stickId !== e.pointerId) return;
    const r = stick.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2,
      dx = e.clientX - cx,
      dy = e.clientY - cy,
      m = Math.max(1, Math.hypot(dx, dy)),
      lim = 39;
    state.mobile.x = (dx / m) * Math.min(1, m / lim);
    state.mobile.y = (dy / m) * Math.min(1, m / lim);
    stick.style.setProperty("--sx", state.mobile.x * 39 + "px");
    stick.style.setProperty("--sy", state.mobile.y * 39 + "px");
    stick.style.background = `radial-gradient(circle at calc(50% + ${state.mobile.x * 39}px) calc(50% + ${state.mobile.y * 39}px),#70f0c044 0 21px,transparent 22px),#10201d44`;
  }
  stick.addEventListener("pointerdown", (e) => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stickMove(e);
  });
  stick.addEventListener("pointermove", stickMove);
  stick.addEventListener("pointerup", () => {
    stickId = null;
    state.mobile.x = state.mobile.y = 0;
    stick.style.background = "#10201d44";
  });
  stick.addEventListener("pointercancel", () => {
    stickId = null;
    state.mobile.x = state.mobile.y = 0;
  });
  $("fireTouch").addEventListener("pointerdown", (e) => {
    state.touchFire = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  });
  $("fireTouch").addEventListener("pointerup", () => (state.touchFire = false));
  $("fireTouch").addEventListener(
    "pointercancel",
    () => (state.touchFire = false),
  );
  $("dashTouch").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    dash();
  });
})();
