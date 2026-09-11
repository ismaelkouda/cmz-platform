import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
    chmodSync,
    closeSync,
    constants,
    existsSync,
    fsyncSync,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    realpathSync,
    writeFileSync,
    writeSync,
} from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { visit as visitJsonc } from 'jsonc-parser';

import { buildLibraryChangeSet } from './library-plan.mjs';
import { replaceRegularFile } from './dependency-resolution.mjs';
import { snapshotFilesystem, snapshotSha256 } from './filesystem-snapshot.mjs';

function fail(message) {
    throw new Error(`bounded LLM: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function exactKeys(value, expected) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        JSON.stringify(Object.keys(value).sort()) ===
            JSON.stringify([...expected].sort())
    );
}

function pathState(workspace, app, relativePath, allowMissing = false) {
    const appRoot = resolve(workspace, 'apps', app);
    const target = resolve(appRoot, ...relativePath.split('/'));
    const rel = relative(appRoot, target);
    if (rel === '..' || rel.startsWith(`..${sep}`) || rel !== relativePath) {
        fail(`chemin non canonique ou hors app : ${relativePath}`);
    }
    let current = appRoot;
    const appStats = lstatSync(current);
    if (appStats.isSymbolicLink() || !appStats.isDirectory()) {
        fail(`apps/${app} n'est pas un répertoire régulier`);
    }
    const segments = relativePath.split('/');
    for (const [index, segment] of segments.entries()) {
        current = join(current, segment);
        if (!existsSync(current)) {
            if (allowMissing && index === segments.length - 1) {
                return { exists: false, absolute: current };
            }
            fail(`${relativePath}: composante absente ${segment}`);
        }
        const stats = lstatSync(current);
        if (stats.isSymbolicLink()) fail(`${relativePath}: lien symbolique`);
        if (index < segments.length - 1 && !stats.isDirectory()) {
            fail(`${relativePath}: ancêtre non répertoire`);
        }
        if (index === segments.length - 1) {
            if (!stats.isFile() || (stats.mode & 0o777) !== 0o644) {
                fail(`${relativePath}: cible non régulière de mode 100644`);
            }
            const content = readFileSync(current);
            return {
                exists: true,
                absolute: current,
                content,
                sha256: sha256(content),
            };
        }
    }
    fail(`chemin vide : ${relativePath}`);
}

function relevantInvariants(recipe, installedLibraries) {
    return [
        ...(recipe.static_invariants ?? []),
        ...(recipe.coexistence ?? [])
            .filter(({ with: peer }) => installedLibraries.includes(peer))
            .flatMap(({ static_invariants: entries = [] }) => entries),
    ];
}

function invariantFailures(workspace, app, recipe, installedLibraries) {
    const failures = [];
    for (const invariant of relevantInvariants(recipe, installedLibraries)) {
        const assertion = invariant.assert;
        let state;
        try {
            state = pathState(workspace, app, assertion.file, true);
        } catch (error) {
            failures.push(`${invariant.id}: ${error.message}`);
            continue;
        }
        if (!state.exists) {
            failures.push(`${invariant.id}: ${assertion.file} absent`);
            continue;
        }
        const content = state.content.toString('utf8');
        if (assertion.kind === 'file-exists') continue;
        if (
            assertion.kind === 'file-contains' &&
            !content.includes(assertion.value)
        ) {
            failures.push(`${invariant.id}: contenu attendu absent`);
        } else if (
            assertion.kind === 'file-matches' &&
            !new RegExp(assertion.value).test(content)
        ) {
            failures.push(`${invariant.id}: motif attendu absent`);
        }
    }
    return failures;
}

function currentFiles(workspace, app, paths) {
    return paths.map((path) => {
        const state = pathState(workspace, app, path, true);
        return state.exists
            ? {
                  path,
                  exists: true,
                  sha256: state.sha256,
                  content_utf8: state.content.toString('utf8'),
              }
            : { path, exists: false };
    });
}

