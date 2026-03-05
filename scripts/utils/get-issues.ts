import { Octokit } from "octokit";

export function createOctoKit(): Octokit {
  return new Octokit({
    auth: getGitHubToken(),
  });
}

export function getGitHubToken(): string {
  return getEnvVarOrThrow("GITHUB_TOKEN");
}

function getEnvVarOrThrow(name: string) {
  const value = Deno.env.get(name);
  if (value == null) {
    throw new Error(
      `Could not find environment variable ${name}. ` +
        `Ensure you are running in a GitHub action.`,
    );
  }
  return value;
}

const LIST_OPTIONS = {
  owner: "raycast",
  repo: "extensions",
  state: "open" as const,
  per_page: 100,
};

/** Parse Link header and return the URL for rel="next", or null if none. */
function getNextPageUrl(linkHeader: string | undefined): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

type Issue = {
  url: string;
  repository_url: string;
  labels_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  labels?: {
    id: number;
    node_id: string;
    url: string;
    name: string;
    color: string;
    default: boolean;
    description: string;
  }[];
  state: string;
  locked: boolean;
  assignee?: {
    url: string;
    html_url: string;
    followers_url: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export const getIssues = async (): Promise<Issue[]> => {
  const issues: Issue[] = [];
  try {
    const octokit = createOctoKit();
    const token = getGitHubToken();
    let nextUrl: string | null = null;

    while (true) {
      if (nextUrl) {
        const res = await fetch(nextUrl, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        const data = (await res.json()) as Issue[];
        console.log(`Got ${data.length} issues`);
        issues.push(...data);
        nextUrl = getNextPageUrl(res.headers.get("link") ?? undefined);
      } else {
        const response = await octokit.rest.issues.listForRepo(LIST_OPTIONS);
        issues.push(...(response.data as Issue[]));
        nextUrl = getNextPageUrl(response.headers.link ?? undefined);
      }
      if (!nextUrl) break;
    }

    return issues;
  } catch (error) {
    console.error(error);
    return issues;
  }
};
