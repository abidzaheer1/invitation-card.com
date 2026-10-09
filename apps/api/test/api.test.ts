import "./env";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { OAuth2Client } from "google-auth-library";
import sharp from "sharp";
import type { AuthResponse, InvitationRecord, InvitationSummary, ResponsesPayload } from "@invitation/shared";
import { createApp } from "../src/bootstrap";
import { createEmbeddedPrisma } from "../src/local-dev/pglite";

let app: NestExpressApplication;
let base = "";
let closeDb: () => Promise<void>;

interface Res<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

async function call<T = any>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; form?: FormData } = {},
): Promise<Res<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${base}${path}`, { method, headers, body });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

const guest = async () => (await call<AuthResponse>("POST", "/api/auth/guest")).body;
let emailCounter = 0;
const newEmail = () => `person${++emailCounter}-${Math.random().toString(36).slice(2, 6)}@example.com`;

async function accountUser(): Promise<AuthResponse> {
  const res = await call<AuthResponse>("POST", "/api/auth/register", {
    body: { email: newEmail(), password: "correct horse battery" },
  });
  assert.equal(res.status, 201);
  return res.body;
}

async function createInvitation(token: string, templateId = "golden-classic"): Promise<InvitationRecord> {
  const res = await call<InvitationRecord>("POST", "/api/invitations", { token, body: { templateId } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

// Fake Google: the credential string is "sub|email|name|verified".
function installGoogleFake() {
  (OAuth2Client.prototype as any).verifyIdToken = async function ({ idToken }: { idToken: string }) {
    const [sub, email, name, verified] = idToken.split("|");
    if (!sub || !email) throw new Error("bad token");
    return { getPayload: () => ({ sub, email, name, email_verified: verified !== "unverified" }) };
  };
}
const gcred = (sub: string, email: string, name = "Test Person", verified = "verified") =>
  `${sub}|${email}|${name}|${verified}|padding-to-reach-minimum-length`;

before(async () => {
  installGoogleFake();
  const { prisma, pg } = await createEmbeddedPrisma();
  closeDb = async () => {
    await prisma.$disconnect();
    await pg.close();
  };
  app = await createApp(prisma);
  await app.listen(0, "127.0.0.1");
  const url = await app.getUrl();
  base = url.replace("[::1]", "127.0.0.1");
});

after(async () => {
  await app.close();
  await closeDb();
});

describe("basics", () => {
  test("health reports the database is up", async () => {
    const res = await call("GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.db, "up");
  });

  test("auth config exposes the Google client id", async () => {
    const res = await call("GET", "/api/auth/config");
    assert.equal(res.body.googleClientId, process.env.GOOGLE_CLIENT_ID);
  });

  test("unknown properties are rejected", async () => {
    const g = await guest();
    const res = await call("POST", "/api/invitations", { token: g.accessToken, body: { hack: true } });
    assert.equal(res.status, 400);
  });
});

describe("guest flow", () => {
  test("a guest session works without any sign-in", async () => {
    const g = await guest();
    assert.equal(g.user.isGuest, true);
    const me = await call("GET", "/api/auth/me", { token: g.accessToken });
    assert.equal(me.status, 200);
    assert.equal(me.body.id, g.user.id);
  });

  test("a guest creates an invitation from a template", async () => {
    const g = await guest();
    const inv = await createInvitation(g.accessToken, "emerald-nikah");
    assert.equal(inv.eventType, "WEDDING");
    assert.equal(inv.published, false);
    assert.equal(inv.content.templateId, "emerald-nikah");
    assert.equal(inv.content.sections.filter((s) => s.type === "hero").length, 1);
    assert.match(inv.slug, /^aisha-and-yusuf-[0-9a-f]{6}$/);
    assert.equal(inv.rsvpFields.length, 3);
  });

  test("an unknown template is rejected", async () => {
    const g = await guest();
    const res = await call("POST", "/api/invitations", { token: g.accessToken, body: { templateId: "nope" } });
    assert.equal(res.status, 400);
  });

  test("an event type alone picks a matching template", async () => {
    const g = await guest();
    const res = await call<InvitationRecord>("POST", "/api/invitations", {
      token: g.accessToken,
      body: { eventType: "BABY_SHOWER" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.eventType, "BABY_SHOWER");
  });

  test("guests can keep 5 invitations", async () => {
    const g = await guest();
    for (let i = 0; i < 5; i++) await createInvitation(g.accessToken);
    const res = await call("POST", "/api/invitations", { token: g.accessToken, body: { templateId: "golden-classic" } });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /Sign in/);
  });

  test("a guest can edit but not publish", async () => {
    const g = await guest();
    const inv = await createInvitation(g.accessToken);
    const edited = { ...inv.content, title: "Edited title" };
    const ok = await call<InvitationRecord>("PATCH", `/api/invitations/${inv.id}`, {
      token: g.accessToken,
      body: { content: edited },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.content.title, "Edited title");

    const publish = await call("PATCH", `/api/invitations/${inv.id}`, { token: g.accessToken, body: { published: true } });
    assert.equal(publish.status, 403);
    assert.equal(publish.body.code, "ACCOUNT_REQUIRED");
    assert.equal((await call("GET", `/api/public/invitations/${inv.slug}`)).status, 404);
  });
});

describe("content validation", () => {
  test("bad colors, covers and sections are refused", async () => {
    const g = await guest();
    const inv = await createInvitation(g.accessToken);
    const patch = (content: unknown) =>
      call("PATCH", `/api/invitations/${inv.id}`, { token: g.accessToken, body: { content } });

    assert.equal((await patch({ ...inv.content, theme: { ...inv.content.theme, primaryColor: "red" } })).status, 400);
    assert.equal((await patch({ ...inv.content, coverImageUrl: "https://evil.example/x.png" })).status, 400);
    assert.equal((await patch({ ...inv.content, sections: [] })).status, 400);
    assert.equal((await patch({ ...inv.content, eventDate: "next friday" })).status, 400);
    const bad = await patch({ ...inv.content, theme: { ...inv.content.theme, fontBody: "Comic Sans" } });
    assert.equal(bad.status, 400);
    assert.match(bad.body.message, /font/i);
  });

  test("RSVP questions are validated", async () => {
    const g = await guest();
    const inv = await createInvitation(g.accessToken);
    const put = (rsvpFields: unknown) =>
      call("PATCH", `/api/invitations/${inv.id}`, { token: g.accessToken, body: { rsvpFields } });
    assert.equal((await put([{ id: "a", label: "Pick", type: "select", required: true }])).status, 400);
    assert.equal((await put([{ id: "a", label: "x", type: "text" }, { id: "a", label: "y", type: "text" }])).status, 400);
    const ok = await put([
      { id: "name", label: "Your name", type: "text", required: true },
      { id: "meal", label: "Meal", type: "select", required: true, options: ["Chicken", "Vegetarian"] },
    ]);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.rsvpFields.length, 2);
  });
});

describe("accounts", () => {
  test("registering upgrades the guest in place and keeps their invitations", async () => {
    const g = await guest();
    const inv = await createInvitation(g.accessToken);
    const email = newEmail();
    const reg = await call<AuthResponse>("POST", "/api/auth/register", {
      token: g.accessToken,
      body: { email, password: "correct horse battery", name: "Sara" },
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.user.id, g.user.id);
    assert.equal(reg.body.user.isGuest, false);
    assert.equal(reg.body.user.email, email);

    const list = await call<InvitationSummary[]>("GET", "/api/invitations", { token: reg.body.accessToken });
    assert.deepEqual(list.body.map((i) => i.id), [inv.id]);
  });

  test("short passwords and duplicate emails are refused", async () => {
    const short = await call("POST", "/api/auth/register", { body: { email: newEmail(), password: "short" } });
    assert.equal(short.status, 400);
    const email = newEmail();
    assert.equal((await call("POST", "/api/auth/register", { body: { email, password: "correct horse battery" } })).status, 201);
    const dup = await call("POST", "/api/auth/register", { body: { email: email.toUpperCase(), password: "correct horse battery" } });
    assert.equal(dup.status, 409);
  });

  test("login checks the password", async () => {
    const email = newEmail();
    await call("POST", "/api/auth/register", { body: { email, password: "correct horse battery" } });
    assert.equal((await call("POST", "/api/auth/login", { body: { email, password: "wrong password" } })).status, 401);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: newEmail(), password: "whatever12" } })).status, 401);
    const ok = await call<AuthResponse>("POST", "/api/auth/login", { body: { email, password: "correct horse battery" } });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.user.isGuest, false);
  });

  test("logging in with a guest session merges the guest's drafts into the account", async () => {
    const owner = await accountUser();
    const existing = await createInvitation(owner.accessToken);

    const g = await guest();
    const draft = await createInvitation(g.accessToken, "party-pop");

    const login = await call<AuthResponse>("POST", "/api/auth/login", {
      token: g.accessToken,
      body: { email: owner.user.email, password: "correct horse battery" },
    });
    assert.equal(login.status, 201);
    assert.equal(login.body.user.id, owner.user.id);

    const list = await call<InvitationSummary[]>("GET", "/api/invitations", { token: login.body.accessToken });
    assert.deepEqual(list.body.map((i) => i.id).sort(), [existing.id, draft.id].sort());

    // The old guest session is gone and says so cleanly.
    assert.equal((await call("GET", "/api/auth/me", { token: g.accessToken })).status, 401);
  });

  test("a token for a user that no longer exists is rejected", async () => {
    const g = await guest();
    const owner = await accountUser();
    await call("POST", "/api/auth/login", {
      token: g.accessToken,
      body: { email: owner.user.email, password: "correct horse battery" },
    });
    assert.equal((await call("GET", "/api/invitations", { token: g.accessToken })).status, 401);
  });

  test("requests without a token are refused", async () => {
    assert.equal((await call("GET", "/api/invitations")).status, 401);
    assert.equal((await call("POST", "/api/invitations", { body: {} })).status, 401);
  });
});

describe("google sign-in", () => {
  test("a guest signing in with Google becomes that account and keeps their drafts", async () => {
    const g = await guest();
    const inv = await createInvitation(g.accessToken);
    const email = newEmail();
    const res = await call<AuthResponse>("POST", "/api/auth/google", {
      token: g.accessToken,
      body: { credential: gcred("g-sub-1", email, "Layla") },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.id, g.user.id);
    assert.equal(res.body.user.isGuest, false);
    assert.equal(res.body.user.name, "Layla");

    const again = await call<AuthResponse>("POST", "/api/auth/google", { body: { credential: gcred("g-sub-1", email) } });
    assert.equal(again.body.user.id, g.user.id);
    const list = await call<InvitationSummary[]>("GET", "/api/invitations", { token: again.body.accessToken });
    assert.equal(list.body[0].id, inv.id);
  });

  test("signing in with Google as a guest merges into an existing Google account", async () => {
    const email = newEmail();
    const first = await call<AuthResponse>("POST", "/api/auth/google", { body: { credential: gcred("g-sub-2", email) } });
    const g = await guest();
    const draft = await createInvitation(g.accessToken);
    const res = await call<AuthResponse>("POST", "/api/auth/google", {
      token: g.accessToken,
      body: { credential: gcred("g-sub-2", email) },
    });
    assert.equal(res.body.user.id, first.body.user.id);
    const list = await call<InvitationSummary[]>("GET", "/api/invitations", { token: res.body.accessToken });
    assert.deepEqual(list.body.map((i) => i.id), [draft.id]);
  });

  test("Google linking to a password account drops the unverified password", async () => {
    const email = newEmail();
    await call("POST", "/api/auth/register", { body: { email, password: "attackers password" } });
    const google = await call<AuthResponse>("POST", "/api/auth/google", { body: { credential: gcred("g-sub-3", email) } });
    assert.equal(google.status, 201);
    const login = await call("POST", "/api/auth/login", { body: { email, password: "attackers password" } });
    assert.equal(login.status, 401);
  });

  test("bad or unverified Google credentials are refused", async () => {
    const bad = await call("POST", "/api/auth/google", { body: { credential: "x".repeat(30) } });
    assert.equal(bad.status, 401);
    const unverified = await call("POST", "/api/auth/google", {
      body: { credential: gcred("g-sub-4", newEmail(), "Name", "unverified") },
    });
    assert.equal(unverified.status, 401);
  });
});

describe("publishing and sharing", () => {
  test("an account can publish, and visitors can open it without signing in", async () => {
    const u = await accountUser();
    const inv = await createInvitation(u.accessToken);
    const pub = await call<InvitationRecord>("PATCH", `/api/invitations/${inv.id}`, {
      token: u.accessToken,
      body: { published: true },
    });
    assert.equal(pub.status, 200);
    assert.equal(pub.body.published, true);

    const open = await call("GET", `/api/public/invitations/${inv.slug}`);
    assert.equal(open.status, 200);
    assert.deepEqual(Object.keys(open.body).sort(), ["content", "eventType", "rsvpFields", "slug"]);

    await call("PATCH", `/api/invitations/${inv.id}`, { token: u.accessToken, body: { published: false } });
    assert.equal((await call("GET", `/api/public/invitations/${inv.slug}`)).status, 404);
  });

  test("a guest's draft publishes after they sign in", async () => {
    const g = await guest();
    const inv = await createInvitation(g.accessToken);
    assert.equal((await call("PATCH", `/api/invitations/${inv.id}`, { token: g.accessToken, body: { published: true } })).status, 403);
    const reg = await call<AuthResponse>("POST", "/api/auth/register", {
      token: g.accessToken,
      body: { email: newEmail(), password: "correct horse battery" },
    });
    const pub = await call("PATCH", `/api/invitations/${inv.id}`, { token: reg.body.accessToken, body: { published: true } });
    assert.equal(pub.status, 200);
  });

  test("links can be checked and changed", async () => {
    const u = await accountUser();
    const a = await createInvitation(u.accessToken);
    const b = await createInvitation(u.accessToken);
    const check = (slug: string, id?: string) =>
      call("GET", `/api/invitations/slug-check?slug=${encodeURIComponent(slug)}${id ? `&id=${id}` : ""}`, { token: u.accessToken });

    assert.equal((await check("demo")).body.available, false);
    assert.equal((await check("ab")).body.available, false);
    assert.equal((await check("Has Spaces")).body.available, false);
    assert.equal((await check(a.slug)).body.available, false);
    assert.equal((await check(a.slug, a.id)).body.available, true);
    assert.equal((await check("sara-and-omar-wedding")).body.available, true);

    const taken = await call("PATCH", `/api/invitations/${b.id}`, { token: u.accessToken, body: { slug: a.slug } });
    assert.equal(taken.status, 409);
    const reserved = await call("PATCH", `/api/invitations/${b.id}`, { token: u.accessToken, body: { slug: "dashboard" } });
    assert.equal(reserved.status, 409);
    const changed = await call<InvitationRecord>("PATCH", `/api/invitations/${b.id}`, {
      token: u.accessToken,
      body: { slug: "sara-and-omar-wedding", published: true },
    });
    assert.equal(changed.status, 200);
    assert.equal((await call("GET", "/api/public/invitations/sara-and-omar-wedding")).status, 200);
  });

  test("people cannot touch each other's invitations", async () => {
    const a = await accountUser();
    const b = await accountUser();
    const inv = await createInvitation(a.accessToken);
    assert.equal((await call("GET", `/api/invitations/${inv.id}`, { token: b.accessToken })).status, 403);
    assert.equal((await call("PATCH", `/api/invitations/${inv.id}`, { token: b.accessToken, body: { published: true } })).status, 403);
    assert.equal((await call("DELETE", `/api/invitations/${inv.id}`, { token: b.accessToken })).status, 403);
    assert.equal((await call("GET", `/api/invitations/${inv.id}/responses`, { token: b.accessToken })).status, 403);
  });

  test("an invitation can be deleted", async () => {
    const u = await accountUser();
    const inv = await createInvitation(u.accessToken);
    assert.equal((await call("DELETE", `/api/invitations/${inv.id}`, { token: u.accessToken })).status, 200);
    assert.equal((await call("GET", `/api/invitations/${inv.id}`, { token: u.accessToken })).status, 404);
  });
});

describe("RSVP", () => {
  async function published(fields?: unknown) {
    const u = await accountUser();
    const inv = await createInvitation(u.accessToken);
    await call("PATCH", `/api/invitations/${inv.id}`, {
      token: u.accessToken,
      body: { published: true, ...(fields ? { rsvpFields: fields } : {}) },
    });
    return { u, inv };
  }

  test("guests answer, and the host sees a summary", async () => {
    const { u, inv } = await published();
    const rsvp = (body: unknown) => call("POST", `/api/public/invitations/${inv.slug}/rsvp`, { body });

    assert.equal((await rsvp({ status: "ATTENDING", guestName: "Hana", answers: { name: "Hana", guests: "3", message: "Can't wait" } })).status, 201);
    assert.equal((await rsvp({ status: "ATTENDING", guestName: "Idris", answers: { name: "Idris", guests: "2" } })).status, 201);
    assert.equal((await rsvp({ status: "DECLINED", guestName: "Jamal" })).status, 201);
    assert.equal((await rsvp({ status: "MAYBE", guestName: "Karim", answers: { name: "Karim" } })).status, 201);

    const res = await call<ResponsesPayload>("GET", `/api/invitations/${inv.id}/responses`, { token: u.accessToken });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.summary, { attending: 2, declined: 1, maybe: 1, total: 4, guestsAttending: 5 });
    assert.equal(res.body.responses.length, 4);
    assert.equal(res.body.responses.find((r) => r.guestName === "Hana")?.answers.message, "Can't wait");

    const list = await call<InvitationSummary[]>("GET", "/api/invitations", { token: u.accessToken });
    assert.equal(list.body.find((i) => i.id === inv.id)?.responseCount, 4);
  });

  test("required answers and answer types are enforced", async () => {
    const { inv } = await published([
      { id: "name", label: "Your name", type: "text", required: true },
      { id: "guests", label: "Guests", type: "number", required: true },
      { id: "email", label: "Email", type: "email", required: false },
      { id: "meal", label: "Meal", type: "select", required: false, options: ["Chicken", "Vegetarian"] },
    ]);
    const rsvp = (body: unknown) => call("POST", `/api/public/invitations/${inv.slug}/rsvp`, { body });
    assert.equal((await rsvp({ status: "ATTENDING", guestName: "A", answers: { name: "A" } })).status, 400);
    assert.equal((await rsvp({ status: "ATTENDING", guestName: "A", answers: { name: "A", guests: "lots" } })).status, 400);
    assert.equal((await rsvp({ status: "ATTENDING", guestName: "A", answers: { name: "A", guests: "2", email: "nope" } })).status, 400);
    assert.equal((await rsvp({ status: "ATTENDING", guestName: "A", answers: { name: "A", guests: "2", meal: "Fish" } })).status, 400);
    assert.equal((await rsvp({ status: "ATTENDING", guestName: "A", answers: { name: "A", guests: "2", meal: "Chicken" } })).status, 201);
    assert.equal((await rsvp({ status: "DECLINED", guestName: "B" })).status, 201);
    assert.equal((await rsvp({ status: "SURE", guestName: "B" })).status, 400);
  });

  test("an unpublished invitation takes no responses", async () => {
    const u = await accountUser();
    const inv = await createInvitation(u.accessToken);
    const res = await call("POST", `/api/public/invitations/${inv.slug}/rsvp`, { body: { status: "DECLINED", guestName: "A" } });
    assert.equal(res.status, 404);
  });
});

describe("uploads", () => {
  async function upload(token: string, kind: string, data: Buffer, name: string, type: string) {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", new Blob([new Uint8Array(data)], { type }), name);
    return call("POST", "/api/uploads", { token, form });
  }

  test("photos are resized, converted and served with long caching", async () => {
    const g = await guest();
    const png = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#8844aa" } }).png().toBuffer();
    const res = await upload(g.accessToken, "image", png, "big.png", "image/png");
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.match(res.body.url, /^\/api\/uploads\/[0-9a-f]{24}\.webp$/);

    const file = await fetch(`${base}${res.body.url}`);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get("content-type"), "image/webp");
    assert.match(file.headers.get("cache-control") ?? "", /max-age=2592000/);
    const meta = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
    assert.equal(meta.width, 1920);
    assert.equal(meta.format, "webp");
  });

  test("an uploaded photo can be used as the cover", async () => {
    const g = await guest();
    const inv = await createInvitation(g.accessToken);
    const png = await sharp({ create: { width: 200, height: 200, channels: 3, background: "#cc3355" } }).png().toBuffer();
    const up = await upload(g.accessToken, "image", png, "c.png", "image/png");
    const res = await call<InvitationRecord>("PATCH", `/api/invitations/${inv.id}`, {
      token: g.accessToken,
      body: { content: { ...inv.content, coverImageUrl: up.body.url } },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.content.coverImageUrl, up.body.url);
  });

  test("non-photos are refused", async () => {
    const g = await guest();
    const text = await upload(g.accessToken, "image", Buffer.from("hello"), "a.png", "image/png");
    assert.equal(text.status, 400);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    assert.equal((await upload(g.accessToken, "image", svg, "a.svg", "image/svg+xml")).status, 400);
    assert.equal((await upload(g.accessToken, "other", Buffer.from("x"), "a.png", "image/png")).status, 400);
  });

  test("3D models must be real .glb files", async () => {
    const g = await guest();
    const glb = Buffer.alloc(40);
    glb.write("glTF", 0, "ascii");
    glb.writeUInt32LE(2, 4);
    glb.writeUInt32LE(glb.length, 8);
    const ok = await upload(g.accessToken, "model", glb, "m.glb", "model/gltf-binary");
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.match(ok.body.url, /\.glb$/);

    const inv = await createInvitation(g.accessToken);
    const hero = inv.content.sections.find((s) => s.type === "hero")!;
    const content = {
      ...inv.content,
      sections: inv.content.sections.map((s) => (s.id === hero.id ? { ...s, model: { kind: "custom", url: ok.body.url } } : s)),
    };
    const saved = await call("PATCH", `/api/invitations/${inv.id}`, { token: g.accessToken, body: { content } });
    assert.equal(saved.status, 200);

    const wrongLength = Buffer.from(glb);
    wrongLength.writeUInt32LE(999, 8);
    assert.equal((await upload(g.accessToken, "model", wrongLength, "m.glb", "model/gltf-binary")).status, 400);
    assert.equal((await upload(g.accessToken, "model", Buffer.from("not a model at all, really"), "m.glb", "model/gltf-binary")).status, 400);
  });

  test("uploading needs a session", async () => {
    const res = await upload("", "image", Buffer.from("x"), "a.png", "image/png");
    assert.equal(res.status, 401);
  });

  test("uploads move with the guest when they sign in", async () => {
    const g = await guest();
    const png = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#111111" } }).png().toBuffer();
    await upload(g.accessToken, "image", png, "a.png", "image/png");
    const reg = await call<AuthResponse>("POST", "/api/auth/register", {
      token: g.accessToken,
      body: { email: newEmail(), password: "correct horse battery" },
    });
    const more = await upload(reg.body.accessToken, "image", png, "b.png", "image/png");
    assert.equal(more.status, 201);
  });
});
