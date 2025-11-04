// Tabs switching
const tabs = document.querySelectorAll(".tab-btn");
const contents = document.querySelectorAll(".tab-content");

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// Chat
const messages = document.getElementById("messages");
const input = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

function addMessage(text, role) {
  const msg = document.createElement("div");
  msg.classList.add("message", role);
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

sendBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, "user");
  input.value = "";
  setTimeout(() => {
    addMessage("The sine of 30° is 0.5. (sin 30° = 1/2)", "assistant");
  }, 800);
});

// File Upload
const upload = document.getElementById("fileUpload");
const fileList = document.getElementById("fileList");

upload.addEventListener("change", () => {
  fileList.innerHTML = "";
  Array.from(upload.files).forEach(file => {
    const div = document.createElement("div");
    div.className = "file-item";
    div.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    fileList.appendChild(div);
  });
});

// Flashcard flip
const flashcard = document.getElementById("flashcard");
flashcard.addEventListener("click", () => {
  flashcard.classList.toggle("flipped");
});
