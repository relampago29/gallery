// src/lib/utils/mailProvider.ts

type MailProvider = {
  name: string;
  url: string;
};

const providers: Record<string, MailProvider> = {
  "gmail.com": { name: "Gmail", url: "https://mail.google.com" },
  "googlemail.com": { name: "Gmail", url: "https://mail.google.com" },
  "outlook.com": {
    name: "Outlook",
    url: "https://outlook.live.com/mail/0/inbox",
  },
  "hotmail.com": {
    name: "Outlook",
    url: "https://outlook.live.com/mail/0/inbox",
  },
  "live.com": {
    name: "Outlook",
    url: "https://outlook.live.com/mail/0/inbox",
  },
  "yahoo.com": { name: "Yahoo Mail", url: "https://mail.yahoo.com" },
  "ymail.com": { name: "Yahoo Mail", url: "https://mail.yahoo.com" },
  "icloud.com": { name: "iCloud", url: "https://www.icloud.com/mail/" },
  "me.com": { name: "iCloud", url: "https://www.icloud.com/mail/" },
  "mac.com": { name: "iCloud", url: "https://www.icloud.com/mail/" },
};

/**
 * Returns the webmail provider info for a given email address.
 * Returns `null` when the domain is not a known webmail provider.
 */
export function getMailProvider(email: string): MailProvider | null {
  const domain = email.split("@").pop()?.toLowerCase();
  if (!domain) return null;
  return providers[domain] ?? null;
}
