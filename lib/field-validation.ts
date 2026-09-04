type FieldControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// Validate in document order so only one hidden section is revealed at a time.
// Native whole-form validation would try to focus multiple hidden steps at once.
export function firstInvalidField(form: HTMLFormElement, step?: number): FieldControl | undefined {
 const selector=step===undefined?"input,textarea,select":`[data-step="${step}"] input,[data-step="${step}"] textarea,[data-step="${step}"] select`;
 return Array.from(form.querySelectorAll<FieldControl>(selector)).find(control=>!control.checkValidity());
}
