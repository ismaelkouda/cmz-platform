#!/usr/bin/env node
// DOCKER-314: sources de runtime et substitutions de données, jamais de code PR.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import semver from 'semver';
import { parse } from 'yaml';
import { runtimeWorkflowErrors } from './runtime-version-workflow.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_PATHS = ['Dockerfile', 'package.json', '.nvmrc'];
const FIELDS = ['bunSource', 'bunImage', 'nodeSource', 'nodeImage'];
const FIELD_PATH = {
    bunSource: 'package.json',
    bunImage: 'Dockerfile',
    nodeSource: '.nvmrc',
    nodeImage: 'Dockerfile',
};
export const stable = (v) =>
    typeof v === 'string' &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v) &&
    semver.valid(v) === v;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = (message) => {
    throw new Error('runtime-policy: ' + message);
};

function one(text, regex, label) {
    const matches = [...text.matchAll(regex)];
    if (matches.length !== 1)
        fail(label + ': une seule déclaration exacte attendue');
    return matches[0];
}

export function versions(files) {
    const pkg = JSON.parse(files['package.json']);
    const pm = one(
        files['package.json'],
        /"packageManager"\s*:\s*"([^"]*)"/g,
        'packageManager'
    )[1];
    if (
        typeof pm !== 'string' ||
        !pm.startsWith('bun@') ||
        !stable(pm.slice(4)) ||
        pkg.packageManager !== pm
    )
        fail('packageManager non exact');
    const nvm = files['.nvmrc'];
    if (
        typeof nvm !== 'string' ||
        !/^[^\r\n]+\n?$/.test(nvm) ||
        !stable(nvm.replace(/\n$/, ''))
    )
        fail('.nvmrc non exact');
    const image = (name, suffix) => {
        const all = new RegExp(
            '^\\s*FROM\\s+(?:--platform=\\S+\\s+)?' +
                name.replace('/', '\\/') +
                '(?=[:@\\s]|$)',
            'gmi'
        );
        one(files.Dockerfile, all, 'FROM ' + name);
        const match = one(
            files.Dockerfile,
            new RegExp(
                '^FROM ' +
                    name.replace('/', '\\/') +
                    ':([^\\s]+) AS [a-zA-Z0-9_-]+$',
                'gm'
            ),
            'FROM ' + name
        );
        if (!match[1].endsWith(suffix))
            fail('variante image non relue: ' + name);
        const v = match[1].slice(0, -suffix.length);
        if (!stable(v)) fail('tag image non exact: ' + name);
        return v;
    };
    return {
        bunSource: pm.slice(4),
        bunImage: image('oven/bun', '-debian'),
        nodeSource: nvm.replace(/\n$/, ''),
        nodeImage: image('node', '-bookworm-slim'),
        nodeRange: pkg.engines?.node,
    };
}

export function nodeCompatible(version, range) {
    return (
        stable(version) &&
        typeof range === 'string' &&
        range.trim() !== '' &&
        semver.validRange(range) !== null &&
        semver.satisfies(version, range)
    );
}

export function sourceErrors(files) {
    try {
        const v = versions(files);
        return [
            ...(v.bunSource === v.bunImage
                ? []
                : ['Bun: source et image divergent']),
            ...(v.nodeSource === v.nodeImage
                ? []
                : ['Node: source et image divergent']),
            ...(nodeCompatible(v.nodeSource, v.nodeRange)
                ? []
                : ['Node: cible hors engines.node ou plage invalide']),
        ];
    } catch (error) {
        return [error.message];
    }
}

function replaceField(files, field, target) {
    const next = { ...files };
    const path = FIELD_PATH[field];
    if (field === 'nodeSource')
        next[path] = target + (files[path].endsWith('\n') ? '\n' : '');
    else if (field === 'bunSource')
        next[path] = files[path].replace(
            /("packageManager"\s*:\s*"bun@)([^"]*)(")/g,
            (_, before, _old, after) => before + target + after
        );
    else {
        const name = field === 'bunImage' ? 'oven/bun' : 'node';
        const suffix = field === 'bunImage' ? '-debian' : '-bookworm-slim';
        next[path] = files[path].replace(
            new RegExp(
                '^(FROM ' + name + ':)([^\\s]+)( AS [a-zA-Z0-9_-]+)$',
                'gm'
            ),
            (_, before, _old, after) => before + target + suffix + after
        );
    }
    return next;
}

export function identityOf(pr, repo, mainSha) {
    const id = {
        repo,
        mainSha,
        number: pr.number,
        state: pr.state,
        mergeable: pr.mergeable,
        author: pr.user?.login,
        headRepo: pr.head?.repo?.full_name,
        baseRepo: pr.base?.repo?.full_name,
        baseRef: pr.base?.ref,
        baseSha: pr.base?.sha,
        headSha: pr.head?.sha,
        branch: pr.head?.ref,
    };
    validateIdentity(id, repo, mainSha);
    return id;
}

