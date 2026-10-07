import { createAdminClient } from "@insforge/sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type LinkedProject = {
  api_key?: string;
  apiKey?: string;
  oss_host?: string;
  ossHost?: string;
};

let cachedClient: ReturnType<typeof createAdminClient> | null = null;

function readLinkedProject(): LinkedProject {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), ".insforge", "project.json"), "utf8")) as LinkedProject;
  } catch {
    return {};
  }
}

export function getInsForgeAdmin() {
  if (cachedClient) return cachedClient;

  const linkedProject = readLinkedProject();
  const baseUrl = process.env.INSFORGE_URL?.trim() || linkedProject.oss_host || linkedProject.ossHost;
  const apiKey = process.env.INSFORGE_API_KEY?.trim() || linkedProject.api_key || linkedProject.apiKey;

  if (!baseUrl || !apiKey) {
    throw new Error("INSFORGE_ADMIN_CONFIG_MISSING");
  }

  cachedClient = createAdminClient({ baseUrl, apiKey });
  return cachedClient;
}
