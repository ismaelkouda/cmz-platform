import { HttpContextToken } from '@angular/common/http';

export const BYPASS_CACHE = new HttpContextToken<boolean>(() => false);
