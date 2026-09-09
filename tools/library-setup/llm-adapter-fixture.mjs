#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
if (config.capture_path) {
    appendFileSync(config.capture_path, `${JSON.stringify(request)}\n`);
}
if (config.capture_env_path) {
    writeFileSync(config.capture_env_path, JSON.stringify(process.env));
}
if (config.child_marker_path) {
    spawn(
        process.execPath,
        [
            '-e',
            `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(config.child_marker_path)}, 'descendant vivant'), 250)`,
        ],
        { stdio: 'ignore' }
    );
}
const respond = () => {
    if (config.marker_path) writeFileSync(config.marker_path, 'late mutation');
    if (config.stderr_bytes) {
        process.stderr.write('s'.repeat(config.stderr_bytes));
    }
    if (config.raw_stdout_hex) {
        process.stdout.write(Buffer.from(config.raw_stdout_hex, 'hex'));
        return;
    }
    if (config.raw_stdout) {
        process.stdout.write(config.raw_stdout);
        return;
    }
    if (config.exit_code) {
        process.exitCode = config.exit_code;
        return;
    }
    const response = config.responses
        ? config.responses[request.iteration - 1]
        : config.response;
    process.stdout.write(JSON.stringify(response));
};
if (config.delay_ms) setTimeout(respond, config.delay_ms);
else respond();
