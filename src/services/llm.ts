// ─── Provider detection ───────────────────────────────────────────────────────
// Auto-detects which provider to use based on the active key:
//   sk-ant-* → Anthropic   (VITE_ANTHROPIC_KEY in .env)
//   sk-or-*  → OpenRouter  (VITE_OPENROUTER_KEY in .env)
// Session storage key (pasted via the modal) takes priority over env vars.
// To toggle providers: comment/uncomment the relevant line in .env.

type Provider = "anthropic" | "openrouter";

function resolveAuth(): { key: string; provider: Provider } {
  const sessionKey = sessionStorage.getItem("re:api-key") ?? "";
  const envAnthropic  = (import.meta.env.VITE_ANTHROPIC_KEY  as string) ?? "";
  const envOpenRouter = (import.meta.env.VITE_OPENROUTER_KEY as string) ?? "";

  if (sessionKey) {
    return {
      key: sessionKey,
      provider: sessionKey.startsWith("sk-or-") ? "openrouter" : "anthropic",
    };
  }
  if (envOpenRouter) return { key: envOpenRouter, provider: "openrouter" };
  if (envAnthropic)  return { key: envAnthropic,  provider: "anthropic"  };
  return { key: "", provider: "anthropic" };
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function postAnthropic(
  key: string,
  userContent: unknown,
  system: string | undefined,
  maxTokens: number,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: userContent }],
  };
  if (system) body.system = system;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content[0] as { type: string; text: string }).text;
}

// ─── OpenRouter ───────────────────────────────────────────────────────────────

const OPENROUTER_MODEL = "google/gemma-4-31b-it:free";

async function postOpenRouter(
  key: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens: number,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "resume-engine",
    },
    body: JSON.stringify({ model: OPENROUTER_MODEL, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");
  return content as string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function callLLM(
  prompt: string,
  system?: string,
  maxTokens = 4096,
): Promise<string> {
  const { key, provider } = resolveAuth();

  if (provider === "anthropic") {
    return postAnthropic(key, prompt, system, maxTokens);
  }

  // OpenRouter — system becomes a role:system message
  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return postOpenRouter(key, messages, maxTokens);
}

// ─── Document / PDF handling ──────────────────────────────────────────────────
// Anthropic: sends PDF via the native document API (best quality).
// OpenRouter: extracts text with pdf.js then embeds it in the prompt.

let pdfjsLib: any = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  // @ts-ignore
  pdfjsLib = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  return pdfjsLib;
}

async function extractPdfText(base64: string): Promise<string> {
  const lib = await loadPdfJs();
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const pdf = await lib.getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(" "));
  }
  return pages.join("\n\n").trim();
}

export async function callLLMWithDocument(
  prompt: string,
  docBase64: string,
  system?: string,
  maxTokens = 2048,
): Promise<string> {
  const { key, provider } = resolveAuth();

  if (provider === "anthropic") {
    // Native PDF document block — best accuracy for LinkedIn profile PDFs
    return postAnthropic(
      key,
      [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: docBase64 } },
        { type: "text", text: prompt },
      ],
      system,
      maxTokens,
    );
  }

  // OpenRouter: extract text then send as a regular prompt
  const docText = await extractPdfText(docBase64);
  return callLLM(`${prompt}\n\n--- DOCUMENT CONTENT ---\n${docText}`, system, maxTokens);
}
