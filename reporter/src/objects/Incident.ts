export interface Incident {
    id: number;
    description: string;
    incidentDate: string;
    buildingName: string;
    stateCode: string;
    zipCode: string;
    severity: string;
    reporterUserId: number;
    type: string;
}