import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appPath = path.join(root, "src", "App.jsx");
const authPath = path.join(root, "src", "utils", "auth.js");
const migrationPath = path.join(root, "supabase", "migracao-final-producao-6-0-57.sql");

const app = fs.readFileSync(appPath, "utf8");
const auth = fs.readFileSync(authPath, "utf8");
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";

const checks = [
  ["aba Adicionais no menu", app.includes('id: "addons"') && app.includes('label: "Adicionais"')],
  ["tela dedicada de cadastro", app.includes('activeTab === "addons"') && app.includes('Criar adicional')],
  ["cadastro via RPC segura", app.includes('supabase.rpc("create_category_addon"')],
  ["ativar/pausar via RPC", app.includes('supabase.rpc("set_category_addon_active"')],
  ["permissão gerente para adicionais", auth.includes('"addons"')],
  ["migração cria policies", migration.includes('category_addons_select_all') && migration.includes('category_addons_insert_all')],
  ["migração cria função de cadastro", migration.includes('create_category_addon') && migration.includes('set_category_addon_active')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Fase 69 falhou:");
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log("Fase 69 OK: cadastro visual de adicionais por categoria validado.");
