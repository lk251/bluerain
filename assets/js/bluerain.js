const ws = new WebSocket(
  "wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post"
);

const cornerButtons = document.querySelector(".corner-buttons");
const dialog = document.querySelector("dialog");
const showButton = document.getElementById("showSettings");
const closeButton = document.getElementById("closeButton");
const toggleFullscreenButton = document.getElementById("toggleFullscreen");
const pauseButton = document.getElementById("pauseButton");
const showEmojisButton = document.getElementById("showEmojisButton");
const toggleTextShadowButton = document.getElementById(
  "toggleTextShadowButton"
);
const fontDropdown = document.getElementById("fontDropdown");
const colorDropdown = document.getElementById("colorDropdown");

let cornerButtonsTimeout;
let pauseAnimation = false;

const colors = [
  "#0ae2ff", // blue
  "#0aff0a", // green
  "#ff0a0a", // red
  "#ff0ac6", // pink
  "#ffff0a", // yellow
];

let rainColor = colors[0];

const animationSpeed = [5, 10, 20, 30, 60];
let choosenSpeed = animationSpeed[2];
let animationInterval = 1000 / choosenSpeed;

let startTime = performance.now();
let previousTime = startTime;

let currentTime = 0;
let deltaTime = 0;

const rainFonts = [
  "monospace",
  "Chicago Plain",
  "Matrix Code NFI",
  "Courier New",
];

let showEmojis = true;
let showTextShadow = false;

const canvas = document.querySelector("canvas"),
  ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const fontSize = 17,
  columns = Math.floor(canvas.width / fontSize);

ctx.font = `${fontSize}px ${rainFonts[0]}`;

const drops = Array(columns).fill(1);
const skeets = Array(columns).fill("");
const skeetsIndex = Array(columns).fill(0);

const sanitizeForEmojis = (string) =>
  [...new Intl.Segmenter().segment(string)].map((x) => x.segment);

const stripEmojis = (str) => str.replace(/\p{Emoji}/gu, "");

const writeCharacter = (color, character, x, y) => {
  if (showTextShadow) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.fillText(character, x, y);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = color;
    ctx.fillText(character, x, y);
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const newColumns = Math.floor(canvas.width / fontSize);

  const oldDrops = [...drops];
  const oldSkeets = [...skeets];
  const oldSkeetsIndex = [...skeetsIndex];

  drops.length = newColumns;
  skeets.length = newColumns;
  skeetsIndex.length = newColumns;

  for (let i = 0; i < newColumns; i++) {
    drops[i] = oldDrops[i] || 1;
    skeets[i] = oldSkeets[i] || "";
    skeetsIndex[i] = oldSkeetsIndex[i] || 0;
  }

  ctx.font = `${fontSize}px ${rainFonts[fontDropdown.selectedIndex]}`;
}

function animateRain() {
  // Add fade effect to the canvas
  ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < drops.length; i++) {
    if (i < skeets.length) {
      const characters = showEmojis
        ? sanitizeForEmojis(skeets[i])
        : stripEmojis(skeets[i]);
      const character = characters[skeetsIndex[i]];

      if (character) {
        // Render the current character in white
        writeCharacter("#ffffff", character, i * fontSize, drops[i] * fontSize);

        // Render the previous character in the rain color if applicable
        if (drops[i] >= 2) {
          const oldCharacter = characters[skeetsIndex[i] - 1];
          if (oldCharacter) {
            writeCharacter(
              rainColor,
              oldCharacter,
              i * fontSize,
              (drops[i] - 1) * fontSize
            );
          }
        }

        drops[i]++;
        skeetsIndex[i]++;
      }

      if (drops[i] * fontSize > canvas.height) {
        // color the last character on the grid otherwise they stay white
        writeCharacter(
          rainColor,
          character,
          i * fontSize,
          (drops[i] - 1) * fontSize
        );

        drops[i] = 1;
      }

      if (skeetsIndex[i] >= characters.length) {
        skeetsIndex[i] = 0;
        skeets[i] = "";
        drops[i] = 1;
      }
    }
  }
}

function loop(timestamp) {
  currentTime = timestamp;
  deltaTime = currentTime - previousTime;

  if (deltaTime >= animationInterval) {
    previousTime = currentTime - (deltaTime % animationInterval);

    if (!pauseAnimation) animateRain();
  }

  // Request the next frame
  requestAnimationFrame(loop);
}

function addWord(word) {
  for (let j = 0; j < drops.length; j++) {
    if (skeetsIndex[j] === 0 && skeets[j] === "") {
      skeets[j] = word;
      skeetsIndex[j] = 0;
      drops[j] = 1;

      break;
    }
  }
}

function toggleActiveButton(button, state) {
  if (state) {
    button.classList.add("active");
  } else {
    button.classList.remove("active");
  }
}

function hideButtons() {
  cornerButtons.classList.remove("fade-in");
  cornerButtons.classList.add("fade-out");
}

function showButtons() {
  cornerButtons.classList.remove("fade-out");
  cornerButtons.classList.add("fade-in");
}

ws.addEventListener("message", async (event) => {
  if (pauseAnimation) return;

  const message = JSON.parse(event.data);
  if (message?.commit && message?.commit.operation === "create") {
    addWord(message?.commit.record.text);
  }
});

window.onresize = () => {
  resizeCanvas();
};

document.addEventListener("mousemove", () => {
  clearTimeout(cornerButtonsTimeout);

  showButtons();

  cornerButtonsTimeout = setTimeout(hideButtons, 1500);
});

if (showEmojis) showEmojisButton.classList.add("active");

toggleTextShadowButton.addEventListener("click", () => {
  showTextShadow = !showTextShadow;
  toggleActiveButton(toggleTextShadowButton, showTextShadow);
});

showEmojisButton.addEventListener("click", () => {
  showEmojis = !showEmojis;
  toggleActiveButton(showEmojisButton, showEmojis);
});

toggleFullscreenButton.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    dialog.close();

    toggleActiveButton(toggleFullscreenButton, true);
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
    toggleActiveButton(toggleFullscreenButton, false);
  }
});

document.querySelectorAll("button[id^='speedBtn']").forEach((speedButton) => {
  speedButton.addEventListener("click", (event) => {
    const buttonNumber = event.target.id.match(/\d+$/)?.[0];

    if (animationSpeed[buttonNumber - 1]) {
      choosenSpeed = animationSpeed[buttonNumber - 1];
      animationInterval = 1000 / choosenSpeed;
    }

    document.querySelectorAll("button[id^='speedBtn']").forEach((button) => {
      button.classList.remove("active");
    });

    speedButton.classList.add("active");
  });
});

pauseButton.addEventListener("click", () => {
  pauseAnimation = !pauseAnimation;
  toggleActiveButton(pauseButton, pauseAnimation);
});

fontDropdown.addEventListener("change", () => {
  const selectedFont = fontDropdown.selectedIndex;

  if (rainFonts[selectedFont])
    ctx.font = `${fontSize}px ${rainFonts[selectedFont]}`;
});

colorDropdown.addEventListener("change", () => {
  const selectedColor = colorDropdown.selectedIndex;

  if (colors[selectedColor]) rainColor = colors[selectedColor];
});

showButton.addEventListener("click", () => {
  dialog.showModal();
});

closeButton.addEventListener("click", () => {
  dialog.close();
});

console.log("%chttps://github.com/syxanash/bluerain", "font-size: medium");

requestAnimationFrame(loop);
