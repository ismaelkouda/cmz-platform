import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { sessionRenderConfiguration } from './core/application-design-session.mjs';
import {
    renderSessionProjection,
    renderAngularApplicationSession,
    SESSION_NATIVE_SOURCES,
} from './renderers/angular-application-session-renderer.mjs';
import {
    createApplicationSessionFixture,
    SESSION_FIXTURE_DOMAINS,
} from './test-support/application-session-fixture.mjs';

const projectionSource = ts.transpileModule(renderSessionProjection(), {
    compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
    },
}).outputText;
const runtime = await import(
    'data:text/javascript;base64,' +
        Buffer.from(projectionSource).toString('base64')
);

for (const domain of SESSION_FIXTURE_DOMAINS) {
    test(`menu : chemins autorisés ∩ routes générées, rôles sans effet : ${domain}`, async (t) => {
        const fixture = await createApplicationSessionFixture({ domain });
        t.after(() => rm(fixture.root, { recursive: true, force: true }));
        const config = sessionRenderConfiguration(
            fixture.design,
            fixture.design.experiences[0]
        );
        const subject = fixture.sessionResult[fixture.names.subject];
        const menu = runtime.sessionMenu(
            subject[fixture.names.menu],
            subject[fixture.names.paths],
            [],
            config
        );
        assert.equal(menu.length, 1);
        assert.deepEqual(
            menu[0].children.map((entry) => entry.path),
            ['/catalogue']
        );
        assert.equal(
            runtime.sessionMenu(
                subject[fixture.names.menu],
                [],
                ['override'],
                config
            ).length,
            0
        );
        assert.deepEqual(
            runtime
                .sessionMenu(
                    subject[fixture.names.menu],
                    subject[fixture.names.paths],
                    ['override'],
                    config
                )[0]
                .children.map((entry) => entry.path),
            ['/catalogue', '/restricted']
        );
        assert.equal(subject.is_admin, true);
        const withUnknownRoute = structuredClone(subject[fixture.names.menu]);
        withUnknownRoute[0][fixture.names.children].push({
            ...withUnknownRoute[0][fixture.names.children][0],
            [fixture.names.path]: '/not-generated',
            [fixture.names.label]: 'Unknown route',
        });
        assert.deepEqual(
            runtime
                .sessionMenu(
                    withUnknownRoute,
                    subject[fixture.names.paths],
                    ['override'],
                    config
                )[0]
                .children.map((entry) => entry.path),
            ['/catalogue', '/restricted']
        );
        const cloned = runtime.snapshot(fixture.sessionResult);
        assert.ok(Object.isFrozen(cloned));
        assert.equal(Object.getPrototypeOf(cloned), null);
        subject.name = 'Changed externally';
        assert.equal(
            runtime.pointer(cloned, '/' + fixture.names.subject + '/name'),
            'Fixture operator'
        );
        const files = await renderAngularApplicationSession({
            design: fixture.design,
            experience: fixture.design.experiences[0],
        });
        for (const [destination, source] of Object.entries(
            SESSION_NATIVE_SOURCES
        ))
            assert.equal(
                files['src/app/session/' + destination],
                await readFile(
                    new URL('../../' + source, import.meta.url),
                    'utf8'
                )
            );
        const all = Object.values(files).join('\n');
        assert.doesNotMatch(
            all,
            /localStorage|sessionStorage|indexedDB|console\.(log|error)/
        );
        assert.match(files['src/app/app.config.ts'], /provideHttpClient/);
        assert.match(
            files['src/app/session/session.interceptor.ts'],
            /SKIP_AUTH/
        );
        assert.match(
            files['public/sw.js'],
            /!STATIC\.includes\(url\.pathname\)/
        );
    });
}

test('RFC6901 exact, limites et aucun getter ou héritage', () => {
    assert.equal(
        runtime.pointer({ 'a/b': { '~key': ['first'] } }, '/a~1b/~0key/0'),
        'first'
    );
    assert.equal(runtime.pointer(['first'], '/00'), undefined);
    assert.equal(runtime.pointer({}, '/toString'), undefined);
    assert.throws(() => runtime.pointer({}, '/~2'));
    let invoked = false;
    const object = {
        get secret() {
            invoked = true;
            return 'SENTINEL_PRIVATE_RESPONSE';
        },
    };
    assert.throws(() => runtime.snapshot(object));
    assert.equal(invoked, false);
    assert.throws(() =>
        runtime.snapshot(Object.create({ inherited: 'private' }))
    );
    assert.throws(() => runtime.snapshot(Array(2)));
    assert.throws(() => runtime.snapshot(Array(2049).fill(null)));
    const cyclic = {};
    cyclic.self = cyclic;
    assert.throws(() => runtime.snapshot(cyclic));
    for (const path of [
        '//host',
        '/%61',
        '/a/../b',
        '/a?x',
        '/a#x',
        'javascript:x',
    ])
        assert.equal(runtime.canonicalPath(path), null);
});