function validateIdentity(id, repo, mainSha) {
    const sha = (v) => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
    if (id.mergeable !== true)
        fail('PR non fusionnable ou fusionnabilité inconnue');
    if (
        !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
        !sha(mainSha) ||
        id.repo !== repo ||
        id.mainSha !== mainSha ||
        !sha(id.baseSha) ||
        id.baseRef !== 'main' ||
        id.baseRepo !== repo ||
        id.headRepo !== repo ||
        !sha(id.headSha) ||
        id.headSha === mainSha ||
        id.author !== 'dependabot[bot]' ||
        id.state !== 'open' ||
        !Number.isSafeInteger(id.number) ||
        id.number < 1 ||
        typeof id.branch !== 'string' ||
        !/^dependabot\/[A-Za-z0-9._/-]+$/.test(id.branch) ||
        id.branch.includes('..') ||
        id.branch.includes('//') ||
        id.branch.endsWith('/') ||
        id.branch.endsWith('.lock')
    )
        fail('PR/auteur/dépôt/base/head/branche non admissibles');
}

function gitRead(repository, args) {
    const result = spawnSync(
        'git',
        ['--no-optional-locks', '-C', repository, ...args],
        {
            encoding: 'utf8',
            timeout: 10000,
            env: {
                PATH: process.env.PATH,
                GIT_CONFIG_GLOBAL: '/dev/null',
                GIT_CONFIG_NOSYSTEM: '1',
                GIT_TERMINAL_PROMPT: '0',
                GIT_NO_REPLACE_OBJECTS: '1',
                GIT_NO_LAZY_FETCH: '1',
            },
        }
    );
    if (result.status !== 0) fail('preuve Git de la base ancêtre refusée');
    return result.stdout;
}

function runtimeProjection(files) {
    versions(files);
    return {
        nvmrc: files['.nvmrc'],
        packageManager: JSON.parse(files['package.json']).packageManager,
        from: files.Dockerfile.split('\n').filter((line) =>
            /^FROM (oven\/bun|node):/.test(line)
        ),
    };
}

function comparisonBase(mainFiles, identity, repository) {
    if (identity.baseSha === identity.mainSha) return mainFiles;
    if (!repository) fail('preuve Git de la base ancêtre absente');
    if (gitRead(repository, ['rev-parse', 'HEAD']).trim() !== identity.mainSha)
        fail('checkout de confiance différent de main');
    gitRead(repository, [
        'merge-base',
        '--is-ancestor',
        identity.baseSha,
        identity.mainSha,
    ]);
    const at = (sha) =>
        Object.fromEntries(
            SOURCE_PATHS.map((path) => [
                path,
                gitRead(repository, ['show', sha + ':' + path]),
            ])
        );
    if (!equal(at(identity.mainSha), mainFiles)) fail('sources main modifiées');
    const base = at(identity.baseSha);
    if (!equal(runtimeProjection(base), runtimeProjection(mainFiles)))
        fail('runtime divergent entre la base et main');
    return base;
}

export function alignmentPlan(
    base,
    candidate,
    identity,
    changedPaths,
    repository
) {
    validateIdentity(identity, identity.repo, identity.mainSha);
    if (sourceErrors(base).length) fail('main doit déjà être aligné');
    if (!equal(Object.keys(candidate).sort(), [...SOURCE_PATHS].sort()))
        fail('périmètre de sources élargi');
    const reference = comparisonBase(base, identity, repository);
    const a = versions(reference),
        b = versions(candidate);
    const changed = FIELDS.filter((field) => a[field] !== b[field]);
    let expected = { ...reference };
    for (const field of changed)
        expected = replaceField(expected, field, b[field]);
    if (!equal(expected, candidate))
        fail('modification hors substitutions de versions');
    const actualPaths = SOURCE_PATHS.filter(
        (path) => reference[path] !== candidate[path]
    ).sort();
    if (
        !Array.isArray(changedPaths) ||
        !equal([...changedPaths].sort(), actualPaths)
    )
        fail('diff fournisseur incohérent');
    if (changed.length === 0) return null;
    const runtimes = [
        ...new Set(
            changed.map((field) => (field.startsWith('bun') ? 'bun' : 'node'))
        ),
    ];
    if (runtimes.length !== 1) fail('deux runtimes modifiés');
    const runtime = runtimes[0];
    const target = b[changed[0]];
    if (runtime === 'node' && !nodeCompatible(target, versions(base).nodeRange))
        fail('Node refusé: cible hors engines.node du main');
    if (changed.length === 2 && sourceErrors(candidate).length === 0)
        return null;
    if (changed.length !== 1) fail('une seule demande de version attendue');
    const peer = runtime + (changed[0].endsWith('Source') ? 'Image' : 'Source');
    const postFiles = replaceField(candidate, peer, target);
    if (sourceErrors(postFiles).length) fail('réparation incohérente');
    return {
        schema: 1,
        identity,
        runtime,
        target,
        changedPaths: actualPaths,
        editPath: FIELD_PATH[peer],
        candidateFiles: candidate,
        postFiles,
    };
}

