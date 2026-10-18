import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { API_CONFIG, type ApiConfig } from "../config/config";
import { discoverHscSource, HSC_SOURCE, type HscDiscovery } from "./hsc-source";

const RIGHTS_MESSAGE =
  "Масове повторне використання текстів та ілюстрацій не підтверджене. Автопублікацію заблоковано до письмового дозволу або однозначної відкритої ліцензії.";

@Injectable()
export class ImportsService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  async overview() {
    const runs = await this.db.importRun.findMany({
      where: { sourceKey: HSC_SOURCE.key },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      source: {
        key: HSC_SOURCE.key,
        name: HSC_SOURCE.name,
        pageUrl: HSC_SOURCE.pageUrl,
        edition: HSC_SOURCE.edition,
        sourceUpdatedAt: HSC_SOURCE.sourceUpdatedAt,
        questionsUrl: HSC_SOURCE.questionsUrl,
        answersUrl: HSC_SOURCE.answersUrl,
        questionsPages: 539,
        answersPages: 11,
        reuseStatus: "unclear" as const,
        automaticPublicationAllowed: false,
        note: RIGHTS_MESSAGE,
      },
      runs,
    };
  }

  async sync(actorId: string) {
    let discovery: HscDiscovery = {
      edition: HSC_SOURCE.edition,
      sourceUpdatedAt: HSC_SOURCE.sourceUpdatedAt,
      questionsUrl: HSC_SOURCE.questionsUrl,
      answersUrl: HSC_SOURCE.answersUrl,
    };
    let technicalNote = "Офіційна сторінка та обидва PDF-посилання перевірені.";
    if (this.config.nodeEnv === "test") {
      technicalNote = "Зовнішню мережу вимкнено в ізольованому тесті.";
    } else {
      try {
        discovery = await discoverHscSource();
      } catch {
        technicalNote =
          "Офіційний сайт відхилив або не завершив автоматичну перевірку. Відомі офіційні посилання збережено без обходу захисту.";
      }
    }
    return this.db.$transaction(async (transaction) => {
      const run = await transaction.importRun.create({
        data: {
          actorId,
          sourceKey: HSC_SOURCE.key,
          sourceUrl: HSC_SOURCE.pageUrl,
          edition: discovery.edition,
          questionsUrl: discovery.questionsUrl,
          answersUrl: discovery.answersUrl,
          sourceUpdatedAt: new Date(`${discovery.sourceUpdatedAt}T00:00:00.000Z`),
          status: "blocked",
          reuseStatus: "unclear",
          message: `${technicalNote} ${RIGHTS_MESSAGE}`,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorId,
          action: "question_import.blocked",
          subject: `${HSC_SOURCE.key}:${discovery.sourceUpdatedAt}`,
        },
      });
      return run;
    });
  }

  publish() {
    throw new ForbiddenException(
      "Bulk publication is disabled until reuse rights are explicitly confirmed.",
    );
  }
}
