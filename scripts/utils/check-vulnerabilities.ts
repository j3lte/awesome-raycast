type OsvQuery = {
  package: { name: string; ecosystem: "npm" };
  version: string;
};

type OsvBatchResponse = {
  results: Array<{
    vulns?: Array<{ id: string; modified: string }>;
    next_page_token?: string;
  }>;
};

type OsvVulnDetail = {
  id: string;
  summary: string;
  details?: string;
  modified: string;
  published?: string;
  severity?: Array<{ type: string; score: string }>;
  references?: Array<{ type: string; url: string }>;
};

export type VulnerabilityEntry = {
  id: string;
  summary: string;
  severity: string | null;
  url: string | null;
};

export type VulnerabilityMap = Record<string, {
  vulnerabilities: VulnerabilityEntry[];
  extensions: string[];
}>;

const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const OSV_VULN_URL = "https://api.osv.dev/v1/vulns";
const BATCH_SIZE = 1000;

/**
 * Parses a `package@version` key into name and version.
 * Handles scoped packages like `@scope/name@version`.
 */
function parseKey(key: string): { name: string; version: string } {
  const lastAt = key.lastIndexOf("@");
  return {
    name: key.slice(0, lastAt),
    version: key.slice(lastAt + 1),
  };
}

/**
 * Queries OSV.dev for vulnerabilities in a batch of packages.
 */
async function queryBatch(
  queries: OsvQuery[],
): Promise<OsvBatchResponse> {
  const response = await fetch(OSV_BATCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
  });

  if (!response.ok) {
    throw new Error(`OSV batch query failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<OsvBatchResponse>;
}

/**
 * Fetches full vulnerability details by ID.
 */
async function fetchVulnDetail(id: string): Promise<OsvVulnDetail> {
  const response = await fetch(`${OSV_VULN_URL}/${id}`);
  if (!response.ok) {
    throw new Error(`OSV vuln fetch failed for ${id}: ${response.status}`);
  }
  return response.json() as Promise<OsvVulnDetail>;
}

/**
 * Extracts severity string from OSV vulnerability detail.
 */
function extractSeverity(vuln: OsvVulnDetail): string | null {
  if (!vuln.severity || vuln.severity.length === 0) return null;
  return vuln.severity[0].score;
}

/**
 * Extracts advisory URL from references.
 */
function extractUrl(vuln: OsvVulnDetail): string | null {
  if (!vuln.references) return null;
  const advisory = vuln.references.find((r) => r.type === "ADVISORY");
  const web = vuln.references.find((r) => r.type === "WEB");
  return advisory?.url ?? web?.url ?? vuln.references[0]?.url ?? null;
}

/**
 * Checks a dependency map for known vulnerabilities using OSV.dev.
 * Returns only entries that have at least one vulnerability.
 */
export async function checkVulnerabilities(
  dependencyMap: Record<string, string[]>,
): Promise<VulnerabilityMap> {
  const keys = Object.keys(dependencyMap);
  console.log(`[vuln] Checking ${keys.length} unique packages against OSV.dev`);

  // Build queries from keys
  const allQueries: { key: string; query: OsvQuery }[] = keys.map((key) => {
    const { name, version } = parseKey(key);
    return {
      key,
      query: { package: { name, ecosystem: "npm" }, version },
    };
  });

  // Batch query OSV
  const vulnIdsByKey = new Map<string, string[]>();

  for (let i = 0; i < allQueries.length; i += BATCH_SIZE) {
    const batch = allQueries.slice(i, i + BATCH_SIZE);
    console.log(
      `[vuln] Querying batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allQueries.length / BATCH_SIZE)} (${batch.length} packages)`,
    );

    const response = await queryBatch(batch.map((b) => b.query));

    for (let j = 0; j < batch.length; j++) {
      const vulns = response.results[j]?.vulns;
      if (vulns && vulns.length > 0) {
        vulnIdsByKey.set(batch[j].key, vulns.map((v) => v.id));
      }
    }
  }

  if (vulnIdsByKey.size === 0) {
    console.log("[vuln] No vulnerabilities found");
    return {};
  }

  // Collect unique vuln IDs to fetch details
  const uniqueIds = new Set<string>();
  for (const ids of vulnIdsByKey.values()) {
    for (const id of ids) uniqueIds.add(id);
  }
  console.log(
    `[vuln] Found ${vulnIdsByKey.size} vulnerable packages, fetching ${uniqueIds.size} unique advisory details`,
  );

  // Fetch vulnerability details
  const vulnDetails = new Map<string, OsvVulnDetail>();
  const detailIds = Array.from(uniqueIds);
  // Fetch in parallel with concurrency limit
  const CONCURRENCY = 10;
  for (let i = 0; i < detailIds.length; i += CONCURRENCY) {
    const batch = detailIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          return await fetchVulnDetail(id);
        } catch (error) {
          console.error(`[vuln] Failed to fetch detail for ${id}:`, error);
          return null;
        }
      }),
    );
    for (const detail of results) {
      if (detail) vulnDetails.set(detail.id, detail);
    }
  }

  // Build result map
  const result: VulnerabilityMap = {};
  const sortedKeys = Array.from(vulnIdsByKey.keys()).sort((a, b) => a.localeCompare(b));

  for (const key of sortedKeys) {
    const ids = vulnIdsByKey.get(key)!;
    const vulnerabilities: VulnerabilityEntry[] = ids
      .map((id) => {
        const detail = vulnDetails.get(id);
        if (!detail) return null;
        return {
          id: detail.id,
          summary: detail.summary || "",
          severity: extractSeverity(detail),
          url: extractUrl(detail),
        };
      })
      .filter((v): v is VulnerabilityEntry => v !== null);

    if (vulnerabilities.length > 0) {
      result[key] = {
        vulnerabilities,
        extensions: dependencyMap[key],
      };
    }
  }

  console.log(`[vuln] Result: ${Object.keys(result).length} vulnerable packages`);
  return result;
}
