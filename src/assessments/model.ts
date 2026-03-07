export type AssessmentType = 'phq9' | 'gad7' | 'cantril';

export type AssessmentResult = {
  id: string;
  type: AssessmentType;
  score: number;
  maxScore: number;
  answers: number[];
  createdAt: string;
};

export type AssessmentQuestion = {
  id: string;
  text: string;
};

export const PHQ9_QUESTIONS: AssessmentQuestion[] = [
  { id: 'phq9_1', text: 'Little interest or pleasure in doing things' },
  { id: 'phq9_2', text: 'Feeling down, depressed, or hopeless' },
  { id: 'phq9_3', text: 'Trouble falling or staying asleep, or sleeping too much' },
  { id: 'phq9_4', text: 'Feeling tired or having little energy' },
  { id: 'phq9_5', text: 'Poor appetite or overeating' },
  { id: 'phq9_6', text: 'Feeling bad about yourself, or that you are a failure' },
  { id: 'phq9_7', text: 'Trouble concentrating on things' },
  { id: 'phq9_8', text: 'Moving or speaking slowly, or being fidgety/restless' },
  { id: 'phq9_9', text: 'Thoughts that you would be better off dead or self-harm' },
];

export const GAD7_QUESTIONS: AssessmentQuestion[] = [
  { id: 'gad7_1', text: 'Feeling nervous, anxious, or on edge' },
  { id: 'gad7_2', text: 'Not being able to stop or control worrying' },
  { id: 'gad7_3', text: 'Worrying too much about different things' },
  { id: 'gad7_4', text: 'Trouble relaxing' },
  { id: 'gad7_5', text: 'Being so restless that it is hard to sit still' },
  { id: 'gad7_6', text: 'Becoming easily annoyed or irritable' },
  { id: 'gad7_7', text: 'Feeling afraid as if something awful might happen' },
];

export const CANTRIL_QUESTION: AssessmentQuestion = {
  id: 'cantril_1',
  text: 'Imagine a ladder from 0 to 10 where 10 is your best possible life. Where are you today?',
};

export const PHQ_GAD_OPTIONS = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
] as const;

export function getAssessmentTitle(type: AssessmentType) {
  if (type === 'phq9') return 'PHQ-9';
  if (type === 'gad7') return 'GAD-7';
  return 'Cantril Ladder';
}

export function getAssessmentQuestions(type: AssessmentType): AssessmentQuestion[] {
  if (type === 'phq9') return PHQ9_QUESTIONS;
  if (type === 'gad7') return GAD7_QUESTIONS;
  return [CANTRIL_QUESTION];
}

export function getAssessmentMaxScore(type: AssessmentType) {
  if (type === 'phq9') return 27;
  if (type === 'gad7') return 21;
  return 10;
}

export function getAssessmentPrompt(type: AssessmentType) {
  if (type === 'phq9' || type === 'gad7') {
    return 'Over the last 2 weeks, how often have you been bothered by the following problems?';
  }
  return 'Imagine a ladder from 0 to 10 where 10 is your best possible life and 0 is your worst possible life.';
}

export function getAssessmentPurpose(type: AssessmentType) {
  if (type === 'phq9') return 'Tracks low mood and depression-related symptoms over time.';
  if (type === 'gad7') return 'Tracks anxiety symptoms and worry load over time.';
  return 'Gives a quick snapshot of overall life evaluation today.';
}

export function scoreBand(type: AssessmentType, score: number) {
  if (type === 'phq9') {
    if (score >= 20) return 'Severe';
    if (score >= 15) return 'Moderately severe';
    if (score >= 10) return 'Moderate';
    if (score >= 5) return 'Mild';
    return 'Minimal';
  }
  if (type === 'gad7') {
    if (score >= 15) return 'Severe';
    if (score >= 10) return 'Moderate';
    if (score >= 5) return 'Mild';
    return 'Minimal';
  }
  if (score >= 8) return 'Thriving';
  if (score >= 5) return 'Stable';
  return 'Strained';
}