function validateResponse(response, recipe, workspace, app) {
    const serialized = JSON.stringify(response);
    if (serialized === undefined) fail('réponse absente ou non sérialisable');
    const encoded = Buffer.from(serialized);
    if (encoded.length > recipe.install.max_response_bytes) {
        fail(
            `réponse de ${encoded.length} octets au-delà de ${recipe.install.max_response_bytes}`
        );
    }
    if (
        !exactKeys(response, ['schema_version', 'mutations']) ||
        response.schema_version !== '1.0.0' ||
        !Array.isArray(response.mutations) ||
        response.mutations.length === 0
    ) {
        fail('réponse hors schéma fermé');
    }
    const allowed = new Set(recipe.install.llm_write_paths);
    const seen = new Set();
    return response.mutations.map((mutation) => {
        if (
            !mutation ||
            !['create', 'modify'].includes(mutation.op) ||
            !allowed.has(mutation.path) ||
            seen.has(mutation.path) ||
            typeof mutation.content_utf8 !== 'string' ||
            !mutation.content_utf8.isWellFormed()
        ) {
            fail(
                'mutation dupliquée, destructive ou hors allowlist, ou Unicode non bien formé'
            );
        }
        seen.add(mutation.path);
        const expectedKeys =
            mutation.op === 'modify'
                ? ['op', 'path', 'sha256_before', 'content_utf8']
                : ['op', 'path', 'content_utf8'];
        if (!exactKeys(mutation, expectedKeys)) {
            fail(`mutation ${mutation.path} hors schéma fermé`);
        }
        const state = pathState(workspace, app, mutation.path, true);
        if (mutation.op === 'create' && state.exists) {
            fail(`${mutation.path}: create cible un fichier existant`);
        }
        if (mutation.op === 'modify') {
            if (!state.exists) fail(`${mutation.path}: modify cible un absent`);
            if (!/^[a-f0-9]{64}$/.test(mutation.sha256_before ?? '')) {
                fail(`${mutation.path}: précondition sha256 invalide`);
            }
            if (state.sha256 !== mutation.sha256_before) {
                fail(`${mutation.path}: précondition sha256 périmée`);
            }
        }
        return { mutation, state };
    });
}

function applyResponse(validated, workspace, app) {
    for (const { mutation, state } of validated) {
        const content = Buffer.from(mutation.content_utf8, 'utf8');
        const path = `apps/${app}/${mutation.path}`;
        if (mutation.op === 'modify') {
            replaceRegularFile(workspace, path, content);
        } else {
            const fd = openSync(
                state.absolute,
                constants.O_CREAT |
                    constants.O_EXCL |
                    constants.O_WRONLY |
                    (constants.O_NOFOLLOW ?? 0),
                0o644
            );
            try {
                writeFileSync(fd, content);
                fsyncSync(fd);
            } finally {
                closeSync(fd);
            }
        }
    }
}

function ensureAudit(repository, id) {
    if (!/^[a-f0-9]{32}$/.test(id ?? '')) {
        fail('identifiant de candidat invalide pour le journal');
    }
    const canonicalRepository = realpathSync(repository);
    const cmz = join(canonicalRepository, '.cmz');
    const auditRoot = join(cmz, 'library-llm-audit');
    if (!existsSync(cmz)) mkdirSync(cmz, { mode: 0o700 });
    const cmzStats = lstatSync(cmz);
    if (cmzStats.isSymbolicLink() || !cmzStats.isDirectory()) {
        fail('.cmz non régulier');
    }
    if (!existsSync(auditRoot)) {
        mkdirSync(auditRoot, { mode: 0o700 });
        chmodSync(auditRoot, 0o700);
    }
    const stats = lstatSync(auditRoot);
    if (
        stats.isSymbolicLink() ||
        !stats.isDirectory() ||
        realpathSync(auditRoot) !== auditRoot ||
        (stats.mode & 0o777) !== 0o700 ||
        (typeof process.getuid === 'function' && stats.uid !== process.getuid())
    ) {
        fail('racine du journal LLM non canonique ou non privée');
    }
    const path = join(auditRoot, `${id}.jsonl`);
    const fd = openSync(
        path,
        constants.O_CREAT |
            constants.O_EXCL |
            constants.O_WRONLY |
            (constants.O_NOFOLLOW ?? 0),
        0o600
    );
    return { path, fd };
}

function appendAudit(audit, value) {
    const line = Buffer.from(`${JSON.stringify(value)}\n`);
    let offset = 0;
    while (offset < line.length) {
        const written = writeSync(audit.fd, line, offset, line.length - offset);
        if (written <= 0) fail('écriture incomplète du journal LLM');
        offset += written;
    }
    fsyncSync(audit.fd);
}

function verificationResult(verify) {
    let result;
    try {
        result = verify();
    } catch (error) {
        return { ok: false, failures: [error.message] };
    }
    if (
        !exactKeys(result, ['ok', 'failures']) ||
        typeof result.ok !== 'boolean' ||
        !Array.isArray(result.failures) ||
        result.failures.some((entry) => typeof entry !== 'string')
    ) {
        fail('le vérificateur a renvoyé un résultat invalide');
    }
    return result;
}

