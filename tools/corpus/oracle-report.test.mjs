/**
 * Tests node:test — politique oracle_report (T2-7 / H-5).
 * Run: node --test tools/corpus/oracle-report.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    assertOracleReportShape,
    buildOracleReport,
    checkFromGate,
    partitionPairTargets,
} from './oracle-report.mjs';

describe('oracle-report (H-5 / T2-7)', () => {
    it('partitionPairTargets sépare verified / failed', () => {
        const set = new Set(['@cmz/a-domain:build']);
        const p = partitionPairTargets(
            ['@cmz/a-domain:build', '@cmz/a-domain:test'],
            set
        );
        assert.deepEqual(p.verified, ['@cmz/a-domain:build']);
        assert.deepEqual(p.failed, ['@cmz/a-domain:test']);
    });

    it('checkFromGate mappe pass / fail / skip / not_run', () => {
        const at = '2026-08-06T00:00:00.000Z';
        assert.equal(
            checkFromGate(
                [{ task: 'build', ok: true, detail: 'ok' }],
                'build',
                at
            ).status,
            'pass'
        );
        assert.equal(
            checkFromGate(
                [{ task: 'lint', ok: false, detail: 'err' }],
                'lint',
                at
            ).status,
            'fail'
        );
        assert.equal(
            checkFromGate(
                [
                    {
                        task: 'test',
                        ok: true,
                        skipped: true,
                        detail: 'C-2',
                    },
                ],
                'test',
                at
            ).status,
            'skip'
        );
        assert.equal(checkFromGate([], 'build', at).status, 'not_run');
    });

    it('buildOracleReport : mode + required keys + strict_templates not_run', () => {
        const report = buildOracleReport({
            structuralOnly: true,
            gate: {
                ok: true,
                results: [
                    { task: 'build', ok: true, detail: 'b' },
                    { task: 'lint', ok: true, detail: 'l' },
                    { task: 'test', ok: true, detail: 't' },
                ],
            },
            pairOracle: [
                '@cmz/dashboard-domain:build',
                '@cmz/dashboard-domain:test',
            ],
            verifiedOracles: new Set([
                '@cmz/dashboard-domain:build',
                '@cmz/dashboard-domain:test',
            ]),
            levels: { structural: 1, behavioral: 1, other: 0 },
            ranAt: '2026-08-06T12:00:00.000Z',
        });
        assert.equal(report.mode, 'structural-only');
        assert.equal(report.strict_templates.status, 'not_run');
        assert.equal(report.build.status, 'pass');
        assert.deepEqual(report.build.targets, [
            '@cmz/dashboard-domain:build',
        ]);
        assert.deepEqual(report.test.targets, [
            '@cmz/dashboard-domain:test',
        ]);
        assert.equal(assertOracleReportShape(report).length, 0);
    });

    it('assertOracleReportShape rejette un objet incomplet', () => {
        const errs = assertOracleReportShape({ mode: 'full' });
        assert.ok(errs.length > 0);
    });
});
