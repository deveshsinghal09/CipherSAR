import type {
  AnalyzeRequest,
  DatasetResponse,
  InvestigationResponse,
} from "@ciphersar/shared";

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

  const response = await fetch("/api/investigations", init);

  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "The investigation could not be completed.";
    throw new Error(message);
  }

  return payload as InvestigationResponse;
}

export async function getDataset(signal?: AbortSignal): Promise<DatasetResponse> {
  const response = await fetch(
    "/api/dataset",
    signal ? { signal } : undefined,
  );
  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error("The active dataset could not be loaded.");
  }
  return payload as DatasetResponse;
}
