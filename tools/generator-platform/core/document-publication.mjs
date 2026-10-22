import { createHash } from 'node:crypto';
import { link, lstat, open, readFile, unlink } from 'node:fs/promises';

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function entryExists(path) {
    try {
        await lstat(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function syncDirectory(path) {
    const handle = await open(path, 'r');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

async function assertContent(path, expectedHash, label, fail) {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        fail(`${label} is not a regular file`);
    }
    if (sha256(await readFile(path)) !== expectedHash) {
        fail(`${label} hash does not match the reviewed plan`);
    }
}

export async function publishDocument(plan, fail) {
    const outputExists = await entryExists(plan.outputAbsolute);
    const candidateExists = await entryExists(plan.candidate);
    if (outputExists) {
        await assertContent(
            plan.outputAbsolute,
            plan.output_sha256,
            'existing output',
            fail
        );
        if (candidateExists) {
            await assertContent(
                plan.candidate,
                plan.output_sha256,
                'recovery candidate',
                fail
            );
            await unlink(plan.candidate);
            await syncDirectory(plan.outputParent);
        }
        return { plan, already_published: true };
    }

    if (candidateExists) {
        await assertContent(
            plan.candidate,
            plan.output_sha256,
            'recovery candidate',
            fail
        );
    } else {
        const handle = await open(plan.candidate, 'wx', 0o644);
        try {
            await handle.writeFile(plan.content);
            await handle.sync();
        } finally {
            await handle.close();
        }
        await syncDirectory(plan.outputParent);
    }

    try {
        await link(plan.candidate, plan.outputAbsolute);
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        await assertContent(
            plan.outputAbsolute,
            plan.output_sha256,
            'concurrent output',
            fail
        );
    }
    await syncDirectory(plan.outputParent);
    await assertContent(
        plan.outputAbsolute,
        plan.output_sha256,
        'published output',
        fail
    );
    await unlink(plan.candidate);
    await syncDirectory(plan.outputParent);
    return { plan, already_published: false };
}
