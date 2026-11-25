// Plan de l'usine : quelles apps construire maintenant ?
//
// - Lancement à la main (workflow_dispatch) : l'app demandée, toujours
//   construite si « force » est coché, sinon seulement si son code a changé.
// - Passage programmé (toutes les 15 min) : chaque app de apps.json dont la
//   branche a avancé depuis la dernière construction ET dont un fichier
//   surveillé (`watch`) a changé.
//
// Écrit `matrix=<json>` (sortie GitHub Actions) : [{ id, repo, sha, dir, type,
// build, apkName, release, env }]. N'affiche jamais le jeton.
import fs from "node:fs";

const token = process.env.GH_TOKEN;
const event = process.env.EVENT || "schedule";
const wanted = (process.env.APP || "").trim();
const force = process.env.FORCE === "true";

const { apps } = JSON.parse(fs.readFileSync("apps.json", "utf8"));

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "usine-apk" },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} sur ${path.split("?")[0]}`);
  return res.json();
}

function readState(id) {
  try {
    return JSON.parse(fs.readFileSync(`state/${id}.json`, "utf8"));
  } catch {
    return null;
  }
}

/** Un fichier surveillé a-t-il changé entre deux commits ? (null = inconnu → on construit) */
async function watchedChanged(app, base, head) {
  try {
    const cmp = await gh(`/repos/${app.repo}/compare/${base}...${head}`);
    const files = (cmp.files || []).map((f) => f.filename);
    // Au-delà de 300 fichiers, GitHub tronque la liste : on construit par prudence.
    if (files.length >= 300) return true;
    return files.some((f) => (app.watch || [""]).some((w) => f.startsWith(w)));
  } catch {
    return null;
  }
}

const plan = [];
for (const app of apps) {
  if (event === "workflow_dispatch" && wanted && app.id !== wanted) continue;
  let sha;
  try {
    sha = (await gh(`/repos/${app.repo}/commits/${encodeURIComponent(app.ref || "main")}`)).sha;
  } catch (error) {
    console.error(`[${app.id}] dépôt illisible : ${error.message} (jeton APP_REPO_TOKEN ?)`);
    continue;
  }
  const state = readState(app.id);
  let build = event === "workflow_dispatch" && force;
  if (!build && state?.sha !== sha) {
    build = !state?.sha ? true : (await watchedChanged(app, state.sha, sha)) !== false;
  }
  console.error(`[${app.id}] ${sha.slice(0, 7)} (dernière construction : ${state?.sha?.slice(0, 7) || "aucune"}) → ${build ? "construction" : "rien à faire"}`);
  if (!build) continue;
  plan.push({
    id: app.id,
    repo: app.repo,
    sha,
    dir: app.dir || ".",
    type: app.type || "expo",
    build: Math.max(Number(state?.build || 0) + 1, Number(app.firstBuild || 1)),
    apkName: app.apkName || app.id,
    release: app.release || `${app.id}-android`,
    name: app.name || app.id,
    env: app.env || {},
  });
}

process.stdout.write(`matrix=${JSON.stringify(plan)}\n`);
