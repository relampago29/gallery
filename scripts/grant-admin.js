#!/usr/bin/env node
/**
 * Marca (ou remove) a flag isAdmin de um utilizador Firebase Auth.
 *
 * Uso:
 *   node scripts/grant-admin.js --uid <UID>
 *   node scripts/grant-admin.js --email <email>
 *   node scripts/grant-admin.js --uid <UID> --revoke   # remove isAdmin
 *
 * Requer:
 *   - GOOGLE_APPLICATION_CREDENTIALS a apontar para o JSON do service account
 *   - dependência firebase-admin instalada (já no projeto)
 */

const admin = require("firebase-admin");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === "--uid") {
      args.uid = val;
      i += 1;
    } else if (key === "--email") {
      args.email = val;
      i += 1;
    } else if (key === "--revoke") {
      args.revoke = true;
    }
  }
  return args;
}

async function resolveUid(auth, { uid, email }) {
  if (uid) return uid;
  if (!email) throw new Error("Indica --uid ou --email");
  const user = await auth.getUserByEmail(email);
  return user.uid;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.uid && !args.email) {
    console.error("Uso: node scripts/grant-admin.js --uid <UID> [--revoke] | --email <email>");
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Define GOOGLE_APPLICATION_CREDENTIALS com o caminho do JSON do service account.");
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const auth = admin.auth();

  const targetUid = await resolveUid(auth, args);
  const user = await auth.getUser(targetUid);
  const existing = user.customClaims || {};
  const nextClaims = { ...existing, isAdmin: !args.revoke };

  await auth.setCustomUserClaims(targetUid, nextClaims);
  const updated = await auth.getUser(targetUid);

  console.log(
    `[grant-admin] ${args.revoke ? "Revogado isAdmin de" : "Aplicado isAdmin a"} ${updated.uid} (${updated.email || "sem email"})`
  );
  console.log("Claims atuais:", updated.customClaims);
  console.log("Se o utilizador estiver ligado, precisa de sair e entrar novamente para renovar o ID token.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
