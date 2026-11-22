// Reset someone's password.
// Usage: npm run user:set-password -- someone@example.com
// The password is typed at a prompt so it doesn't end up in shell history.
import "dotenv/config";

import mongoose from "mongoose";
import { createInterface } from "node:readline";
import { z } from "zod";

import { User } from "../lib/models";
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../lib/password";

// One reader for both prompts, otherwise piped input gets lost. Input isn't echoed.
function createHiddenPrompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  const writable = rl as unknown as { _writeToOutput: (s: string) => void };
  writable._writeToOutput = () => {}; // never echo input
  const lines = rl[Symbol.asyncIterator]();
  return {
    async ask(question: string): Promise<string> {
      process.stdout.write(question);
      const next = await lines.next();
      process.stdout.write("\n");
      return next.done ? "" : next.value;
    },
    close: () => rl.close(),
  };
}

async function main() {
  const email = z.email().safeParse(process.argv[2]?.trim().toLowerCase());
  if (!email.success) {
    console.error("Usage: npm run user:set-password -- someone@example.com");
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const user = await User.findOne({ email: email.data });
  if (!user) {
    console.error(`No account found for ${email.data}`);
    process.exitCode = 1;
    return;
  }

  const prompt = createHiddenPrompt();
  const password = await prompt.ask(`New password for ${email.data}: `);
  const again = await prompt.ask("Type it again: ");
  prompt.close();
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    console.error(`Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters. Nothing changed.`);
    process.exitCode = 1;
    return;
  }
  if (again !== password) {
    console.error("Passwords don't match. Nothing changed.");
    process.exitCode = 1;
    return;
  }

  user.passwordHash = await hashPassword(password);
  await user.save();
  console.log(`✔ Password updated for ${email.data} (${user.role}). Existing sessions stay signed in.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
