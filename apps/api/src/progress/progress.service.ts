import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ScenariosService } from "../scenarios/scenarios.service";
import { pageResult, type PaginationDto } from "../common/pagination";
import type { AttemptDto } from "./progress.dto";
@Injectable()
export class ProgressService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(ScenariosService) private readonly scenarios: ScenariosService,
  ) {}
  async submit(userId: string, body: AttemptDto) {
    const scenario = await this.scenarios.eligible(body.scenarioId, body.revision);
    if (!scenario.answers.some((answer) => answer.id === body.answerId))
      throw new BadRequestException();
    const attempt = await this.db.attempt.create({
      data: { userId, ...body, correct: body.answerId === scenario.correctAnswerId },
    });
    return {
      id: attempt.id,
      scenarioId: attempt.scenarioId,
      revision: attempt.revision,
      answerId: attempt.answerId,
      correct: attempt.correct,
      completedAt: attempt.completedAt,
      correctAnswerId: scenario.correctAnswerId,
      explanation: scenario.explanation,
      ruleReferences: scenario.ruleReferences,
    };
  }
  async history(userId: string, page: PaginationDto) {
    return pageResult(
      await this.db.attempt.findMany({
        where: { userId },
        orderBy: [{ completedAt: "desc" }, { id: "desc" }],
        skip: (page.page - 1) * page.limit,
        take: page.limit + 1,
        select: {
          id: true,
          scenarioId: true,
          revision: true,
          answerId: true,
          correct: true,
          completedAt: true,
        },
      }),
      page,
    );
  }
  async summary(userId: string) {
    const [summary] = await this.db.$queryRaw<
      Array<{ attempts: bigint; correct: bigint; completedRevisions: bigint }>
    >`
      SELECT count(*) AS attempts, count(*) FILTER (WHERE correct) AS correct,
      count(DISTINCT ("scenarioId", revision)) AS "completedRevisions" FROM "Attempt" WHERE "userId" = ${userId}::uuid`;
    return {
      attempts: Number(summary.attempts),
      correct: Number(summary.correct),
      completedRevisions: Number(summary.completedRevisions),
    };
  }
}
