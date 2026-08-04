import { now } from './ids.mjs';

export const REQUESTS_LIST_POOL_SIZE = 1548;

export function buildRequestsListItems(count = REQUESTS_LIST_POOL_SIZE) {
    return Array.from({ length: count }, (_, i) => ({
        uniq_id: `REQ-${String(i + 1).padStart(4, '0')}`,
        report_type: i % 2 === 0 ? 'abi' : 'zob',
        operators:
            i % 3 === 0 ? ['mtn', 'orange'] : i % 2 === 0 ? ['mtn'] : ['moov'],
        source: i % 2 === 0 ? 'sms' : 'app',
        initiator_phone_number: `690000${String(i).padStart(4, '0')}`,
        reported_at: now(),
        updated_at: now(),
    }));
}

export function filterRequestsListItems(items, searchParams) {
    let result = items;
    const uniqId = searchParams.get('uniq_id')?.trim();
    if (uniqId) {
        result = result.filter((item) =>
            item.uniq_id.toLowerCase().includes(uniqId.toLowerCase())
        );
    }
    const phone = searchParams.get('initiator_phone_number')?.trim();
    if (phone) {
        result = result.filter((item) =>
            item.initiator_phone_number.includes(phone)
        );
    }
    const reportType = searchParams.get('report_type');
    if (reportType) {
        result = result.filter((item) => item.report_type === reportType);
    }
    const source = searchParams.get('source');
    if (source) {
        result = result.filter((item) => item.source === source);
    }
    const operators = searchParams.get('operators');
    if (operators) {
        const ops = operators.split(',').map((op) => op.trim());
        result = result.filter((item) =>
            ops.some((op) => item.operators.includes(op))
        );
    }
    return result;
}
