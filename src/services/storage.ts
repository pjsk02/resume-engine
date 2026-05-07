const PREFIX = "re:";

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  linkedin?: string;
  notes?: string;
  message?: string;
  thread?: string[];
  status:
    | "to-reach"
    | "reached"
    | "replied"
    | "interviewing"
    | "closed"
    | "connection_sent";
  createdAt: string;
  updatedAt: string;
}

function key(id: string) {
  return `${PREFIX}contact:${id}`;
}

function allContactKeys(): string[] {
  return Object.keys(localStorage).filter((k) =>
    k.startsWith(`${PREFIX}contact:`)
  );
}

export function getContacts(): Contact[] {
  return allContactKeys()
    .map((k) => {
      try {
        return JSON.parse(localStorage.getItem(k) ?? "") as Contact;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Contact[];
}

export function saveContact(
  contact: Omit<Contact, "id" | "createdAt" | "updatedAt">,
): Contact {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const full: Contact = { ...contact, id, createdAt: now, updatedAt: now };
  localStorage.setItem(key(id), JSON.stringify(full));
  return full;
}

export function updateContact(
  id: string,
  patch: Partial<Omit<Contact, "id" | "createdAt">>,
): Contact {
  const existing = localStorage.getItem(key(id));
  if (!existing) throw new Error(`Contact ${id} not found`);
  const contact: Contact = JSON.parse(existing);
  const updated: Contact = {
    ...contact,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(key(id), JSON.stringify(updated));
  return updated;
}

export function deleteContact(id: string): void {
  localStorage.removeItem(key(id));
}
