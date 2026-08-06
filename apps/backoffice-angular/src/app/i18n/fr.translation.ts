/** Bundle de traduction FR (dev) — packs ≤800 l. */
import { FR_PACK_1 } from './fr/fr-pack-01';
import { FR_PACK_2 } from './fr/fr-pack-02';
import { FR_PACK_3 } from './fr/fr-pack-03';
import { FR_PACK_4 } from './fr/fr-pack-04';
import { FR_PACK_5 } from './fr/fr-pack-05';

export const FR = {
    ...FR_PACK_1,
    ...FR_PACK_2,
    ...FR_PACK_3,
    ...FR_PACK_4,
    ...FR_PACK_5,
} as const;
