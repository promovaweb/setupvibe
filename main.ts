#!/usr/bin/env bun
import "./desktop/src/edition.ts";
import "./server/src/edition.ts";
import "./omarchy/src/edition.ts";
import { run } from "./shared/core/run.ts";

if (import.meta.main) await run(process.argv.slice(2));
