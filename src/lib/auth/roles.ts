// FR-02: every user has one role. Labels are Hebrew for the UI.
export const roles = ["submitter", "manager", "dev", "admin"] as const;
export type Role = (typeof roles)[number];

export const roleLabel: Record<Role, string> = {
  submitter: "מגיש/ה",
  manager: "מנהל/ת",
  dev: "מפתח/ת / Vibe Coder",
  admin: "אדמין",
};

/** Who can do what. Checked server-side on every route and action (FR-03). */
export const can = {
  submit: (r: Role) => r === "submitter" || r === "manager" || r === "admin",
  review: (r: Role) => r === "manager" || r === "admin",
  assign: (r: Role) => r === "manager" || r === "admin",
  editRules: (r: Role) => r === "admin",
  manageUsers: (r: Role) => r === "admin",
  seeAssignments: (r: Role) => r === "manager" || r === "admin" || r === "dev",
};

/** Where each role lands after sign-in. */
export const homeFor: Record<Role, string> = {
  submitter: "/dashboard",
  manager: "/review",
  dev: "/assignments",
  admin: "/policy-rules",
};
