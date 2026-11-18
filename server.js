// Kleine lokale server met alleen ingebouwde Node.js-modules.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = 3000;
const HOST = "127.0.0.1";
const outputFile = path.join(__dirname, "generated-message.js");

// Alleen deze bestanden mogen via de browser worden bekeken.
const publicFiles = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
  "/generated-message.js": [
    "generated-message.js",
    "text/javascript; charset=utf-8",
  ],
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  try {
    // JavaScript in de browser verstuurt de ingevoerde tekst hierheen.
    if (req.method === "POST" && url.pathname === "/api/save") {
      let body = "";

      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body, "utf8") > 4096) {
          return sendJson(res, 413, { error: "Bericht is te groot." });
        }
      }

      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return sendJson(res, 400, { error: "Ongeldige JSON." });
      }

      const message = data.message;
      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 200
      ) {
        return sendJson(res, 400, { error: "Voer 1 tot 200 tekens in." });
      }

      // JSON.stringify voorkomt dat aanhalingstekens de JavaScript-code breken.
      const code =
        `// Deze regel wordt automatisch bijgewerkt vanuit de browser.\n` +
        `const savedMessage = ${JSON.stringify(message)};\n`;

      // Alleen dit ene bestand wordt aangepast.
      await fs.writeFile(outputFile, code, "utf8");
      return sendJson(res, 200, { success: true });
    }

    // Geef index.html, style.css en de twee JavaScript-bestanden terug.
    if (req.method === "GET" && publicFiles[url.pathname]) {
      const [fileName, contentType] = publicFiles[url.pathname];
      const content = await fs.readFile(path.join(__dirname, fileName));
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      });
      return res.end(content);
    }

    sendJson(res, 404, { error: "Pagina niet gevonden." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Er ging iets mis op de server." });
  }
});

// Alleen bereikbaar vanaf je eigen computer.
server.listen(PORT, HOST, () => {
  console.log(`Code Connection draait op http://${HOST}:${PORT}`);
});
