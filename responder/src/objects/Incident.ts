export interface Incident {
    incidentType: string;
    incidentDate: Date;
    severity: string;
    description: string;
    buildingName: string;
    stateCode: string;
    zipCode: string;
}