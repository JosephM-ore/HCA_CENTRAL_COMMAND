export const APPROVED_REGISTRATION_EMAILS = [
  "mcastellanos@sunwestbank.com",
  "jhennessey@hovdecapital.com",
];

export function isApprovedRegistrationEmail(email: string) {
  return APPROVED_REGISTRATION_EMAILS.includes(email.trim().toLowerCase());
}