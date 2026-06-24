import { createContext } from '@lit/context';

export type View = 'author' | 'candidate' | 'proctor' | 'scorer' | 'testConstructor' | 'tutor' | '';

export interface SessionContext {
  navPartId?: string | null;
  navSectionId?: string | null;
  navItemRefId?: string | null;
  /**
   * Identifier of the qti-test-feedback the candidate has navigated to, or null
   * when an assessment item (not feedback) is on screen. Navigating to feedback
   * clears the active item; navigating to any item/section clears this.
   */
  navFeedbackIdentifier?: string | null;
  navItemLoading?: boolean;
  navTestLoading?: boolean;
  view?: View;
}

export const INITIAL_SESSION_CONTEXT: Readonly<SessionContext> = { view: 'candidate' };

export const sessionContext = createContext<Readonly<SessionContext>>(Symbol('testContext'));
