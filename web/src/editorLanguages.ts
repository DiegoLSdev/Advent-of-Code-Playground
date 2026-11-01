import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import type { Extension } from '@codemirror/state';

/** Syntax highlighting for each language in shared/languages.ts. */
export const editorLanguages: Record<string, () => Extension> = {
  javascript: () => javascript(),
  python: () => python(),
};
