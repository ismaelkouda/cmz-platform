import { CoordinatesProps } from '@cmz/shared-domain';

export interface InfrastructureFindOneProps {
    uniqId: string;
    name: string;
    type: string;
    description: string;
    region: string;
    department: string;
    municipality: string;
    position: CoordinatesProps;
    createdAt: string;
    updatedAt: string;
}
