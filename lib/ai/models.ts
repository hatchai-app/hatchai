// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: 'grok-2',
    label: 'HatchAI Light',
    apiIdentifier: 'grok-2',
    description: 'Small model for fast, lightweight tasks',
  },
  {
    id: 'grok-beta',
    label: 'HatchAI Beta',
    apiIdentifier: 'grok-beta',
    description: 'For complex, multi-step tasks',
  },
  {
    id: 'grok-2-vision-1212',
    label: 'HatchAI Vision',
    apiIdentifier: 'grok-2-vision-1212',
    description: 'Work with images. Allowed: *.jpg and *.png',
  },
] as const;

export const DEFAULT_MODEL_NAME: string = 'grok-2';