export function checkPlan(plan, base, repo, mainSha, repository) {
    validateIdentity(plan?.identity ?? {}, repo, mainSha);
    const expected = alignmentPlan(
        base,
        plan.candidateFiles,
        plan.identity,
        plan.changedPaths,
        repository
    );
    if (!expected || !equal(expected, plan)) fail('artefact/plan altéré');
    return expected;
}

export function verifyState(plan, rawPr, currentMain, repo, mainSha) {
    if (
        currentMain !== mainSha ||
        !equal(identityOf(rawPr, repo, mainSha), plan.identity)
    )
        fail('course main/base/head: aucune publication');
}

function readFiles(directory) {
    return Object.fromEntries(
        SOURCE_PATHS.map((path) => [
            path,
            readFileSync(join(directory, path), 'utf8'),
        ])
    );
}
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));

export function repositoryRuntimeErrors(root) {
    const files = readFiles(root);
    const workflows = readdirSync(join(root, '.github/workflows'))
        .filter((name) => /\.ya?ml$/.test(name))
        .map((file) => ({
            file,
            workflow: parse(
                readFileSync(join(root, '.github/workflows', file), 'utf8')
            ),
        }));
    const frozen = /^RUN bun install --frozen-lockfile$/m.test(
        files.Dockerfile
    );
    const runtimeChecks = files.Dockerfile.includes(
        '\nRUN test "$(node --version)" = "v$(cat .nvmrc)" \\\n    && test "$(bun --version)" = "$(node -p \'require("./package.json").packageManager.slice(4)\')"\n'
    );
    return [
        ...sourceErrors(files),
        ...runtimeWorkflowErrors(workflows),
        ...(frozen && runtimeChecks
            ? []
            : ['Dockerfile: verrou figé ou assertions absents']),
    ];
}

function main() {
    const [command, first, second, third, fourth] = process.argv.slice(2);
    const repo = process.env.GITHUB_REPOSITORY;
    const mainSha = process.env.RUNTIME_MAIN_SHA;
    if (command === 'check') {
        const errors = repositoryRuntimeErrors(ROOT);
        if (errors.length) fail(errors.join('\n'));
        console.log(
            'runtime-policy: sources, assertions, image et alignement conformes'
        );
        return;
    }
    const base = readFiles(ROOT);
    if (command === 'propose') {
        const raw = json(join(first, 'pr.json'));
        const files = json(join(first, 'files.json')).map(
            (entry) => entry.filename
        );
        const plan = alignmentPlan(
            base,
            readFiles(join(first, 'candidate')),
            identityOf(raw, repo, mainSha),
            files,
            ROOT
        );
        if (!plan) {
            console.log('changed=false');
            return;
        }
        writeFileSync(second, JSON.stringify(plan, null, 2) + '\n');
        console.log('changed=true');
        return;
    }
    const plan = checkPlan(json(first), base, repo, mainSha, ROOT);
    if (command === 'verify') {
        verifyState(plan, json(second), third, repo, mainSha);
        if (fourth && !equal(readFiles(fourth), plan.candidateFiles))
            fail('blobs Git différents des données fournisseur');
        for (const [key, value] of Object.entries({
            number: plan.identity.number,
            branch: plan.identity.branch,
            head: plan.identity.headSha,
            base: plan.identity.baseSha,
            changed_path: plan.changedPaths[0],
            edit_path: plan.editPath,
            runtime: plan.runtime,
            target: plan.target,
        }))
            console.log(key + '=' + value);
        return;
    }
    if (command === 'apply') {
        if (
            !lstatSync(second).isDirectory() ||
            lstatSync(second).isSymbolicLink()
        )
            fail('répertoire candidat non ordinaire');
        for (const path of SOURCE_PATHS)
            if (
                !lstatSync(join(second, path)).isFile() ||
                lstatSync(join(second, path)).isSymbolicLink()
            )
                fail('source non ordinaire');
        assert.deepEqual(readFiles(second), plan.candidateFiles);
        writeFileSync(
            join(second, plan.editPath),
            plan.postFiles[plan.editPath]
        );
        assert.deepEqual(readFiles(second), plan.postFiles);
        return;
    }
    fail('commande inconnue');
}

if (
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
