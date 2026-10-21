import { chromium } from "playwright";

const base = process.env.SWAY_URL ?? "http://127.0.0.1:8080/";
const errors = [];

function track(page, name) {
  page.on("pageerror", (err) => errors.push(`${name}: ${err.message}`));
}

async function openHome(page) {
  await page.goto(base, { waitUntil: "networkidle" });
}

async function makeRoom(page, name) {
  await page.getByRole("button", { name: "▼ Make a room ▼" }).click();
  await page.getByPlaceholder("Maya").fill(name);
  await page.getByRole("button", { name: "▼ Open the room ▼" }).click();
  await page.locator(".px-code").waitFor();
  return (await page.locator(".px-code").innerText()).trim();
}

async function joinRoom(page, name, code, team) {
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await page.getByPlaceholder("Maya").fill(name);
  if (team === "tide") await page.getByRole("button", { name: "Tide" }).click();
  await page.getByPlaceholder("K7MQ").fill(code);
  await page.getByRole("button", { name: "▼ Join ▼" }).click();
  await page.getByText(code).waitFor();
}

async function crewCast(page) {
  await page.getByLabel("Your cast").waitFor({ timeout: 8000 });
  const blur = (await page.locator("span.text-fg").first().innerText()).trim();
  await page.getByLabel("Your cast").fill(blur);
  await page.getByRole("button", { name: /Cast ·/ }).click();
  await page.getByText(/Thrown back/).waitFor({ timeout: 8000 });
  for (const line of ["it is large", "something round"]) {
    await page.getByLabel("Your cast").fill(line);
    await page.getByRole("button", { name: /Cast ·/ }).click();
    await Promise.race([
      page.getByText(line, { exact: true }).waitFor({ timeout: 8000 }),
      page.getByText(/Deal 1 of|Your three casts are in/i).waitFor({ timeout: 8000 }),
    ]);
  }
  await page.getByText(/Your three casts are in|Deal 1 of|Fifteen seconds/i).waitFor({ timeout: 8000 });
}

const browser = await chromium.launch({ headless: true });
const seats = ["Ada", "Bo", "Cy", "Dee"];
const contexts = [];
const pages = [];
try {
  for (const name of seats) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    track(page, name);
    contexts.push(context);
    pages.push(page);
    await openHome(page);
  }
  const [ada, bo, cy, dee] = pages;
  const code = await makeRoom(ada, "Ada");
  if (!/^[A-Z0-9]{4}$/.test(code)) throw new Error(`bad code ${code}`);
  await joinRoom(bo, "Bo", code, "amber");
  await joinRoom(cy, "Cy", code, "tide");
  await joinRoom(dee, "Dee", code, "tide");
  await ada.getByRole("button", { name: /toss for the net/i }).click();
  await Promise.all(pages.map((page) => page.getByText(/needle picked the skipper/i).waitFor({ timeout: 8000 })));

  const bodies = await Promise.all(pages.map((page) => page.locator("body").innerText()));
  const skipperIndex = bodies.findIndex((text) => /cast the net/i.test(text));
  if (skipperIndex < 0) throw new Error(`no skipper\n${bodies.join("\n---\n")}`);
  const skipper = pages[skipperIndex];
  const crew = pages.filter((_, index) => index !== skipperIndex);
  if (/your blur is/i.test(bodies[skipperIndex])) throw new Error("skipper can see a blur");
  const crewBodies = bodies.filter((_, index) => index !== skipperIndex);
  if (crewBodies.some((text) => !/your blur is/i.test(text))) throw new Error("a crew member has no blur");

  await skipper.getByRole("button", { name: /cast the net/i }).click();
  await Promise.all(crew.map((page) => crewCast(page)));
  await skipper.getByText(/Deal 1 of|Fifteen seconds/).waitFor({ timeout: 12000 });

  if (await skipper.getByText(/Deal 1 of/).count()) {
    await Promise.all(crew.map((page) => page.getByText("Face down").first().waitFor({ timeout: 8000 })));
    for (const page of crew) {
      const crewText = await page.locator("body").innerText();
      if (crewText.includes("it is large") || crewText.includes("something round")) {
        throw new Error("crew can read the deal");
      }
    }
    const skipperText = await skipper.locator("body").innerText();
    if (!skipperText.includes("it is large") && !skipperText.includes("something round")) {
      throw new Error("skipper cannot read the deal");
    }
  }

  for (let i = 0; i < 8; i += 1) {
    if (await skipper.getByLabel("Search the bank").count()) break;
    const choice = skipper.locator("button.px-say:not([disabled])");
    if ((await choice.count()) === 0) {
      await skipper.waitForTimeout(150);
      continue;
    }
    await choice.first().click({ timeout: 4000 });
  }
  await skipper.getByLabel("Search the bank").waitFor({ timeout: 8000 });
  await skipper.getByLabel("Search the bank").fill("Cat");
  await skipper.getByRole("button", { name: "Cat", exact: true }).click();

  await skipper.getByRole("button", { name: /pause/i }).waitFor({ timeout: 8000 });
  const during = await skipper.locator("body").innerText();
  if (/the fish was/i.test(during)) throw new Error("scores showed during the haul");
  if ((await skipper.locator('svg text[fill="#ffd166"]').count()) !== 0) throw new Error("fish name is on screen during the haul");
  const clock = (await skipper.locator(".tabular-nums").last().innerText()).trim();
  await skipper.getByRole("button", { name: /pause/i }).click();
  await skipper.getByRole("button", { name: /resume/i }).waitFor();
  await skipper.waitForTimeout(1500);
  const held = (await skipper.locator(".tabular-nums").last().innerText()).trim();
  await skipper.waitForTimeout(1200);
  const heldAgain = (await skipper.locator(".tabular-nums").last().innerText()).trim();
  if (heldAgain !== held) throw new Error(`pause did not hold (${clock} -> ${held} -> ${heldAgain})`);
  await skipper.getByRole("button", { name: /resume/i }).click();
  await skipper.getByText(/the fish was/i).waitFor({ timeout: 14000 });
  const secretLine = await skipper.getByText(/the fish was/i).innerText();
  const secret = secretLine.replace(/the fish was/i, "").replace(".", "").trim();
  const tag = (await skipper.locator('svg text[fill="#ffd166"]').textContent())?.trim();
  if (tag !== secret) throw new Error(`name tag ${tag} != ${secret}`);
  await skipper.getByRole("button", { name: /next cast|see the match/i }).click();
  await skipper.getByText(/holds the net|takes it|split catch/i).waitFor({ timeout: 8000 });

  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`room ok ${code} secret ${secret} skipper ${seats[skipperIndex]}`);
} catch (err) {
  console.error(errors.join("\n"));
  for (let i = 0; i < pages.length; i += 1) {
    await pages[i].screenshot({ path: `/workspace/screenshots/qa-seat-${i}.png` }).catch(() => undefined);
    console.error("---", seats[i], "---");
    console.error(await pages[i].locator("body").innerText().catch(() => ""));
  }
  throw err;
} finally {
  await browser.close();
}
