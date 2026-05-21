const ROW_TOLERANCE = 1;

export function markContactRowStarts(root) {
  const contacts = Array.from(root?.querySelectorAll?.(".resume-contacts .contact") ?? []);
  let currentRowTop = null;

  for (const contact of contacts) {
    contact.classList.remove("contact-row-start");
    const top = Number(contact.offsetTop) || 0;
    const startsNewRow = currentRowTop === null || Math.abs(top - currentRowTop) > ROW_TOLERANCE;

    if (startsNewRow) {
      contact.classList.add("contact-row-start");
      currentRowTop = top;
    }
  }
}
