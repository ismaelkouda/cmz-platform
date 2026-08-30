import { createHash } from 'node:crypto';

export function decodeFile(buffer) {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe)
        return buffer.subarray(2).toString('utf16le');
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        const swapped = Buffer.from(buffer.subarray(2));
        swapBytes(swapped);
        return swapped.toString('utf16le');
    }
    if (buffer.length >= 8) {
        let evenNulls = 0;
        let oddNulls = 0;
        for (let i = 0; i < buffer.length; i += 1) {
            if (buffer[i] !== 0) continue;
            if (i % 2 === 0) evenNulls += 1;
            else oddNulls += 1;
        }
        if (oddNulls > buffer.length / 4) return buffer.toString('utf16le');
        if (evenNulls > buffer.length / 4) {
            const swapped = Buffer.from(buffer);
            swapBytes(swapped);
            return swapped.toString('utf16le');
        }
    }
    return buffer.toString('utf8');
}

function swapBytes(buffer) {
    for (let i = 0; i + 1 < buffer.length; i += 2) {
        const byte = buffer[i];
        buffer[i] = buffer[i + 1];
        buffer[i + 1] = byte;
    }
}

export function buildPatterns(moduleName) {
    const words = moduleName.split('-');
    const capitalize = (word) => `${word[0].toUpperCase()}${word.slice(1)}`;
    const pascalCase = words.map(capitalize).join('');
    const camelCase = `${words[0]}${words.slice(1).map(capitalize).join('')}`;
    const separatorForms = [moduleName, words.join('_')]
        .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    return [
        {
            type: 'separator',
            regex: new RegExp(
                `(?<![a-z0-9])(?:${separatorForms})(?![a-z0-9])`,
                'i'
            ),
        },
        {
            type: 'camel',
            regex: new RegExp(`(?<![a-z0-9])${camelCase}(?=$|[^a-z0-9]|[A-Z])`),
        },
        {
            type: 'pascal',
            regex: new RegExp(`${pascalCase}(?=$|[^a-z0-9]|[A-Z])`),
        },
    ];
}

export function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function findMatches(patterns, value, shadowPatterns = []) {
    const matches = [];
    const positions = new Set();
    const shadows = [];
    for (const pattern of shadowPatterns) {
        const flags = pattern.regex.flags.includes('g')
            ? pattern.regex.flags
            : `${pattern.regex.flags}g`;
        for (const match of value.matchAll(
            new RegExp(pattern.regex.source, flags)
        ))
            shadows.push({ index: match.index, length: match[0].length });
    }
    for (const pattern of patterns) {
        const flags = pattern.regex.flags.includes('g')
            ? pattern.regex.flags
            : `${pattern.regex.flags}g`;
        for (const match of value.matchAll(
            new RegExp(pattern.regex.source, flags)
        )) {
            if (
                shadows.some(
                    (shadow) =>
                        shadow.index === match.index &&
                        shadow.length > match[0].length
                )
            )
                continue;
            const key = `${match.index}:${match[0].length}`;
            if (positions.has(key)) continue;
            positions.add(key);
            matches.push({
                pattern: pattern.type,
                match: match[0],
                index: match.index,
            });
        }
    }
    return matches.sort(
        (a, b) => a.index - b.index || (a.match < b.match ? -1 : 1)
    );
}

export function occurrenceKey(occurrence, includeContextOccurrence = true) {
    const fields = [
        occurrence.file,
        occurrence.location,
        occurrence.pattern,
        occurrence.match,
        occurrence.logicalLineSha256,
        occurrence.contextSha256,
        occurrence.occurrence,
    ];
    if (includeContextOccurrence) fields.push(occurrence.contextOccurrence);
    return fields.join('\0');
}

export function occurrenceApprovalId(occurrence) {
    return sha256(occurrenceKey(occurrence));
}

export function collectOccurrences(entry, patterns, shadowPatterns, content) {
    const occurrences = [];
    for (const [occurrence, match] of findMatches(
        patterns,
        entry.relativePath,
        shadowPatterns
    ).entries()) {
        occurrences.push({
            file: entry.relativePath,
            location: 'path',
            pattern: match.pattern,
            match: match.match,
            logicalLineSha256: sha256(entry.relativePath),
            contextSha256: sha256(`path\0${entry.relativePath}`),
            occurrence,
            lineHint: null,
            columnHint: match.index + 1,
        });
    }

    const lines = content.split('\n');
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const context = [
            lines[lineIndex - 1]?.trim() || '',
            line.trim(),
            lines[lineIndex + 1]?.trim() || '',
        ].join('\0');
        for (const [occurrence, match] of findMatches(
            patterns,
            line,
            shadowPatterns
        ).entries()) {
            occurrences.push({
                file: entry.relativePath,
                location:
                    entry.kind === 'symlink' ? 'symlink-target' : 'content',
                pattern: match.pattern,
                match: match.match,
                logicalLineSha256: sha256(line.trim()),
                contextSha256: sha256(context),
                occurrence,
                lineHint: lineIndex + 1,
                columnHint: match.index + 1,
            });
        }
    }

    const seen = new Map();
    return occurrences.map((item) => {
        const baseKey = occurrenceKey(item, false);
        const contextOccurrence = seen.get(baseKey) || 0;
        seen.set(baseKey, contextOccurrence + 1);
        return { ...item, contextOccurrence };
    });
}

export function safeExcerpt(value) {
    return JSON.stringify(value.trim().slice(0, 160)).slice(1, -1);
}
