// Kleine lokale server met alleen ingebouwde Node.js-modules.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = 3000;
const HOST = "127.0.0.1";
const outputFile = path.join(__dirname, "generated-message.js");

const publicFiles = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
  "/generated-message.js": ["generated-message.js", "text/javascript; charset=utf-8"],
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function readMessages() {
  try {
    const source = await fs.readFile(outputFile, "utf8");
    const match = source.match(/const savedMessages\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      const messages = JSON.parse(match[1]);
      if (Array.isArray(messages) && messages.every((item) => typeof item === "string")) return messages;
    }
    // Upgrade the earlier single-message format when present.
    const oldMatch = source.match(/const savedMessage\s*=\s*("(?:\\.|[^"\\])*");/);
    if (oldMatch) return [JSON.parse(oldMatch[1])];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return [];
}

async function writeMessages(messages) {
  const lines = messages.map((message) => `  ${JSON.stringify(message)}`);
  const code = `// Automatisch gegenereerde berichten vanuit de browser.\nconst savedMessages = [\n${lines.join(",\n")}\n];\n`;
  await fs.writeFile(outputFile, code, "utf8");
}

async function readRequestBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body, "utf8") > 4096) throw Object.assign(new Error("Bericht is te groot."), { statusCode: 413 });
  }
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error("Ongeldige JSON."), { statusCode: 400 });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/messages") {
      return sendJson(res, 200, { messages: await readMessages() });
    }

    if (req.method === "POST" && url.pathname === "/api/messages") {
      const data = await readRequestBody(req);
      if (typeof data.message !== "string" || !data.message.trim() || data.message.length > 200) {
        return sendJson(res, 400, { error: "Voer 1 tot 200 tekens in." });
      }
      const messages = await readMessages();
      messages.push(data.message);
      await writeMessages(messages);
      return sendJson(res, 200, { messages });
    }

    const deleteMatch = url.pathname.match(/^\/api\/messages\/(\d+)$/);
    if (req.method === "DELETE" && deleteMatch) {
      const messages = await readMessages();
      const index = Number(deleteMatch[1]);
      if (index >= messages.length) return sendJson(res, 404, { error: "Bericht niet gevonden." });
      messages.splice(index, 1);
      await writeMessages(messages);
      return sendJson(res, 200, { messages });
    }

    if (req.method === "DELETE" && url.pathname === "/api/messages") {
      await writeMessages([]);
      return sendJson(res, 200, { messages: [] });
    }

    if (req.method === "GET" && publicFiles[url.pathname]) {
      const [fileName, contentType] = publicFiles[url.pathname];
      const content = await fs.readFile(path.join(__dirname, fileName));
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
      return res.end(content);
    }

    sendJson(res, 404, { error: "Pagina niet gevonden." });
  } catch (error) {
    if (error.statusCode) return sendJson(res, error.statusCode, { error: error.message });
    console.error(error);
    sendJson(res, 500, { error: "Er ging iets mis op de server." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Code Connection draait op http://${HOST}:${PORT}`);
});
