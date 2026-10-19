import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import imported from "./imported.json";
import { parseImportedTickets, reconstruct } from "./pipeline";
import {
  buildGenerateContentRequest,
  createGeminiVisionAdapter,
  GeminiVisionError,
} from "./gemini-vision.server";

const ticket = parseImportedTickets(imported)[0];
const temporaryDirectories: string[] = [];

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "traffic-laws-gemini-"));
  temporaryDirectories.push(directory);
  return directory;
}

function response() {
  return JSON.stringify({
    facts: [
      {
        subject: "road",
        kind: "road_geometry",
        value: "four-way intersection",
        confidence: 0.9,
        bounds: [0, 0, 1, 1],
      },
      {
        subject: "road",
        kind: "lanes",
        value: "lane count unresolved",
        confidence: 0.5,
        bounds: [0, 0, 1, 1],
      },
      {
        subject: "lane-1",
        kind: "direction",
        value: "toward intersection",
        confidence: 0.8,
        bounds: [0.2, 0.3, 0.5, 1],
      },
    ],
    unknowns: ["exact_lane_count"],
    requiredAssets: ["traffic-light.extra-section.ua"],
    camera: { position: [8, 7, 10], target: [0, 0, 0], verticalFov: 45 },
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("Gemini Vision adapter", () => {
  it("builds the supported generateContent structured-output request", () => {
    const request = buildGenerateContentRequest({
      model: "gemini-3.8-flash",
      prompt: "Analyze the ticket",
      imageBase64: "jpeg-base64",
      mimeType: "image/jpeg",
    });

    expect(request).toMatchObject({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: "jpeg-base64" } },
            { text: "Analyze the ticket" },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        httpOptions: { timeout: 120_000, retryOptions: { attempts: 1 } },
      },
    });
    expect(request.config?.responseJsonSchema).toBeDefined();
    expect(JSON.stringify(request.config?.responseJsonSchema)).not.toMatch(/"type":\s*\[/);
    expect(request.config).not.toHaveProperty("responseSchema");
    expect(request.config).not.toHaveProperty("temperature");
    expect(request.config).not.toHaveProperty("thinkingConfig");
    expect(request.config).not.toHaveProperty("automaticContinuation");
  });

  it("validates, caches and reuses one structured response without another request", async () => {
    const cacheDirectory = await temporaryDirectory();
    let calls = 0;
    const first = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret-never-persist",
      cacheDirectory,
      generate: async () => {
        calls += 1;
        return response();
      },
    });
    const firstResult = await reconstruct(ticket, first.adapter);
    expect(first.stats.requestCount).toBe(1);
    expect(first.stats.cacheHit).toBe(false);
    expect(firstResult.status).toBe("needs_review");
    expect(firstResult.missingAssets).toEqual(["traffic-light.extra-section.ua"]);

    const cachedText = await readFile(first.stats.cachePath, "utf8");
    expect(cachedText).not.toContain("test-secret-never-persist");

    const second = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret-never-persist",
      cacheDirectory,
      generate: async () => {
        calls += 1;
        return response();
      },
    });
    const secondResult = await reconstruct(ticket, second.adapter);
    expect(second.stats.requestCount).toBe(0);
    expect(second.stats.cacheHit).toBe(true);
    expect(secondResult.analysis).toEqual(firstResult.analysis);
    expect(calls).toBe(1);
  });

  it("uses one fresh request with force and rejects invalid structured data", async () => {
    const cacheDirectory = await temporaryDirectory();
    const forced = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      force: true,
      generate: async () => JSON.stringify({ facts: "invalid" }),
    });
    const result = await reconstruct(ticket, forced.adapter);
    expect(forced.stats.requestCount).toBe(1);
    expect(result.status).toBe("needs_review");
    expect(result.analysis).toBeNull();
    expect(result.issues[0]).toMatch(/^gemini_analysis_rejected:/);

    const cached = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      generate: async () => {
        throw new Error("network must not be called");
      },
    });
    const cachedResult = await reconstruct(ticket, cached.adapter);
    expect(cached.stats.cacheHit).toBe(true);
    expect(cached.stats.requestCount).toBe(0);
    expect(cachedResult.issues).toEqual(result.issues);
  });

  it("reuses safe provider diagnostics from the negative cache", async () => {
    const cacheDirectory = await temporaryDirectory();
    const first = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      generate: async () => {
        throw new GeminiVisionError("gemini_service_unavailable", {
          httpStatus: 503,
          providerStatus: "UNAVAILABLE",
        });
      },
    });
    await reconstruct(ticket, first.adapter);
    expect(first.stats.diagnostic).toEqual({
      httpStatus: 503,
      providerStatus: "UNAVAILABLE",
    });

    const cached = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      generate: async () => {
        throw new Error("network must not be called");
      },
    });
    await reconstruct(ticket, cached.adapter);
    expect(cached.stats.requestCount).toBe(0);
    expect(cached.stats.cacheHit).toBe(true);
    expect(cached.stats.diagnostic).toEqual(first.stats.diagnostic);
  });
});
