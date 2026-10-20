import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { ASSET_REGISTRY } from "@traffic-laws/assets-3d/registry";
import {
  parseImageAnalysis,
  VisionAdapterError,
  type ImportedTicket,
  type VisionAdapter,
} from "./pipeline";

export const GEMINI_VISION_MODEL = "gemini-3.8-flash";
const PROMPT_VERSION = "ua-ticket-image-analysis-v3";
const CACHE_VERSION = 1;
const WEB_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const FACT_KINDS = [
  "road_geometry",
  "lanes",
  "direction",
  "vehicle",
  "position",
  "orientation",
  "color",
  "sign",
  "stop_line",
  "crosswalk",
  "island",
  "signal",
  "extra_signal",
  "maneuver",
] as const;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    facts: {
      type: "array",
      maxItems: 200,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          subject: { type: "string" },
          kind: { type: "string", enum: FACT_KINDS },
          value: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          bounds: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        required: ["subject", "kind", "value", "confidence", "bounds"],
      },
    },
    unknowns: { type: "array", maxItems: 200, items: { type: "string" } },
    requiredAssets: { type: "array", maxItems: 200, items: { type: "string" } },
    camera: {
      type: "object",
      additionalProperties: false,
      properties: {
        position: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "number", minimum: -100, maximum: 100 },
        },
        target: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "number", minimum: -100, maximum: 100 },
        },
        verticalFov: { type: "number", minimum: 10, maximum: 100 },
      },
      required: ["position", "target", "verticalFov"],
    },
  },
  required: ["facts", "unknowns", "requiredAssets", "camera"],
} as const;

interface GenerateInput {
  model: string;
  prompt: string;
  imageBase64: string;
  mimeType: string;
  plain?: boolean;
  json?: boolean;
}

interface GeminiVisionOptions {
  apiKey: string;
  cacheDirectory: string;
  force?: boolean;
  model?: string;
  plain?: boolean;
  json?: boolean;
  generate?: (input: GenerateInput) => Promise<string>;
}

interface CacheRecordBase {
  version: 1;
  cacheKey: string;
  model: string;
  promptVersion: string;
}

type CacheRecord =
  | (CacheRecordBase & { result: "analysis"; analysis: unknown })
  | (CacheRecordBase & { result: "plain"; description: string })
  | (CacheRecordBase & { result: "invalid_json"; response: string; errorCode: string })
  | (CacheRecordBase & {
      result: "error";
      errorCode: string;
      diagnostic?: GeminiVisionDiagnostic;
    });

export interface GeminiVisionDiagnostic {
  httpStatus?: number;
  providerStatus?: string;
  providerMessage?: string;
  transport?: "connection" | "dns" | "fetch";
}

export interface GeminiVisionRequestDiagnostic {
  imageBytes: number;
  mimeType: string;
  structuredOutput: boolean;
  maxHttpAttempts: 1;
}

export interface GeminiVisionStats {
  cacheHit: boolean;
  requestCount: number;
  cachePath: string;
  model: string;
  diagnostic?: GeminiVisionDiagnostic;
  request?: GeminiVisionRequestDiagnostic;
  plainDescriptionReceived?: boolean;
  plainDescriptionCharacters?: number;
  invalidJsonSaved?: boolean;
  invalidJsonCharacters?: number;
}

export class GeminiVisionError extends VisionAdapterError {
  readonly code: string;
  readonly diagnostic?: GeminiVisionDiagnostic;

  constructor(code: string, diagnostic?: GeminiVisionDiagnostic) {
    super(code);
    this.code = code;
    this.diagnostic = diagnostic;
    this.name = "GeminiVisionError";
  }
}

function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new GeminiVisionError("invalid_cache_record");
  return input as Record<string, unknown>;
}

function cacheKey(ticket: ImportedTicket, model: string): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        promptVersion: PROMPT_VERSION,
        model,
        ticketId: ticket.id,
        question: ticket.question,
        options: ticket.options,
        imageSha256: ticket.images[0]?.sha256,
      }),
    )
    .digest("hex");
}

function imagePath(ticket: ImportedTicket): string {
  const image = ticket.images[0];
  if (!image) throw new GeminiVisionError("unique_reference_image_required");
  const publicRoot = path.resolve(WEB_ROOT, "public");
  const resolved = path.resolve(publicRoot, `.${image.src}`);
  if (!resolved.startsWith(`${publicRoot}${path.sep}`))
    throw new GeminiVisionError("invalid_reference_image_path");
  return resolved;
}

function mimeType(src: string): string {
  if (src.endsWith(".png")) return "image/png";
  if (src.endsWith(".jpg") || src.endsWith(".jpeg")) return "image/jpeg";
  throw new GeminiVisionError("unsupported_reference_image_type");
}

