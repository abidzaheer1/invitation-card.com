/** Password rules shared by the API (which enforces them) and the web app (which explains them). */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// The most reused passwords. Rejecting these stops the guesses attackers try first.
const COMMON = new Set(
  (
    "password password1 password12 password123 passw0rd p@ssw0rd p@ssword 12345678 123456789 1234567890 " +
    "11111111 00000000 12341234 87654321 qwertyui qwerty123 qwertyuiop 1q2w3e4r 1q2w3e4r5t zaq12wsx " +
    "iloveyou iloveyou1 letmein123 welcome1 welcome123 admin123 administrator abc12345 abcd1234 abcdefgh " +
    "football1 baseball1 monkey123 dragon123 master123 sunshine1 princess1 superman1 trustno1 changeme " +
    "changeme123 whatever1 starwars1 michael1 shadow123 login123 passcode1 invitation invitation1 " +
    "invitation123 wedding123 birthday1 mypassword mypassword1 password!"
  ).split(" "),
);

/** Returns a message for the person if the password is not acceptable, or null when it is fine. */
export function checkPassword(password: string, email?: string | null): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "That password is too common. Try a few unrelated words.";
  if (/^(.)\1+$/.test(password)) return "Don't repeat the same character.";
  if (email) {
    const address = email.toLowerCase();
    const local = address.split("@")[0];
    if (lower === address || (local.length >= 4 && lower === local)) {
      return "Your password can't be your email address.";
    }
  }
  return null;
}
