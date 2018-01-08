import { Question } from './Question';

export interface Questionnaire {
    name: string;
    questions: Question[];
    completedDate: Date;
    completedBy: string;
}