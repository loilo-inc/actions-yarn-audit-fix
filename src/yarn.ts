import * as cp from "child_process";

export function isAdvisory(x: any): x is AuditAdvisory {
  return typeof x === "object" && x["type"] === "auditAdvisory";
}
export type AuditResult = (AuditAdvisory | AuditSummary)[];
export type Severity = "info" | "low" | "moderate" | "high" | "critical";
export type AuditSummary = {
  type: "auditSummary";
  data: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
    };
    dependencies: number;
    devDependencies: number;
    optionalDependencies: number;
    totalDependencies: number;
  };
};
export type AuditAdvisory = {
  type: "auditAdvisory";
  data: {
    resolution: {
      id: number; //1324;
      path: string; //"jest>jest-cli>@jest/core>@jest/reporters>istanbul-reports>handlebars";
      dev: boolean;
      optional: boolean;
      bundled: boolean;
    };
    advisory: {
      findings: [
        {
          version: string; //"4.4.2";
          paths: string[];
        }
      ];
      id: number; //1324;
      created: string; // "2019-11-18T19:06:46.461Z";
      updated: string; //"2019-11-19T19:00:45.717Z";
      deleted: any | null;
      title: string; //"Arbitrary Code Execution";
      found_by: { link: ""; name: "Unknown"; email: "" };
      reported_by: { link: ""; name: "Unknown"; email: "" };
      module_name: string; // "handlebars";
      cves: [];
      vulnerable_versions: string; //"<4.5.3";
      patched_versions: string; // ">=4.5.3";
      overview: string; //"Versions of `handlebars` prior to 4.5.3 are vulnerable to Arbitrary Code Execution. The package's lookup helper fails to properly validate templates, allowing attackers to submit templates that execute arbitrary JavaScript in the system. It is due to an incomplete fix for a [previous issue](https://www.npmjs.com/advisories/1316). This vulnerability can be used to run arbitrary code in a server processing Handlebars templates or on a victim's browser (effectively serving as Cross-Site Scripting).";
      recommendation: string; //"Upgrade to version 4.5.3 or later.";
      references: string;
      access: string; //"public";
      severity: Severity;
      cwe: string; //"CWE-79";
      metadata: {
        module_type: string;
        exploitability: number;
        affected_components: string;
      };
      url: string; //"https://npmjs.com/advisories/1324";
    };
  };
};

export function parseAuditJsons(stdout: string): AuditResult {
  const list = stdout
    .split("\n")
    .filter(line => line.trim())
    .filter(line => line.startsWith("{"))
    .map(line => {
      try {
        return JSON.parse(line)
      } catch (e) {
        console.error(`failed to parse json: line = '${line}' `, e);
      }
    }).filter(v => v != null);
  return list;
}

export async function getAuditResults(cwd: string): Promise<AuditResult> {
  return new Promise((resolve, reject) => {
    cp.exec(
      "yarn audit --json",
      {
        env: process.env,
        cwd,
      },
      (error, stdout) => {
        if (!error) {
          resolve([]);
        } else {
          try {          
            resolve(parseAuditJsons(stdout));
          } catch (e) {
            reject(e);
          }
        }
      }
    );
  });
}
