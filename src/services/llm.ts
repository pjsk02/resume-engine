const MODEL    = "google/gemma-4-31b-it:free";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string {
  return (
    sessionStorage.getItem("re:api-key") ||
    (import.meta.env.VITE_OPENROUTER_KEY as string) ||
    ""
  );
}

async function post(
  messages: Array<{ role: string; content: unknown }>,
  maxTokens: number,
): Promise<string> {
  const apiKey = getApiKey();
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "resume-engine",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");
  return content as string;
}

export async function callLLM(
  prompt: string,
  system?: string,
  maxTokens = 4096,
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return post(messages, maxTokens);
}

// ── PDF text extraction via pdf.js CDN ────────────────────────────────────────
// Gemma uses the chat API (no native document type), so we extract the PDF
// text and embed it in the prompt as plain text.

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
  const docText = await extractPdfText(docBase64);
  return callLLM(
    `${prompt}\n\n--- DOCUMENT CONTENT ---\n${docText}`,
    system,
    maxTokens,
  );
}