function prompt(ticket: ImportedTicket): string {
  const assets = ASSET_REGISTRY.map(
    (asset) => `${asset.id} — ${asset.name}: ${asset.description}`,
  ).join("\n");
  return `Analyze this official Ukrainian road-rules illustration conservatively for a future 3D reconstruction.

Question: ${ticket.question}
Options:
${ticket.options.map((option, index) => `${index + 1}. ${option}`).join("\n")}

Report only facts visible in the image. Use stable subjects such as road, lane-1, vehicle-white-1,
traffic-light-1 or sign-1, and reuse the same subject for its vehicle/position/orientation/color facts.
Bounds are normalized [left, top, right, bottom] in the original image. Coordinates mentioned in fact
values must clearly state their frame and remain observations, not invented world coordinates.
Use null with low confidence and add an unknown when a fact cannot be determined. Include road layout,
lane count/directions, markings, every vehicle, its position/orientation/intended maneuver, signs,
traffic lights/extra sections and their visible state, plus an estimated 3D camera. Do not infer legal
priority or the correct answer.

Existing Studio assets:
${assets}

requiredAssets must contain only genuinely necessary objects not represented by an existing asset.
Use a short descriptive stable ID for a missing object; do not substitute a different known asset.`;
}

function plainPrompt(ticket: ImportedTicket): string {
  return `Опиши українською мовою лише те, що видно на ілюстрації до офіційного питання ПДР.
Не визначай правильну відповідь і не повертай JSON.

Питання: ${ticket.question}
Варіанти:
${ticket.options.map((option, index) => `${index + 1}. ${option}`).join("\n")}`;
}

function jsonPrompt(ticket: ImportedTicket): string {
  return `Поверни тільки компактний JSON без Markdown. Аналізуй лише видимі об'єкти на зображенні.

Питання: ${ticket.question}

Формат:
{"facts":[{"subject":"id","kind":"road_geometry|lanes|direction|vehicle|position|orientation|color|sign|stop_line|crosswalk|island|signal|extra_signal|maneuver","value":"коротке значення або null","confidence":0.0,"bounds":[left,top,right,bottom]}],"unknowns":[],"requiredAssets":[],"camera":null}

Зафіксуй тип перехрестя, кількість/напрямок смуг, кожний автомобіль (тип, колір, смуга/порядок,
напрямок), видимі знаки, сигнали світлофорів та розмітку. Bounds — рамка об'єкта від 0 до 1 з
додатною площею. Один subject+kind — один факт; максимум 40 фактів. Невідоме не вгадуй: value=null
і запиши назву поля в unknowns. Не оцінюй 3D-геометрію чи камеру, camera завжди null. Не визначай
правильну відповідь. Відомі базові ассети: intersection.city.standard, vehicle.sedan.standard,
traffic-light.standard, sign.priority.yield.ua, sign.priority.main.ua, sign.priority.stop.ua.
requiredAssets містить лише явно потрібні відсутні можливості, наприклад traffic-light.extra-section.ua.`;
}

function classifySdkError(error: unknown): GeminiVisionError {
  const value = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const status = value.status;
  const code = value.code;
  const message = error instanceof Error ? error.message : "";
  const httpStatus =
    typeof status === "number" ? status : typeof code === "number" ? code : undefined;
  const providerStatus = message.match(
    /\b(RESOURCE_EXHAUSTED|PERMISSION_DENIED|UNAUTHENTICATED|NOT_FOUND|INVALID_ARGUMENT|UNAVAILABLE|DEADLINE_EXCEEDED)\b/,
  )?.[1];
  const providerMessage =
    httpStatus === 400
      ? message
          .replace(/([?&](?:key|api_key)=)[^&\s]+/gi, "$1[redacted]")
          .replace(/[A-Za-z0-9+/=]{80,}/g, "[redacted]")
          .slice(0, 500)
      : undefined;
  const cause = value.cause && typeof value.cause === "object" ? value.cause : {};
  const causeCode = "code" in cause && typeof cause.code === "string" ? cause.code : "";
  const transport: GeminiVisionDiagnostic["transport"] = /ENOTFOUND|EAI_AGAIN/.test(causeCode)
    ? "dns"
    : /ECONN|EPIPE|ETIMEDOUT/.test(causeCode)
      ? "connection"
      : /fetch/i.test(message)
        ? "fetch"
        : undefined;
  const diagnostic = { httpStatus, providerStatus, providerMessage, transport };
  if (status === 429 || code === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(message))
    return new GeminiVisionError("gemini_quota_exhausted", diagnostic);
  if (
    status === 401 ||
    status === 403 ||
    code === 401 ||
    code === 403 ||
    /API key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)
  )
    return new GeminiVisionError("gemini_authentication_failed", diagnostic);
  if (status === 404 || code === 404 || /404|not found|NOT_FOUND/i.test(message))
    return new GeminiVisionError("gemini_model_unavailable", diagnostic);
  if (status === 400 || code === 400 || /400|INVALID_ARGUMENT|invalid argument/i.test(message))
    return new GeminiVisionError("gemini_invalid_request", diagnostic);
  if (status === 503 || code === 503 || /503|UNAVAILABLE|overloaded/i.test(message))
    return new GeminiVisionError("gemini_service_unavailable", diagnostic);
  if (status === 504 || code === 504 || /504|DEADLINE|timed? ?out/i.test(message))
    return new GeminiVisionError("gemini_request_timeout", diagnostic);
  if (/fetch|network|ENOTFOUND|ECONN/i.test(message))
    return new GeminiVisionError("gemini_network_error", diagnostic);
  return new GeminiVisionError("gemini_request_failed", diagnostic);
}

