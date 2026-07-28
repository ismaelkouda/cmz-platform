import { LocationMethod } from '../enums/location-method.enum';

export class LocationMethodVO {
    private constructor(private readonly value: LocationMethod) {}

    static readonly auto = new LocationMethodVO(LocationMethod.AUTO);
    static readonly manual = new LocationMethodVO(LocationMethod.MANUAL);

    static fromEnum(method: LocationMethod): LocationMethodVO {
        switch (method) {
            case LocationMethod.AUTO:
                return LocationMethodVO.auto;
            case LocationMethod.MANUAL:
                return LocationMethodVO.manual;
        }
    }

    isAuto(): boolean {
        return this.value === LocationMethod.AUTO;
    }

    isManual(): boolean {
        return this.value === LocationMethod.MANUAL;
    }

    toEnum(): LocationMethod {
        return this.value;
    }

    toString(): string {
        return this.value;
    }

    equals(other: LocationMethodVO): boolean {
        return this.value === other.value;
    }
}
