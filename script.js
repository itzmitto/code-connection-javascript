const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");
const preview = document.getElementById("codePreview");
const statusText = document.getElementById("status");
const saveButton = document.getElementById("saveButton");
const messagesList = document.getElementById("messagesList");
const clearButton = document.getElementById("clearButton");

let messages = Array.isArray(savedMessages) ? [...savedMessages] : [];

function updatePreview() {
  const previewMessages = [...messages, ...(input.value.trim() ? [input.value] : [])];
  preview.textContent = `const savedMessages = ${JSON.stringify(previewMessages, null, 2)};`;
}

function renderMessages() {
  messagesList.replaceChildren();
  messages.forEach((message, index) => {
    const item = document.createElement("li");
    const text = document.createElement("span");
    const removeButton = document.createElement("button");
    text.textContent = message;
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = "Verwijderen";
    removeButton.setAttribute("aria-label", `Verwijder bericht ${message}`);
    removeButton.addEventListener("click", () => removeMessage(index));
    item.append(text, removeButton);
    messagesList.append(item);
  });
  clearButton.disabled = messages.length === 0;
  updatePreview();
}

function setStatus(message, kind = "") {
  statusText.className = `status ${kind}`.trim();
  statusText.textContent = message;
}

async function send(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Er ging iets mis.");
  messages = data.messages;
  renderMessages();
}

async function removeMessage(index) {
  try {
    await send(`/api/messages/${index}`, { method: "DELETE" });
    setStatus("Bericht verwijderd.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

input.addEventListener("input", updatePreview);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  setStatus("Bericht wordt opgeslagen...");
  try {
    await send("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.value }),
    });
    input.value = "";
    updatePreview();
    setStatus("Bericht opgeslagen in generated-message.js.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    saveButton.disabled = false;
  }
});

clearButton.addEventListener("click", async () => {
  clearButton.disabled = true;
  try {
    await send("/api/messages", { method: "DELETE" });
    setStatus("Alle berichten zijn gewist.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

renderMessages();