export function buildGenerateContentRequest(input: GenerateInput): GenerateContentParameters {
  return {
    model: input.model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
          { text: input.prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 8192,
      httpOptions: { timeout: 120_000, retryOptions: { attempts: 1 } },
    },
  };
}

export function buildPlainGenerateContentRequest(input: GenerateInput): GenerateContentParameters {
  return {
    model: input.model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
          { text: input.prompt },
        ],
      },
    ],
    config: {
      httpOptions: { timeout: 120_000, retryOptions: { attempts: 1 } },
    },
  };
}

async function defaultGenerate(apiKey: string, input: GenerateInput): Promise<string> {
  const client = new GoogleGenAI({ apiKey });
  try {
    const request =
      input.plain || input.json
        ? buildPlainGenerateContentRequest(input)
        : buildGenerateContentRequest(input);
    const response = await client.models.generateContent(request);
    if (!response.text) throw new GeminiVisionError("gemini_empty_response");
    return response.text;
  } catch (error) {
    if (error instanceof GeminiVisionError) throw error;
    throw classifySdkError(error);
  }
}

function parseCache(input: unknown): CacheRecord {
  const value = record(input);
  if (
    value.version !== CACHE_VERSION ||
    typeof value.cacheKey !== "string" ||
    typeof value.model !== "string" ||
    value.promptVersion !== PROMPT_VERSION
  )
    throw new GeminiVisionError("invalid_cache_record");
  const base: CacheRecordBase = {
    version: 1,
    cacheKey: value.cacheKey,
    model: value.model,
    promptVersion: PROMPT_VERSION,
  };
  if (value.result === "analysis" && "analysis" in value)
    return { ...base, result: "analysis", analysis: value.analysis };
  if (value.result === "plain" && typeof value.description === "string")
    return { ...base, result: "plain", description: value.description };
  if (
    value.result === "invalid_json" &&
    typeof value.response === "string" &&
    typeof value.errorCode === "string"
  )
    return {
      ...base,
      result: "invalid_json",
      response: value.response,
      errorCode: value.errorCode,
    };
  if (value.result === "error" && typeof value.errorCode === "string") {
    const diagnosticValue = value.diagnostic;
    const diagnostic =
      diagnosticValue && typeof diagnosticValue === "object" && !Array.isArray(diagnosticValue)
        ? (diagnosticValue as GeminiVisionDiagnostic)
        : undefined;
    return { ...base, result: "error", errorCode: value.errorCode, diagnostic };
  }
  throw new GeminiVisionError("invalid_cache_record");
}