export function validateLlmProcessAdapter(adapter) {
    if (!exactKeys(adapter, ['executable', 'argv'])) {
        fail('adaptateur LLM doit être un processus à schéma fermé');
    }
    if (!isAbsolute(adapter.executable)) {
        fail('exécutable adaptateur LLM doit être absolu');
    }
    let stats;
    try {
        stats = lstatSync(adapter.executable);
    } catch (error) {
        fail(
            `exécutable adaptateur LLM inaccessible (${error.code ?? error.message})`
        );
    }
    if (
        stats.isSymbolicLink() ||
        !stats.isFile() ||
        realpathSync(adapter.executable) !== adapter.executable ||
        (stats.mode & 0o111) === 0
    ) {
        fail('exécutable adaptateur LLM non canonique ou non exécutable');
    }
    if (
        !Array.isArray(adapter.argv) ||
        adapter.argv.length > 32 ||
        adapter.argv.some(
            (argument) =>
                typeof argument !== 'string' ||
                argument.length > 4096 ||
                argument.includes('\0')
        )
    ) {
        fail('argv adaptateur LLM invalide');
    }
    return adapter;
}

function killProcessTree(child) {
    if (!child.pid) return;
    try {
        if (process.platform === 'win32') child.kill('SIGKILL');
        else process.kill(-child.pid, 'SIGKILL');
    } catch (error) {
        if (error.code === 'ESRCH') return;
        try {
            if (!child.kill('SIGKILL')) {
                return new Error(
                    `arrêt forcé impossible (${error.code ?? error.message}; signal non délivré)`
                );
            }
        } catch (fallbackError) {
            if (fallbackError.code !== 'ESRCH') {
                return new Error(
                    `arrêt forcé impossible (${error.code ?? error.message}; ${fallbackError.code ?? fallbackError.message})`
                );
            }
        }
    }
}

function parseAdapterResponse(chunks) {
    let text;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(
            Buffer.concat(chunks)
        );
    } catch {
        throw new Error('sortie adaptateur LLM non UTF-8');
    }
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        throw new Error(
            `sortie JSON adaptateur LLM invalide : ${error.message}`,
            { cause: error }
        );
    }
    const scopes = [];
    let duplicate;
    visitJsonc(text, {
        onObjectBegin: () => scopes.push(new Set()),
        onObjectProperty: (key) => {
            const scope = scopes.at(-1);
            if (scope.has(key)) duplicate ??= key;
            else scope.add(key);
        },
        onObjectEnd: () => scopes.pop(),
    });
    if (duplicate !== undefined) {
        throw new Error(
            `sortie JSON adaptateur LLM ambiguë : clé dupliquée ${JSON.stringify(duplicate)}`
        );
    }
    return parsed;
}

