// Pak de onderdelen van de pagina.
const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");
const preview = document.getElementById("codePreview");
const statusText = document.getElementById("status");
const saveButton = document.getElementById("saveButton");

// De startwaarde komt uit generated-message.js.
input.value = savedMessage;

// Laat meteen zien hoe de JavaScript-regel eruitziet.
function updatePreview() {
  preview.textContent = `const savedMessage = ${JSON.stringify(input.value)};`;
}

updatePreview();
input.addEventListener("input", updatePreview);

// Wanneer je op Opslaan klikt, stuur je de tekst naar Node.js.
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // Voorkom dat de pagina opnieuw laadt.

  saveButton.disabled = true;
  statusText.className = "status";
  statusText.textContent = "Bezig met opslaan...";

  try {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.value }),
    });

    if (!response.ok) {
      throw new Error("De server kon het bericht niet opslaan.");
    }

    statusText.className = "status success";
    statusText.textContent =
      "Opgeslagen! Kijk nu in generated-message.js in VS Code.";
  } catch (error) {
    statusText.className = "status error";
    statusText.textContent = `${error.message} Is de Node.js-server gestart?`;
  } finally {
    saveButton.disabled = false;
  }
});
