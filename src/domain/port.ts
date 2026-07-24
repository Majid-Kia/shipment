export const PORT_CODES = [
  "IRBND",
  "CNSHA",
  "NLRTM",
  "SGSIN",
  "AEJEA",
  "DEHAM",
  "USLAX",
  "BRSSZ",
] as const;

export type PortCode = (typeof PORT_CODES)[number];