async function writeCache(cachePath: string, cache: CacheRecord): Promise<void> {
  await mkdir(path.dirname(cachePath), { recursive: true });
  const temporary = `${cachePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, cachePath);
}

export function createGeminiVisionAdapter(
  ticket: ImportedTicket,
  options: GeminiVisionOptions,
): { adapter: VisionAdapter; stats: GeminiVisionStats } {
  if (!options.apiKey.trim()) throw new GeminiVisionError("missing_gemini_api_key");
  if (ticket.images.length !== 1) throw new GeminiVisionError("unique_reference_image_required");
  if (options.plain && options.json) throw new GeminiVisionError("conflicting_diagnostic_modes");
  const model = options.model ?? GEMINI_VISION_MODEL;
  const structuredKey = cacheKey(ticket, model);
  const key = options.plain
    ? createHash("sha256").update(`${structuredKey}:plain-v1`).digest("hex")
    : options.json
      ? createHash("sha256").update(`${structuredKey}:json-compact-v1`).digest("hex")
      : structuredKey;
  const cachePath = path.join(options.cacheDirectory, `${key}.json`);
  const stats: GeminiVisionStats = {
    cacheHit: false,
    requestCount: 0,
    cachePath,
    model,
  };
  let analyzed = false;

  const adapter: VisionAdapter = {
    async analyze(input) {
      if (analyzed) throw new GeminiVisionError("vision_request_limit_exceeded");
      analyzed = true;
      if (input.ticketId !== ticket.id) throw new GeminiVisionError("ticket_adapter_mismatch");

      if (!options.force) {
        try {
          const cached = parseCache(JSON.parse(await readFile(cachePath, "utf8")));
          if (cached.cacheKey !== key || cached.model !== model)
            throw new GeminiVisionError("cache_binding_mismatch");
          stats.cacheHit = true;
          if (cached.result === "plain") {
            stats.plainDescriptionReceived = true;
            stats.plainDescriptionCharacters = cached.description.length;
            throw new GeminiVisionError("gemini_plain_description_received");
          }
          if (cached.result === "invalid_json") {
            stats.invalidJsonSaved = true;
            stats.invalidJsonCharacters = cached.response.length;
            throw new GeminiVisionError(cached.errorCode);
          }
          if (cached.result === "error") {
            stats.diagnostic = cached.diagnostic;
            throw new GeminiVisionError(cached.errorCode, cached.diagnostic);
          }
          const analysis = parseImageAnalysis(cached.analysis, ticket);
          return analysis;
        } catch (error) {
          if (
            !(error instanceof Error && "code" in error && error.code === "ENOENT") &&
            !(error instanceof SyntaxError)
          )
            throw error;
        }
      }

      const bytes = await readFile(imagePath(ticket));
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (digest !== ticket.images[0].sha256)
        throw new GeminiVisionError("reference_image_hash_mismatch");
      stats.request = {
        imageBytes: bytes.byteLength,
        mimeType: mimeType(ticket.images[0].src),
        structuredOutput: !options.plain && !options.json,
        maxHttpAttempts: 1,
      };
      stats.requestCount = 1;
      const generated = options.generate ?? ((request) => defaultGenerate(options.apiKey, request));
      let responseText: string;
      try {
        responseText = await generated({
          model,
          prompt: options.plain
            ? plainPrompt(ticket)
            : options.json
              ? jsonPrompt(ticket)
              : prompt(ticket),
          imageBase64: bytes.toString("base64"),
          mimeType: stats.request.mimeType,
          plain: options.plain,
          json: options.json,
        });
      } catch (error) {
        const failure =
          error instanceof GeminiVisionError
            ? error
            : new GeminiVisionError("gemini_request_failed");
        stats.diagnostic = failure.diagnostic;
        await writeCache(cachePath, {
          version: 1,
          cacheKey: key,
          model,
          promptVersion: PROMPT_VERSION,
          result: "error",
          errorCode: failure.code,
          diagnostic: failure.diagnostic,
        });
        throw failure;
      }
      if (options.plain) {
        stats.plainDescriptionReceived = true;
        stats.plainDescriptionCharacters = responseText.length;
        await writeCache(cachePath, {
          version: 1,
          cacheKey: key,
          model,
          promptVersion: PROMPT_VERSION,
          result: "plain",
          description: responseText,
        });
        throw new GeminiVisionError("gemini_plain_description_received");
      }
      let analysis;
      try {
        let raw: unknown;
        try {
          raw = JSON.parse(responseText);
        } catch {
          throw new GeminiVisionError("gemini_invalid_json");
        }
        analysis = parseImageAnalysis(
          {
            ...record(raw),
            version: 1,
            ticketId: ticket.id,
            imageSha256: ticket.images[0].sha256,
            proposal: null,
          },
          ticket,
        );
      } catch (error) {
        const failure =
          error instanceof GeminiVisionError
            ? error
            : new GeminiVisionError(
                `gemini_analysis_rejected:${error instanceof Error ? error.message.replaceAll(" ", "_") : "unknown"}`,
              );
        if (options.json) {
          const diagnosticResponse = responseText.slice(0, 200_000);
          stats.invalidJsonSaved = true;
          stats.invalidJsonCharacters = diagnosticResponse.length;
          await writeCache(cachePath, {
            version: 1,
            cacheKey: key,
            model,
            promptVersion: PROMPT_VERSION,
            result: "invalid_json",
            response: diagnosticResponse,
            errorCode: failure.code,
          });
        } else {
          await writeCache(cachePath, {
            version: 1,
            cacheKey: key,
            model,
            promptVersion: PROMPT_VERSION,
            result: "error",
            errorCode: failure.code,
          });
        }
        throw failure;
      }
      const cache: CacheRecord = {
        version: 1,
        cacheKey: key,
        model,
        promptVersion: PROMPT_VERSION,
        result: "analysis",
        analysis,
      };
      await writeCache(cachePath, cache);
      return analysis;
    },
  };
  return { adapter, stats };
}
