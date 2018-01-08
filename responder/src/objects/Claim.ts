import { Incident } from './Incident';
import { Questionnaire } from './Questionnaire';
import { Answer } from './Answer';

export interface Claim {
    id: number;
    processId: number;
    incident: Incident;
    questionnaire: Questionnaire;
    answers: Answer[];
    comments: any;
    incidentComments: string[];
    customer: string;
    photos: any;
    approved: boolean;
    statedValue: number;
}