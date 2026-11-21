#!/usr/bin/env bun
import "../../main.ts";
import { run } from "../../shared/core/run.ts";

await run(process.argv.slice(2), "desktop");
