/** B309: the upstream CI attempt that triggered the alignment workflow. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export const STEPS = [
    'Bundle production — budgets + baseline Linux',
    'Bundle metrics — freshness',
    'Bundle metrics — prepare data-only proposal',
    'Bundle metrics — upload data-only proposal',
];
const invariant = (ok) => assert.ok(ok, 'B309_REFUSED');
const equal = (a, b) => assert.deepEqual(a, b, 'B309_REFUSED');
const id = (v) => invariant(Number.isSafeInteger(v) && v > 0);
export function jobOf(jobs) {
    equal(jobs.total_count, jobs.jobs.length);
    const matches = jobs.jobs.filter(
        (j) => j.name === 'Oracle — lint + build + ngc + test'
    );
    equal(matches.length, 1);
    return matches[0];
}
export function upstream() {
    equal(process.env.GITHUB_EVENT_NAME, 'workflow_run');
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH));
    const source = event.workflow_run;
    invariant(
        source &&
            source.name === 'CI' &&
            source.event === 'pull_request' &&
            source.status === 'completed'
    );
    return source;
}
// Not applicable only on positive proof, read on the triggering attempt: the
// Oracle job or the producer step was skipped. A missing artifact never
// decides; every other shape keeps the strict chain of prepare().
export function applicable(client, source) {
    id(source.id);
    id(source.run_attempt);
    const job = jobOf(
        client.json(
            `repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${source.id}/attempts/${source.run_attempt}/jobs?per_page=100`
        )
    );
    equal(job.status, 'completed');
    if (job.conclusion === 'skipped') {
        equal(job.steps, []);
        return false;
    }
    const producer = job.steps.filter((s) => s.name === STEPS[2]);
    equal(producer.length, 1);
    equal(producer[0].status, 'completed');
    return producer[0].conclusion !== 'skipped';
}
