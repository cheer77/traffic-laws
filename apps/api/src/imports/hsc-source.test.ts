import { describe, expect, it } from "vitest";
import { parseHscSourcePage } from "./hsc-source";

describe("HSC source discovery", () => {
  it("accepts only the official PDF links and reads the edition", () => {
    const result = parseHscSourcePage(`
      <p>затверджені наказом Головного сервісного центру МВС від 29.10.2025 № 225</p>
      <a href="https://evil.example/questions.pdf">Екзаменаційні питання</a>
      <a href="/wp-content/uploads/2025/11/questions.pdf">Екзаменаційні питання</a>
      <a href='/wp-content/uploads/2025/11/answers.pdf'>відповіді</a>
    `);
    expect(result).toEqual({
      edition: "Наказ ГСЦ МВС від 29.10.2025 № 225",
      sourceUpdatedAt: "2025-10-29",
      questionsUrl: "https://hsc.gov.ua/wp-content/uploads/2025/11/questions.pdf",
      answersUrl: "https://hsc.gov.ua/wp-content/uploads/2025/11/answers.pdf",
    });
  });

  it("rejects incomplete pages instead of guessing answers or files", () => {
    expect(() => parseHscSourcePage("<p>29.10.2025</p>")).toThrow(
      "Official source links not found",
    );
  });
});
