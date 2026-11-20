// In-memory mock of the Supabase PostgREST API used by the E2E smoke tests.
// Test-only fixtures — never shipped with the app.
const fs = require("fs");
const path = require("path");
process.env.PROJECT_DIR ??= path.resolve(__dirname, "../..");

function env(projectDir) {
  const txt = fs.readFileSync(projectDir + "/.env", "utf8");
  const get = (k) => (txt.match(new RegExp(`^${k}="?([^"\\n]+)"?`, "m")) || [])[1];
  return { url: get("VITE_SUPABASE_URL") };
}

function seed() {
  const m = (id, name, gen, parent_id, gender, birthdate, status = "alive", extra = {}) => ({
    id,
    name,
    nickname: "",
    gender,
    age: 0,
    gen,
    role: "ສະມາຊິກ",
    branch: "Pog Loj (Pog Txauj Tsim)",
    village: "ໂພນສະຫວັນ",
    district: "ໄຊເສດຖາ",
    province: "ນະຄອນຫຼວງວຽງຈັນ",
    address: "ບ້ານໂພນສະຫວັນ, ເມືອງໄຊເສດຖາ, ແຂວງນະຄອນຫຼວງວຽງຈັນ",
    status,
    phone: "020 5555 0000",
    photo: null,
    parent_id,
    note: null,
    birthdate,
    category: "ສະມາຊິກ",
    position: null,
    ...extra,
  });
  return {
    members: [
      m(1, "ທ້າວ ບຸນມີ ແສງສະຫວັນ", 1, null, "M", "1947-03-12"),
      m(2, "ນາງ ບົວວັນ ແສງສະຫວັນ", 1, null, "F", "1950-11-21"),
      m(3, "ທ້າວ ສົມພອນ ແສງສະຫວັນ", 2, 1, "M", "1973-01-22", "alive", {
        role: "ຮອງປະທານ",
        category: "ຄະນະນຳ",
      }),
      m(4, "ນາງ ສຸພາພອນ ແສງສະຫວັນ", 2, 1, "F", "1976-05-30"),
      m(5, "ທ້າວ ນັນທະວົງ ແສງສະຫວັນ", 3, 3, "M", "2001-06-10"),
      m(6, "ທ້າວ ສີວິໄລ ສຸວັນນະວົງ", 1, null, "M", "1943-04-08", "deceased"),
    ],
    member_relations: [
      { id: 1, member_id: 1, related_id: 3, relation_type: "child" },
      { id: 2, member_id: 1, related_id: 2, relation_type: "spouse" },
    ],
    events: [
      {
        id: 1,
        title: "ບຸນປີໃໝ່ຕະກູນ",
        category: "ງານຕະກູນ",
        status: "upcoming",
        description: "ງານພົບປະປະຈຳປີ",
        date: "2026-11-25",
        time: "08:00 – 16:00",
        location: "ບ້ານໂພນສະຫວັນ",
        organizer: "ທ້າວ ບຸນມີ ແສງສະຫວັນ",
        attendees: 0,
        budget: 0,
        spent: 0,
        contributions: 0,
        expected_per_member: 100000,
        tags: [],
        cover: null,
        color_a: null,
        color_b: null,
      },
      {
        id: 2,
        title: "ປະຊຸມຄະນະນຳ",
        category: "ປະຊຸມ",
        status: "past",
        description: "",
        date: "2026-07-15",
        time: "14:00",
        location: "ສຳນັກງານ",
        organizer: "",
        attendees: 0,
        budget: 0,
        spent: 0,
        contributions: 0,
        expected_per_member: 50000,
        tags: [],
        cover: null,
        color_a: null,
        color_b: null,
      },
    ],
    transactions: [
      {
        id: "TXN-1",
        created_at: 1,
        date: "2026-07-10",
        direction: "income",
        amount: 60000,
        description: "",
        event_id: 2,
        category: "ຄ່າທຳນຽມ",
        member_id: 3,
        type: "ຄ່າທຳນຽມ",
        contributor: "ທ້າວ ສົມພອນ ແສງສະຫວັນ",
        method: "ເງິນສົດ",
        note: null,
        event_title: "ປະຊຸມຄະນະນຳ",
      },
      {
        id: "TXN-2",
        created_at: 2,
        date: "2026-07-12",
        direction: "income",
        amount: 40000,
        description: "",
        event_id: 2,
        category: "ຄ່າທຳນຽມ",
        member_id: 3,
        type: "ຄ່າທຳນຽມ",
        contributor: "",
        method: "ໂອນເງິນ",
        note: null,
        event_title: "",
      },
      {
        id: "TXN-3",
        created_at: 3,
        date: "2026-07-20",
        direction: "expense",
        amount: 900000,
        description: "",
        event_id: 2,
        category: "ອາຫານ",
        member_id: null,
        type: "ລາຍຈ່າຍ",
        contributor: "ຮ້ານອາຫານ",
        method: "ເງິນສົດ",
        note: null,
        event_title: "",
      },
      {
        id: "TXN-4",
        created_at: 4,
        date: "2025-03-01",
        direction: "income",
        amount: 20000,
        description: "",
        event_id: null,
        category: "ບໍລິຈາກ",
        member_id: null,
        type: "ບໍລິຈາກ",
        contributor: "ຜູ້ໃຈບຸນ",
        method: "ເງິນສົດ",
        note: null,
        event_title: "",
      },
    ],
    fund_members: [
      {
        id: "FM-1",
        member_id: 3,
        joined_at: "2026-01-01",
        status: "active",
        note: "",
        created_at: 1,
        updated_at: 1,
      },
      {
        id: "FM-2",
        member_id: 4,
        joined_at: "2026-01-01",
        status: "active",
        note: "",
        created_at: 2,
        updated_at: 2,
      },
    ],
    leadership: [
      {
        id: 1,
        name: "ທ້າວ ສົມພອນ ແສງສະຫວັນ",
        position: "ຮອງປະທານ",
        branch: "",
        phone: "020",
        photo: null,
        bio: "ຮັບຜິດຊອບງານກິດຈະກຳ",
        member_id: 3,
        data: { status: "active" },
        department: "ຄະນະບໍລິຫານ",
        display_order: 1,
        active: true,
        person_type: "leadership",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: 2,
        name: "ອະດີດຜູ້ນຳ",
        position: "ປະທານ",
        branch: "",
        phone: "",
        photo: null,
        bio: "",
        member_id: null,
        data: { status: "former" },
        department: "",
        display_order: 2,
        active: false,
        person_type: "leadership",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
    elders: [
      {
        id: 1,
        name: "ທ້າວ ບຸນມີ ແສງສະຫວັນ",
        age: null,
        branch: "",
        phone: "",
        photo: null,
        note: "",
        member_id: 1,
        data: { status: "living", contributions: "ກໍ່ຕັ້ງກອງທຶນ" },
        position: "ປະທານຜູ້ອາວຸໂສ",
        bio: "",
        department: "",
        display_order: 1,
        active: true,
        person_type: "senior",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
    news: [
      {
        id: 1,
        title: "ເຊີນເຂົ້າຮ່ວມບຸນປີໃໝ່",
        summary: "ຂໍເຊີນທຸກທ່ານ",
        content: "ລາຍລະອຽດ...",
        category: "ກິດຈະກຳ",
        author: "ຄະນະນຳ",
        date: "2026-11-01",
        tags: ["ບຸນ"],
        views: 3,
        comments: 0,
        pinned: true,
        featured: true,
        urgent: false,
        image: null,
        published: true,
      },
      {
        id: 2,
        title: "ຮ່າງ: ແຜນງົບປະມານ",
        summary: "",
        content: "ຮ່າງ",
        category: "ການເງິນ",
        author: "",
        date: "2026-11-10",
        tags: [],
        views: 0,
        comments: 0,
        pinned: false,
        featured: false,
        urgent: false,
        image: null,
        published: false,
      },
    ],
    participants: [{ id: 1, event_id: 1, member_id: 3 }],
    gallery: [],
    user_roles: [{ id: "r1", user_id: "00000000-0000-0000-0000-00000000aaaa", role: "member" }],
  };
}

// Columns guests may not read (mirrors the DB column grants).
const PRIVATE = {
  members: ["phone", "address", "birthdate", "note"],
  transactions: "*",
  fund_members: "*",
};

function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(k)) continue;
    const m = /^(eq|in)\.(.*)$/.exec(v);
    if (!m) continue;
    if (m[1] === "eq") out = out.filter((r) => String(r[k]) === m[2]);
    else {
      const vals = m[2]
        .replace(/^\(|\)$/g, "")
        .split(",")
        .map((s) => s.replace(/^"|"$/g, ""));
      out = out.filter((r) => vals.includes(String(r[k])));
    }
  }
  return out;
}

function pick(row, select) {
  if (!select || select === "*") return row;
  const cols = select.split(",").map((s) => s.trim());
  return Object.fromEntries(cols.filter((c) => c in row).map((c) => [c, row[c]]));
}

async function install(page, { authed, db, log }) {
  const { url } = env(process.env.PROJECT_DIR);
  const host = new URL(url).host;
  let nextId = 1000;
  await page.context().routeWebSocket(
    (u) => u.host === host,
    () => {},
  ); // mocked: never reaches the network
  return page.route(
    (u) => u.host === host,
    async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const method = req.method();
      if (u.pathname.startsWith("/rest/v1/rpc/")) {
        log.push(`RPC ${u.pathname.split("/").pop()}`);
        return route.fulfill({ status: 204, body: "" });
      }
      const m = /^\/rest\/v1\/([a-z_]+)/.exec(u.pathname);
      if (!m) return route.fulfill({ status: 404, body: "{}" });
      const table = m[1];
      const rows = (db[table] ??= []);
      const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
      const send = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(single ? (Array.isArray(data) ? (data[0] ?? null) : data) : data),
        });
      const select = u.searchParams.get("select");

      if (method === "GET") {
        if (!authed && PRIVATE[table] === "*")
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({ code: "42501", message: "permission denied" }),
          });
        if (
          !authed &&
          PRIVATE[table] &&
          (!select || select === "*" || PRIVATE[table].some((c) => select.split(",").includes(c)))
        )
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              code: "42501",
              message: "permission denied for table " + table,
            }),
          });
        let out = applyFilters(rows, u.searchParams);
        if (!authed && table === "news") out = out.filter((r) => r.published);
        return send(out.map((r) => pick(r, select)));
      }
      if (!authed)
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ code: "42501", message: "permission denied" }),
        });
      const body = req.postDataJSON();
      if (method === "POST") {
        const list = (Array.isArray(body) ? body : [body]).map((r) => ({
          id: r.id ?? nextId++,
          ...r,
        }));
        rows.push(...list);
        log.push(`INSERT ${table} ${list.length}`);
        return send(list, 201);
      }
      const hit = applyFilters(rows, u.searchParams);
      if (method === "PATCH") {
        hit.forEach((r) => Object.assign(r, body));
        log.push(`UPDATE ${table} ${hit.length}`);
        return send(hit);
      }
      if (method === "DELETE") {
        for (const r of hit) rows.splice(rows.indexOf(r), 1);
        log.push(`DELETE ${table} ${hit.length}`);
        return route.fulfill({ status: 204, body: "" });
      }
      return route.fulfill({ status: 405, body: "{}" });
    },
  );
}

function sessionInit(authed) {
  const { url } = env(process.env.PROJECT_DIR);
  const ref = new URL(url).host.split(".")[0];
  if (!authed) return { key: null };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
  const user = {
    id: "00000000-0000-0000-0000-00000000aaaa",
    aud: "authenticated",
    role: "authenticated",
    email: "tester@example.com",
    user_metadata: { display_name: "ຜູ້ທົດສອບ" },
    app_metadata: {},
  };
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, role: "authenticated" })}.sig`;
  return {
    key: `sb-${ref}-auth-token`,
    value: JSON.stringify({
      access_token: token,
      refresh_token: "r",
      token_type: "bearer",
      expires_in: 86400,
      expires_at: exp,
      user,
    }),
  };
}

module.exports = { seed, install, sessionInit };
