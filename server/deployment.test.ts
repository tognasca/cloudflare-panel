import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock deployment db
vi.mock("./deployment-db", () => ({
  getSitesConfig: vi.fn(),
  getSiteConfigById: vi.fn(),
  saveSiteConfig: vi.fn(),
  updateSiteConfig: vi.fn(),
  deleteSiteConfig: vi.fn(),
  getDeployments: vi.fn(),
  saveDeployment: vi.fn(),
  updateDeployment: vi.fn(),
  saveDeploymentLog: vi.fn(),
  getDeploymentLogs: vi.fn(),
}));

import * as deploymentDb from "./deployment-db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("deployment.uploadYaml", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses and saves YAML configuration", async () => {
    vi.mocked(deploymentDb.getSitesConfig).mockResolvedValue([]);
    vi.mocked(deploymentDb.saveSiteConfig).mockResolvedValue({ insertId: 1 } as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const yamlContent = `sites:
  - name: test-react
    type: react
    port: 3000
    docker: true
    domain: test.com
    deploymentMethod: tunnel`;

    const result = await caller.deployment.uploadYaml({ yamlContent });

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(deploymentDb.saveSiteConfig).toHaveBeenCalled();
  });

  it("rejects invalid YAML", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.deployment.uploadYaml({ yamlContent: "invalid: yaml: content:" })
    ).rejects.toThrow();
  });

  it("clears existing sites before saving new ones", async () => {
    const existingSites = [
      { id: 1, name: "old-site", userId: 42 },
    ];
    vi.mocked(deploymentDb.getSitesConfig).mockResolvedValue(existingSites as any);
    vi.mocked(deploymentDb.deleteSiteConfig).mockResolvedValue(undefined as any);
    vi.mocked(deploymentDb.saveSiteConfig).mockResolvedValue({ insertId: 2 } as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const yamlContent = `sites:
  - name: new-site
    type: angular
    port: 4200
    docker: true
    domain: new.com
    deploymentMethod: pages`;

    await caller.deployment.uploadYaml({ yamlContent });

    expect(deploymentDb.deleteSiteConfig).toHaveBeenCalledWith(1);
  });
});

describe("deployment.listSites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of configured sites", async () => {
    const mockSites = [
      {
        id: 1,
        userId: 42,
        name: "site1",
        type: "react",
        port: 3000,
        domain: "site1.com",
        status: "stopped",
        deploymentMethod: "tunnel",
        dockerEnabled: 1,
      },
    ];
    vi.mocked(deploymentDb.getSitesConfig).mockResolvedValue(mockSites as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deployment.listSites();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "site1",
      type: "react",
      port: 3000,
      dockerEnabled: true,
    });
  });
});

describe("deployment.startSite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates deployment and updates site status", async () => {
    const mockSite = {
      id: 1,
      userId: 42,
      name: "test-site",
      type: "react",
      port: 3000,
      domain: "test.com",
      status: "stopped",
      deploymentMethod: "tunnel",
    };

    vi.mocked(deploymentDb.getSiteConfigById).mockResolvedValue(mockSite as any);
    vi.mocked(deploymentDb.saveDeployment).mockResolvedValue({ insertId: 100 } as any);
    vi.mocked(deploymentDb.saveDeploymentLog).mockResolvedValue(undefined as any);
    vi.mocked(deploymentDb.updateSiteConfig).mockResolvedValue(undefined as any);
    vi.mocked(deploymentDb.updateDeployment).mockResolvedValue(undefined as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deployment.startSite({ siteId: 1 });

    expect(result.success).toBe(true);
    expect(result.message).toContain("test-site");
    expect(deploymentDb.updateSiteConfig).toHaveBeenCalledWith(1, { status: "running" });
  });

  it("throws error when site not found", async () => {
    vi.mocked(deploymentDb.getSiteConfigById).mockResolvedValue(null);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.deployment.startSite({ siteId: 999 })).rejects.toThrow("Site não encontrado");
  });
});

describe("deployment.stopSite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates site status to stopped", async () => {
    const mockSite = {
      id: 1,
      userId: 42,
      name: "test-site",
      status: "running",
    };

    vi.mocked(deploymentDb.getSiteConfigById).mockResolvedValue(mockSite as any);
    vi.mocked(deploymentDb.updateSiteConfig).mockResolvedValue(undefined as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.deployment.stopSite({ siteId: 1 });

    expect(result.success).toBe(true);
    expect(deploymentDb.updateSiteConfig).toHaveBeenCalledWith(1, { status: "stopped" });
  });
});
