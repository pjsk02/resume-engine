async function post(
  body: Record<string, unknown>,
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_KEY as string;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return (data.content[0] as { type: string; text: string }).text;
}

export async function callLLM(
  prompt: string,
  system?: string,
  maxTokens = 4096,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;
  return post(body);
}

export async function callLLMWithDocument(
  prompt: string,
  docBase64: string,
  system?: string,
  maxTokens = 2048,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: docBase64,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  };
  if (system) body.system = system;
  return post(body);
}
