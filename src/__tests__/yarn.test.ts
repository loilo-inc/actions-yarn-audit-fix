import * as fs from "fs";
import { parseAuditJsons, getAuditResults } from "../yarn";
describe("yarn", () => {
  test("basic", async () => {
    const data = await fs.promises.readFile("fixtures/yarn.txt");
    const s = data.toString();
    const list = parseAuditJsons(s);
    expect(list.length).toBe(7);
  });
  test("bad", async () => {
    const data = await fs.promises.readFile("fixtures/bad.txt");
    const s = data.toString();
    const list = parseAuditJsons(s);
    expect(list.length).toBe(6);
  });
});