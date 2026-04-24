import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db helpers
vi.mock("./db", () => ({
  getCfSettings: vi.fn(),
  saveCfSettings: vi.fn(),
  saveCommandHistory: vi.fn(),
  updateCommandHistory: vi.fn(),
  getCommandHistory: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

import * as db from "./db";

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

describe("cloudflare.hasToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns hasToken: false when no settings exist", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue(null);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.hasToken();
    expect(result).toEqual({ hasToken: false });
  });

  it("returns hasToken: true when token is set", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "my-secret-token", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.hasToken();
    expect(result).toEqual({ hasToken: true });
  });
});

describe("cloudflare.getSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no settings exist", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue(null);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.getSettings();
    expect(result).toBeNull();
  });

  it("masks the API token in response", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "abcdefgh1234", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.getSettings();
    expect(result?.apiToken).toBe("••••••••1234");
    expect(result?.apiToken).not.toContain("abcdefgh");
  });
});

describe("cloudflare.saveSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves settings with provided token", async () => {
    vi.mocked(db.saveCfSettings).mockResolvedValue(undefined);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.saveSettings({
      apiToken: "new-token-xyz",
      baseDomain: "ademartognasca.com.br",
    });
    expect(result).toEqual({ success: true });
    expect(db.saveCfSettings).toHaveBeenCalledWith(
      expect.objectContaining({ apiToken: "new-token-xyz", userId: 42 })
    );
  });

  it("preserves existing token when __KEEP__ is sent", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "existing-token", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.saveCfSettings).mockResolvedValue(undefined);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.saveSettings({
      apiToken: "__KEEP__",
      baseDomain: "ademartognasca.com.br",
    });
    expect(result).toEqual({ success: true });
    expect(db.saveCfSettings).toHaveBeenCalledWith(
      expect.objectContaining({ apiToken: "existing-token" })
    );
  });

  it("rejects empty apiToken via zod validation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.cloudflare.saveSettings({ apiToken: "", baseDomain: "test.com" })
    ).rejects.toThrow();
  });
});

describe("cloudflare.listZones - no token", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws error when no token is configured", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue(null);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cloudflare.listZones()).rejects.toThrow("Token da API não configurado");
  });
});

describe("cloudflare.executeCommand", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws error when no token is configured", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue(null);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cloudflare.executeCommand({ command: "help" })).rejects.toThrow("Token da API não configurado");
  });

  it("returns help output for 'help' command", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "valid-token", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.saveCommandHistory).mockResolvedValue(undefined as never);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.executeCommand({ command: "help" });
    expect(result.status).toBe("success");
    expect(result.output).toContain("Comandos disponíveis");
  });

  it("returns error for unknown command", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "valid-token", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.saveCommandHistory).mockResolvedValue(undefined as never);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.executeCommand({ command: "unknown-cmd" });
    expect(result.status).toBe("error");
    expect(result.output).toContain("Comando não reconhecido");
  });

  it("returns __CLEAR__ output for 'clear' command", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "valid-token", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.saveCommandHistory).mockResolvedValue(undefined as never);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.executeCommand({ command: "clear" });
    expect(result.output).toBe("__CLEAR__");
    expect(result.status).toBe("success");
  });
});

describe("cloudflare.executeCommand - defaultZoneId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws error when dns list is called without zone_id and no defaultZoneId", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "valid-token", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.saveCommandHistory).mockResolvedValue(undefined as never);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.executeCommand({ command: "dns list" });
    expect(result.status).toBe("error");
    expect(result.output).toMatch(/Zone ID obrigat/);
  });

  it("includes defaultZoneId info in help output when provided", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "valid-token", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.saveCommandHistory).mockResolvedValue(undefined as never);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.executeCommand({
      command: "help",
      defaultZoneId: "zone123abcdef1234567890abcdef123456",
    });
    expect(result.status).toBe("success");
    expect(result.output).toContain("(zona:");
  });

  it("does not include zone info in help when no defaultZoneId", async () => {
    vi.mocked(db.getCfSettings).mockResolvedValue({
      id: 1, userId: 42, apiToken: "valid-token", accountId: null,
      baseDomain: "ademartognasca.com.br", createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.saveCommandHistory).mockResolvedValue(undefined as never);
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cloudflare.executeCommand({ command: "help" });
    expect(result.status).toBe("success");
    expect(result.output).toContain("Comandos disponíveis");
    expect(result.output).not.toContain("zona:");
  });
});
