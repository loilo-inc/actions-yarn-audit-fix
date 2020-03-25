import * as fs from "fs";
import { parseAuditJsons, getAuditResults } from "../yarn";
describe("yarn", () => {
  test("basic", async () => {
    const data = await fs.promises.readFile("fixtures/yarn.json");
    const s = data.toString();
    const list = parseAuditJsons(s);
    expect(list.length).toBe(7);
  });
});