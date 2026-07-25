import type {
  AnalyzeRequest,
  DatasetResponse,
  InvestigationResponse,
} from "@ciphersar/shared";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function runInvestigation(
  request: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<InvestigationResponse> {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  };
  if (signal) init.signal = signal;

  const response = await fetch(apiUrl("/api/investigations"), init);
  const payload = await readJson(response);
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : response.status >= 500
          ? "The CipherSAR API is unavailable. Start the API with `npm run dev` and retry."
          : "The investigation could not be completed.";
    throw new Error(message);
  }

  return payload as InvestigationResponse;
}

export async function getDataset(signal?: AbortSignal): Promise<DatasetResponse> {
  const response = await fetch(
    apiUrl("/api/dataset"),
    signal ? { signal } : undefined,
  );
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      response.status >= 500
        ? "The CipherSAR API is unavailable. Start the API with `npm run dev` and retry."
        : "The active dataset could not be loaded.",
    );
  }
  return payload as DatasetResponse;
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body.trim()) {
    if (!response.ok) return undefined;
    throw new Error("The CipherSAR API returned an empty response.");
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error(
      response.ok
        ? "The CipherSAR API returned an invalid response."
        : "The CipherSAR API is unavailable. Start the API with `npm run dev` and retry.",
    );
  }
}
