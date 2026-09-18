import { no } from './no';
import { en } from './en';

export const dicts = { no, en } as const;
export type Lang = keyof typeof dicts;

export function getDict(lang: string) {
  return lang === 'en' ? en : no;
}

export const languages: Lang[] = ['no', 'en'];
