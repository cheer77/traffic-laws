import { BadRequestException, type PipeTransform } from "@nestjs/common";
export class RevisionPipe implements PipeTransform<string, number> {
  transform(input: string): number {
    if (!/^[1-9]\d{0,9}$/.test(input)) throw new BadRequestException();
    const revision = Number(input);
    if (revision > 2147483647) throw new BadRequestException();
    return revision;
  }
}
