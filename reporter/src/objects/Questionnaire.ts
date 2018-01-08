import { Question } from './Question';

export interface Questionnaire {
    name: string;
    questions: Question[];
    answers: any;
}