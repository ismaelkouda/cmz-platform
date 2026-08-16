const facts = [
    [
        'login.operation',
        'operation',
        'Login is exposed as a public unauthenticated HTTP POST operation at login.',
    ],
    ['login.input', 'data_shape', 'Login accepts email and password values.'],
    [
        'login.constraints',
        'constraint',
        'Login requires email and password, and email must match the declared email format.',
    ],
    [
        'login.output',
        'data_shape',
        'Login returns a user, an authentication token, and an optional message.',
    ],
    [
        'login.session-effect',
        'effect',
        'A successful login persists the returned user and token before reporting success.',
    ],
    [
        'forgot-password.operation',
        'operation',
        'Forgot password is exposed as a public unauthenticated HTTP POST operation at forgot-password.',
    ],
    [
        'forgot-password.input',
        'data_shape',
        'Forgot password accepts a required email value with the declared email format.',
    ],
    [
        'forgot-password.output',
        'data_shape',
        'Forgot password returns a required message.',
    ],
    [
        'reset-password.operation',
        'operation',
        'Reset password is exposed as a public unauthenticated HTTP POST operation at reset-password.',
    ],
    [
        'reset-password.input',
        'data_shape',
        'Reset password accepts token, email, password, and password confirmation values.',
    ],
    [
        'reset-password.constraints',
        'constraint',
        'Reset password requires every input, validates email format, and requires password confirmation to equal password.',
    ],
    [
        'reset-password.output',
        'data_shape',
        'Reset password returns a required message.',
    ],
];

const legacyFactSources = {
    'login.operation': ['source.login-api', 'source.authentication-endpoints'],
    'login.input': ['source.login-contract'],
    'login.constraints': ['source.login-validator'],
    'login.output': ['source.login-props'],
    'login.session-effect': ['source.login-facade'],
    'forgot-password.operation': [
        'source.forgot-password-api',
        'source.authentication-endpoints',
    ],
    'forgot-password.input': [
        'source.forgot-password-contract',
        'source.forgot-password-validator',
    ],
    'forgot-password.output': ['source.forgot-password-props'],
    'reset-password.operation': [
        'source.reset-password-api',
        'source.authentication-endpoints',
    ],
    'reset-password.input': ['source.reset-password-contract'],
    'reset-password.constraints': ['source.reset-password-validator'],
    'reset-password.output': ['source.reset-password-props'],
};

export function buildEvidenceModel({ adapter, sources, policySource }) {
    const structured = adapter === 'structured-spec';
    const evidenceRefs = (factId) =>
        structured ? ['source.structured-spec'] : legacyFactSources[factId];
    const unknownAuthorityRefs = structured
        ? ['source.structured-spec']
        : [
              'source.login-api',
              'source.forgot-password-api',
              'source.reset-password-api',
          ];

    return {
        schema_version: '1.0.0',
        model_id: `authentication-action-request-${adapter}-evidence`,
        sources: [...sources, policySource],
        facts: facts.map(([id, category, statement]) => ({
            id: `fact.${id}`,
            category,
            statement,
            evidence_refs: evidenceRefs(id),
            confidence: 1,
            status: 'observed',
        })),
        unknowns: [
            {
                id: 'unknown.backend-contract-authority',
                question:
                    'Does a versioned backend or OpenAPI contract independently confirm these client-observed operations?',
                impact: 'Without an independent contract, the slice can prove extraction consistency but cannot claim M4 cross-source conformance.',
                blocking: false,
                evidence_refs: unknownAuthorityRefs,
            },
            {
                id: 'unknown.error-contract',
                question:
                    'Which transport errors, status codes, and domain failures form the canonical error contract?',
                impact: 'Target generators cannot yet emit portable typed failure handling.',
                blocking: false,
                evidence_refs: [],
            },
            {
                id: 'unknown.runtime-base-url',
                question:
                    'Which environment-owned base URL resolves the relative HTTP paths?',
                impact: 'The base URL remains deployment configuration and must not leak into the canonical semantic model.',
                blocking: false,
                evidence_refs: [],
            },
        ],
        decisions: [
            {
                id: 'decision.command-classification',
                statement:
                    'Classify the three operations as commands rather than generic custom actions.',
                rationale:
                    'Each operation changes external authentication state or initiates a state-changing recovery process.',
                evidence_refs: [
                    'source.semantic-policy',
                    'fact.login.operation',
                    'fact.forgot-password.operation',
                    'fact.reset-password.operation',
                ],
            },
            {
                id: 'decision.opaque-authentication-values',
                statement:
                    'Keep user and authentication-token internals opaque in this first action-request slice.',
                rationale:
                    'The slice validates the command boundary; expanding shared identity internals would enlarge it without testing the Evidence-to-Semantic seam.',
                evidence_refs: ['source.semantic-policy', 'fact.login.output'],
            },
        ],
    };
}
