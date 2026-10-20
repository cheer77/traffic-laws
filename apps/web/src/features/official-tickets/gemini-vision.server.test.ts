import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import imported from "./imported.json";
import { parseImportedTickets, reconstruct } from "./pipeline";
import {
  buildGenerateContentRequest,
  buildPlainGenerateContentRequest,
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

const savedPlainDescription =
  "Чотиристороннє перехрестя, дві смуги, стоп-лінія, чотири автомобілі, червоний сигнал і зелена стрілка ліворуч.";

function compactResponseGroundedInSavedPlainDescription() {
  return JSON.stringify({
    facts: [
      {
        subject: "road",
        kind: "road_geometry",
        value: "four-way intersection",
        confidence: 0.95,
        bounds: [0, 0, 1, 1],
      },
      {
        subject: "road",
        kind: "lanes",
        value: "two inbound lanes",
        confidence: 0.95,
        bounds: [0.15, 0.4, 0.85, 1],
      },
      {
        subject: "road",
        kind: "direction",
        value: "toward intersection",
        confidence: 0.9,
        bounds: [0.15, 0.4, 0.85, 1],
      },
      ...["white", "green", "dark-gray", "orange"].map((color, index) => ({
        subject: `vehicle-${index + 1}`,
        kind: "vehicle",
        value: `passenger car; color=${color}`,
        confidence: 0.9,
        bounds: [0.1 + index * 0.2, 0.5, 0.25 + index * 0.2, 0.8],
      })),
      {
        subject: "stop-line-1",
        kind: "stop_line",
        value: "visible before intersection",
        confidence: 0.95,
        bounds: [0.15, 0.45, 0.85, 0.5],
      },
      {
        subject: "traffic-light-1",
        kind: "signal",
        value: "red",
        confidence: 0.95,
        bounds: [0.82, 0.12, 0.92, 0.38],
      },
      {
        subject: "traffic-light-1",
        kind: "extra_signal",
        value: "green left arrow",
        confidence: 0.95,
        bounds: [0.9, 0.2, 0.97, 0.3],
      },
    ],
    unknowns: ["exact vehicle directions"],
    requiredAssets: ["traffic-light.extra-section.ua"],
    camera: null,
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("Gemini Vision adapter", () => {
  it("builds a plain image request without structured-output parameters", () => {
    const request = buildPlainGenerateContentRequest({
      model: "gemini-3.8-flash",
      prompt: "Опиши зображення",
      imageBase64: "jpeg-base64",
      mimeType: "image/jpeg",
      plain: true,
    });

    expect(request).toEqual({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: "jpeg-base64" } },
            { text: "Опиши зображення" },
          ],
        },
      ],
      config: {
        httpOptions: { timeout: 120_000, retryOptions: { attempts: 1 } },
      },
    });
    expect(request.config).not.toHaveProperty("responseJsonSchema");
    expect(request.config).not.toHaveProperty("responseMimeType");
    expect(request.config).not.toHaveProperty("thinkingConfig");
    expect(request.config).not.toHaveProperty("maxOutputTokens");
  });

  it("builds the JSON diagnostic request without structured-output parameters", () => {
    const request = buildPlainGenerateContentRequest({
      model: "gemini-3.8-flash",
      prompt: "Поверни тільки JSON",
      imageBase64: "jpeg-base64",
      mimeType: "image/jpeg",
      json: true,
    });

    expect(request.config).toEqual({
      httpOptions: { timeout: 120_000, retryOptions: { attempts: 1 } },
    });
    expect(request.config).not.toHaveProperty("responseJsonSchema");
    expect(request.config).not.toHaveProperty("responseMimeType");
    expect(request.config).not.toHaveProperty("thinkingConfig");
    expect(request.config).not.toHaveProperty("maxOutputTokens");
  });

  it("keeps a plain description separate from validated analysis and reuses its cache", async () => {
    const cacheDirectory = await temporaryDirectory();
    let calls = 0;
    const first = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      plain: true,
      generate: async (input) => {
        calls += 1;
        expect(input.plain).toBe(true);
        return "На зображенні видно перехрестя та автомобілі.";
      },
    });
    const firstResult = await reconstruct(ticket, first.adapter);
    expect(firstResult.analysis).toBeNull();
    expect(first.stats.plainDescriptionReceived).toBe(true);
    expect(first.stats.requestCount).toBe(1);

    const cached = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      plain: true,
      generate: async () => {
        calls += 1;
        return "must not run";
      },
    });
    await reconstruct(ticket, cached.adapter);
    expect(cached.stats.cacheHit).toBe(true);
    expect(cached.stats.plainDescriptionReceived).toBe(true);
    expect(cached.stats.requestCount).toBe(0);
    expect(calls).toBe(1);
  });

  it("validates JSON-mode output through the existing ImageAnalysis parser", async () => {
    const cacheDirectory = await temporaryDirectory();
    const json = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      json: true,
      generate: async (input) => {
        expect(input.json).toBe(true);
        expect(input.prompt).toContain('"facts"');
        return response();
      },
    });
    const result = await reconstruct(ticket, json.adapter);
    expect(json.stats.request?.structuredOutput).toBe(false);
    expect(result.analysis?.facts).toHaveLength(3);
    expect(result.missingAssets).toEqual(["traffic-light.extra-section.ua"]);
    expect(result.status).toBe("needs_review");
  });

  it("accepts compact JSON grounded in the saved plain description without an API call", async () => {
    expect(savedPlainDescription).toContain("чотири автомобілі");
    const cacheDirectory = await temporaryDirectory();
    const json = createGeminiVisionAdapter(ticket, {
      apiKey: "local-test-only",
      cacheDirectory,
      json: true,
      generate: async (input) => {
        expect(input.prompt).toContain("максимум 40 фактів");
        expect(input.prompt).toContain("camera завжди null");
        expect(input.prompt).not.toContain("Варіанти:");
        return compactResponseGroundedInSavedPlainDescription();
      },
    });

    const result = await reconstruct(ticket, json.adapter);
    expect(json.stats.requestCount).toBe(1);
    expect(result.analysis?.facts.filter((fact) => fact.kind === "vehicle")).toHaveLength(4);
    expect(result.analysis?.camera).toBeNull();
    expect(result.missingAssets).toEqual(["traffic-light.extra-section.ua"]);
    expect(result.draft).toBeNull();
    expect(result.status).toBe("needs_review");
  });

  it("stores invalid JSON-mode output as a separate diagnostic cache result", async () => {
    const cacheDirectory = await temporaryDirectory();
    let calls = 0;
    const invalid = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      json: true,
      generate: async () => {
        calls += 1;
        return "```json\n{invalid}\n```";
      },
    });
    const result = await reconstruct(ticket, invalid.adapter);
    expect(result.analysis).toBeNull();
    expect(invalid.stats.invalidJsonSaved).toBe(true);
    expect(await readFile(invalid.stats.cachePath, "utf8")).toContain("{invalid}");

    const cached = createGeminiVisionAdapter(ticket, {
      apiKey: "test-secret",
      cacheDirectory,
      json: true,
      generate: async () => {
        calls += 1;
        return response();
      },
    });
    await reconstruct(ticket, cached.adapter);
    expect(cached.stats.cacheHit).toBe(true);
    expect(cached.stats.requestCount).toBe(0);
    expect(calls).toBe(1);
  });

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