async function requestProcess(adapter, request, timeoutMs, maxResponseBytes) {
    const definition = validateLlmProcessAdapter(adapter);
    return new Promise((resolveRequest, rejectRequest) => {
        const child = spawn(definition.executable, definition.argv, {
            cwd: realpathSync('/tmp'),
            detached: process.platform !== 'win32',
            env: {
                LANG: 'C.UTF-8',
                LC_ALL: 'C.UTF-8',
            },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        const stdout = [];
        const stderr = [];
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let forcedError;
        let settled = false;
        const force = (error) => {
            if (forcedError) return;
            forcedError = error;
            const killError = killProcessTree(child);
            if (killError) {
                forcedError = new AggregateError(
                    [error, killError],
                    `${error.message}; ${killError.message}`
                );
            }
        };
        const timer = setTimeout(
            () =>
                force(
                    new Error(`adaptateur LLM timeout après ${timeoutMs} ms`)
                ),
            timeoutMs
        );
        child.stdout.on('data', (chunk) => {
            stdoutBytes += chunk.length;
            if (stdoutBytes > maxResponseBytes) {
                force(
                    new Error(
                        `réponse adaptateur au-delà de ${maxResponseBytes} octets`
                    )
                );
                return;
            }
            stdout.push(chunk);
        });
        child.stderr.on('data', (chunk) => {
            stderrBytes += chunk.length;
            if (stderrBytes <= 65536) stderr.push(chunk);
            else
                force(
                    new Error('stderr adaptateur LLM au-delà de 65536 octets')
                );
        });
        child.on('error', (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            rejectRequest(error);
        });
        child.on('close', (code, signal) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (forcedError) {
                rejectRequest(forcedError);
                return;
            }
            if (code !== 0) {
                const stderrBuffer = Buffer.concat(stderr);
                rejectRequest(
                    new Error(
                        `adaptateur LLM terminé avec code ${code ?? 'null'} signal ${signal ?? 'null'} ; stderr=${stderrBytes} octets sha256=${sha256(stderrBuffer)}`
                    )
                );
                return;
            }
            try {
                resolveRequest(parseAdapterResponse(stdout));
            } catch (error) {
                rejectRequest(error);
            }
        });
        child.stdin.on('error', (error) => force(error));
        child.stdin.end(JSON.stringify(request));
    });
}

export async function executeBoundedLlm({
    repository,
    candidate,
    recipe,
    app,
    installedLibraries = [],
    adapter,
    verify,
}) {
    if (recipe.install.method !== 'llm-then-verified') {
        fail('méthode de recette différente de llm-then-verified');
    }
    validateLlmProcessAdapter(adapter);
    if (typeof verify !== 'function') fail('vérificateur de candidat absent');
    const audit = ensureAudit(repository, candidate.id);
    try {
        const beforeAll = snapshotFilesystem(candidate.workspace, {
            excludedDirectories: ['node_modules'],
        });
        let staticFailures = invariantFailures(
            candidate.workspace,
            app,
            recipe,
            installedLibraries
        );
        let verification =
            staticFailures.length === 0
                ? verificationResult(verify)
                : { ok: false, failures: staticFailures };
        if (verification.ok) {
            appendAudit(audit, {
                schema_version: '1.0.0',
                event: 'already-satisfied',
            });
        }
        for (
            let iteration = 1;
            !verification.ok && iteration <= recipe.install.max_iterations;
            iteration += 1
        ) {
            const request = {
                schema_version: '1.0.0',
                prompt_contract: recipe.install.prompt_contract,
                app,
                library: recipe.library,
                platform: recipe.platform,
                iteration,
                max_iterations: recipe.install.max_iterations,
                allowed_paths: [...recipe.install.llm_write_paths],
                failures: [...verification.failures],
                files: currentFiles(
                    candidate.workspace,
                    app,
                    recipe.install.llm_write_paths
                ),
            };
            const requestBytes = Buffer.byteLength(JSON.stringify(request));
            if (requestBytes > recipe.install.max_context_bytes) {
                fail(
                    `contexte de ${requestBytes} octets au-delà de ${recipe.install.max_context_bytes}`
                );
            }
            const before = snapshotFilesystem(candidate.workspace, {
                excludedDirectories: ['node_modules'],
            });
            appendAudit(audit, {
                schema_version: '1.0.0',
                event: 'request',
                request,
            });
            let response;
            try {
                response = await requestProcess(
                    adapter,
                    request,
                    recipe.install.iteration_timeout_ms,
                    recipe.install.max_response_bytes
                );
            } catch (error) {
                appendAudit(audit, {
                    schema_version: '1.0.0',
                    event: 'adapter-error',
                    iteration,
                    error: error.message,
                });
                throw error;
            }
            const validated = validateResponse(
                response,
                recipe,
                candidate.workspace,
                app
            );
            applyResponse(validated, candidate.workspace, app);
            const after = snapshotFilesystem(candidate.workspace, {
                excludedDirectories: ['node_modules'],
            });
            const changeSet = buildLibraryChangeSet(before, after);
            const allowedAbsolute = new Set(
                recipe.install.llm_write_paths.map(
                    (path) => `apps/${app}/${path}`
                )
            );
            if (
                changeSet.changes.some(
                    ({ op, path, mode }) =>
                        !allowedAbsolute.has(path) ||
                        !['create', 'modify'].includes(op) ||
                        mode !== '100644'
                )
            ) {
                fail('diff réel hors allowlist après itération');
            }
            const previousStaticCount = staticFailures.length;
            const previousFailureSignature = JSON.stringify(
                verification.failures
            );
            staticFailures = invariantFailures(
                candidate.workspace,
                app,
                recipe,
                installedLibraries
            );
            const beforeVerification = snapshotFilesystem(candidate.workspace, {
                excludedDirectories: ['node_modules'],
            });
            verification =
                staticFailures.length === 0
                    ? verificationResult(verify)
                    : { ok: false, failures: staticFailures };
            const afterVerification = snapshotFilesystem(candidate.workspace, {
                excludedDirectories: ['node_modules'],
            });
            if (
                snapshotSha256(beforeVerification) !==
                snapshotSha256(afterVerification)
            ) {
                fail('le vérificateur a muté les artefacts gouvernés');
            }
            const progressed =
                verification.ok ||
                staticFailures.length < previousStaticCount ||
                (staticFailures.length === 0 &&
                    JSON.stringify(verification.failures) !==
                        previousFailureSignature);
            appendAudit(audit, {
                schema_version: '1.0.0',
                event: 'result',
                iteration,
                response,
                change_set: changeSet,
                verification,
                progressed,
            });
            if (!progressed) fail(`itération ${iteration} sans progrès`);
        }
        if (!verification.ok) {
            fail(
                `${recipe.install.max_iterations} itérations épuisées : ${verification.failures.join('; ')}`
            );
        }
        const afterAll = snapshotFilesystem(candidate.workspace, {
            excludedDirectories: ['node_modules'],
        });
        return {
            changeSet: buildLibraryChangeSet(beforeAll, afterAll),
            auditPath: audit.path,
            auditSha256: sha256(readFileSync(audit.path)),
        };
    } catch (error) {
        error.message = `${error.message} (journal: ${relative(repository, audit.path)})`;
        throw error;
    } finally {
        closeSync(audit.fd);
    }
}
