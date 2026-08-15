#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  hasUserProfileOptInAssumption,
  isCalendarDate,
  isConcreteCondition,
  readProfile,
  safeReference,
  verifyProfileRefs,
} = require("./validate-profile");

const DEFAULT_FIXTURE = path.resolve(__dirname, "..", "fixtures", "profile-projection-v1.json");
const DEFAULT_PROFILE_FIXTURE_ROOT = path.resolve(__dirname, "..", "fixtures", "profile-project");
const DEFAULT_PROFILE_CARRIER_FIXTURE = path.join(DEFAULT_PROFILE_FIXTURE_ROOT, ".ai", "knowledge", "collaboration-profile.md");
const DEFAULT_USER_PROFILE_CARRIER_FIXTURE = path.resolve(__dirname, "..", "fixtures", "profile-user", ".ai", "knowledge", "collaboration-profile.md");
const LANES = new Set([
  "phrase_lexicon",
  "communication",
  "collaboration_habit",
  "writing_preference",
  "growth_focus",
  "rejected_option",
  "route_alias",
]);
const SOURCES = new Set([
  "explicit_statement",
  "explicit_confirmation",
  "repeated_correction",
  "repeated_choice",
]);
const STATUSES = new Set(["candidate", "active", "archived"]);
const AUTHORITIES = new Set(["read", "local_write", "external_write", "destructive", "release"]);
const ASSURANCES = new Set(["fast", "standard", "formal"]);
const CONFIRM_ONLY_LANES = new Set(["route_alias", "rejected_option", "growth_focus"]);
const WRITING_POSTURES = new Set(["deliver", "co-create", "coach"]);
const ROUTE_IDS = new Set(["diagnose", "accept", "release-check", "resume"]);
const GROWTH_OUTCOMES = new Set(["PILOT", "PASS", "FAIL", "NOT_RUN"]);
const FORBIDDEN_ORDINARY_SURFACE = [
  "User Lens",
  "Profile Projection",
  "Collaboration Brief",
  "injected_refs",
  "Task Contract",
];
const GENERIC_INJECTED_REF_REASONS = new Set([
  "relevant",
  "applied",
  "applied profile",
  "profile applied",
  "user prefers this",
  "n/a",
  "na",
  "none",
  "unknown",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(base, override) {
  if (!isObject(base) || !isObject(override)) return deepClone(override);
  const result = deepClone(base);
  for (const [key, value] of Object.entries(override)) {
    result[key] = isObject(value) && isObject(result[key]) ? deepMerge(result[key], value) : deepClone(value);
  }
  return result;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

function scopeRank(scope) {
  if (typeof scope === "string" && scope.startsWith("task_class:")) return 0;
  if (typeof scope === "string" && scope.startsWith("domain:")) return 1;
  if (scope === "project") return 2;
  if (scope === "user") return 3;
  return 99;
}

function sourceRank(source) {
  if (source === "explicit_confirmation") return 0;
  if (source === "explicit_statement") return 1;
  if (source === "repeated_correction" || source === "repeated_choice") return 2;
  return 99;
}

function compareCodePointStrings(left, right) {
  const leftPoints = Array.from(String(left));
  const rightPoints = Array.from(String(right));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const difference = leftPoints[index].codePointAt(0) - rightPoints[index].codePointAt(0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

function hasMeaningfulInjectedRefReason(value) {
  if (!nonEmptyString(value) || /[\r\n]/.test(value)) return false;
  const normalized = value.trim().replace(/[.!?]+$/, "").toLowerCase();
  return normalized.length >= 12 && !GENERIC_INJECTED_REF_REASONS.has(normalized);
}

function compareScopeSourcePriority(left, right) {
  return (
    scopeRank(left.scope) - scopeRank(right.scope) ||
    sourceRank(left.source) - sourceRank(right.source)
  );
}

function comparePriority(left, right) {
  return (
    compareScopeSourcePriority(left, right) ||
    (right.semantic.specificity || 0) - (left.semantic.specificity || 0) ||
    compareCodePointStrings(left.id, right.id)
  );
}

function entryEffectSignature(entry) {
  return JSON.stringify({
    lane: entry.lane,
    value: entry.value,
    writing_posture: entry.writing_posture || null,
    trigger_phrase: entry.trigger_phrase || null,
    route_id: entry.route_id || null,
  });
}

function isConfirmationOnly(entry) {
  return CONFIRM_ONLY_LANES.has(entry.lane) || nonEmptyString(entry.writing_posture);
}

function safeConfirmationRef(value) {
  return safeReference(value);
}

function resolveCase(suite, spec) {
  const semanticDefaults = suite.defaults.semantic;
  const uses = spec.entry_uses.map((use) => {
    const catalogEntry = suite.entries[use.entry];
    if (!catalogEntry) throw new Error(`${spec.id}: unknown entry catalog key ${use.entry}`);
    const entry = deepMerge(catalogEntry, use.entry_overrides || {});
    for (const field of use.omit_fields || []) delete entry[field];
    entry.semantic = deepMerge(semanticDefaults, use.semantic || {});
    entry.selected = use.selected === true;
    entry.skip_reason = use.skip_reason;
    entry.legacy = use.legacy === true;
    entry.conflict_key = use.conflict_key || entry.conflict_key || entry.preference_key || entry.id;
    return entry;
  });

  const effect = deepMerge(suite.defaults.effect, spec.effect_overrides || {});
  const selected = uses.filter((entry) => entry.selected);
  let injectedRefs;
  if ((spec.measurement_status || suite.defaults.measurement_status) === "measured") {
    injectedRefs = selected.map((entry, index) => {
      const refRoot = entry.scope === "user"
        ? "~/.ai/knowledge/collaboration-profile.md"
        : ".ai/knowledge/collaboration-profile.md";
      const base = {
        kind: "profile",
        class: "learned",
        ref: `${refRoot}#${entry.id}`,
        content_sha256: nonEmptyString(entry.entry_content) ? sha256(entry.entry_content) : "",
        reason: `Matched ${entry.scope} ${entry.applies_when}; guided ${entry.lane} default.`,
      };
      return deepMerge(base, (spec.injected_ref_overrides || {})[String(index)] || {});
    });
    if (spec.duplicate_first_injected_ref && injectedRefs.length > 0) {
      injectedRefs.push(deepClone(injectedRefs[0]));
    }
  }

  return {
    id: spec.id,
    title: spec.title,
    fresh_mode: spec.fresh_mode === true,
    task_clear: spec.task_clear !== false,
    audit_requested: spec.audit_requested === true,
    as_of: spec.as_of || suite.defaults.as_of,
    user_profile_opted_in: spec.user_profile_opted_in === true || suite.defaults.user_profile_opted_in === true,
    measurement_status: spec.measurement_status || suite.defaults.measurement_status,
    entries: uses,
    injected_refs: injectedRefs,
    effect,
  };
}

function validateEntryMetadata(entry, label, asOf, errors) {
  for (const field of ["id", "lane", "value", "scope", "applies_when", "source", "status", "last_fired"]) {
    if (!nonEmptyString(entry[field])) errors.push(`${label}.${field} is required for projectable entries`);
  }
  if (nonEmptyString(entry.lane) && !LANES.has(entry.lane)) errors.push(`${label}.lane is invalid`);
  if (nonEmptyString(entry.source) && !SOURCES.has(entry.source)) errors.push(`${label}.source is invalid`);
  if (nonEmptyString(entry.status) && !STATUSES.has(entry.status)) errors.push(`${label}.status is invalid`);
  if (nonEmptyString(entry.scope) && !/^(?:project|user|domain:[^\s:]+|task_class:[^\s:]+)$/.test(entry.scope)) {
    errors.push(`${label}.scope is invalid`);
  }
  if (nonEmptyString(entry.last_fired) && entry.last_fired !== "never") {
    if (!isCalendarDate(entry.last_fired)) errors.push(`${label}.last_fired is not a real calendar date`);
    else if (isCalendarDate(asOf) && entry.last_fired > asOf) errors.push(`${label}.last_fired cannot be after as_of`);
  }
  if (nonEmptyString(entry.applies_when) && !isConcreteCondition(entry.applies_when)) {
    errors.push(`${label}.applies_when is generic or a placeholder`);
  }
  if (entry.status === "candidate") {
    if (!safeReference(entry.source_ref)) errors.push(`${label}.source_ref must be a safe reference for candidate`);
    if (!isCalendarDate(entry.observed_at)) errors.push(`${label}.observed_at must be a real calendar date for candidate`);
  } else if (nonEmptyString(entry.observed_at) && !isCalendarDate(entry.observed_at)) {
    errors.push(`${label}.observed_at is not a real calendar date`);
  }
  if (entry.lane === "rejected_option" && entry.scope !== "project") {
    errors.push(`${label}.scope must be project for rejected_option`);
  }
  if (entry.lane === "growth_focus") {
    for (const field of ["capability", "observable_behavior", "review_or_expiry"]) {
      if (!nonEmptyString(entry[field])) errors.push(`${label}.${field} is required for growth_focus`);
    }
    if (!nonEmptyString(entry.collaboration_posture) && !nonEmptyString(entry.agent_support)) {
      errors.push(`${label} growth_focus requires collaboration_posture or agent_support`);
    }
    if (entry.outcome !== undefined && !GROWTH_OUTCOMES.has(entry.outcome)) {
      errors.push(`${label}.outcome is invalid for growth_focus`);
    }
  }
  if (nonEmptyString(entry.writing_posture) && !WRITING_POSTURES.has(entry.writing_posture)) {
    errors.push(`${label}.writing_posture is invalid`);
  }
  if (entry.lane === "writing_preference" && WRITING_POSTURES.has(String(entry.value || "").trim().toLowerCase()) && !nonEmptyString(entry.writing_posture)) {
    errors.push(`${label} posture-shaped writing preference requires writing_posture`);
  }
  if (entry.lane === "route_alias") {
    if (!nonEmptyString(entry.trigger_phrase)) errors.push(`${label}.trigger_phrase is required for route_alias`);
    if (!ROUTE_IDS.has(entry.route_id)) errors.push(`${label}.route_id is invalid for route_alias`);
  }
  if (isConfirmationOnly(entry) && entry.status === "active") {
    if (entry.source !== "explicit_confirmation") errors.push(`${label} confirmation-only entry requires source explicit_confirmation`);
    if (!safeConfirmationRef(entry.confirmation_ref)) errors.push(`${label} confirmation-only entry requires a safe confirmation_ref`);
  }
}

function eligible(entry, fixture) {
  const semantic = entry.semantic;
  return (
    fixture.fresh_mode !== true &&
    entry.status === "active" &&
    SOURCES.has(entry.source) &&
    semantic.scope_matches === true &&
    semantic.applies_when_matches === true &&
    semantic.overridden_by_current_turn === false &&
    semantic.firewall_safe === true &&
    semantic.stale === false &&
    semantic.operational_match === true &&
    (entry.scope !== "user" || fixture.user_profile_opted_in === true) &&
    (!isConfirmationOnly(entry) || (entry.source === "explicit_confirmation" && safeConfirmationRef(entry.confirmation_ref)))
  );
}

function validateProjectionInternal(fixture, profileOptions = {}, fixtureOnly = false) {
  const errors = [];
  if (!nonEmptyString(fixture.id)) errors.push("case id is required");
  if (!nonEmptyString(fixture.title)) errors.push("case title is required");
  if (!Array.isArray(fixture.entries)) errors.push("entries must be an array");
  if (!isObject(fixture.effect)) errors.push("effect must be an object");
  if (!isCalendarDate(fixture.as_of)) errors.push("as_of must be a real calendar date");
  if (errors.length > 0) return errors;

  const selected = fixture.entries.filter((entry) => entry.selected);
  const selectedIds = selected.map((entry) => entry.id);
  const entryIds = fixture.entries.map((entry) => entry.id).filter(nonEmptyString);
  if (selected.length > 2) errors.push("profile selection max is 2");
  if (new Set(selectedIds).size !== selectedIds.length) errors.push("selected profile entry ids must be unique");
  if (new Set(entryIds).size !== entryIds.length) errors.push("profile entry ids must be unique across all entries");

  for (const [index, entry] of fixture.entries.entries()) {
    const label = `entries[${index}]`;
    if (!entry.legacy || entry.selected) validateEntryMetadata(entry, label, fixture.as_of, errors);
    if (!entry.selected && !nonEmptyString(entry.skip_reason)) errors.push(`${label}.skip_reason is required when not selected`);
    if (entry.semantic && Object.prototype.hasOwnProperty.call(entry.semantic, "explicitly_confirmed")) {
      errors.push(`${label}.semantic.explicitly_confirmed is forbidden; confirmation derives from source`);
    }
    if (entry.selected) {
      if (entry.status !== "active") errors.push(`${label}.status must be active when selected`);
      if (entry.semantic.scope_matches !== true) errors.push(`${label} selected despite scope mismatch`);
      if (entry.semantic.applies_when_matches !== true) errors.push(`${label} selected despite applies_when mismatch`);
      if (entry.semantic.overridden_by_current_turn !== false) errors.push(`${label} selected despite current-turn override`);
      if (entry.semantic.firewall_safe !== true) errors.push(`${label} selected despite authority firewall`);
      if (entry.semantic.stale !== false) errors.push(`${label} selected despite stale state`);
      if (entry.semantic.operational_match !== true) errors.push(`${label} selected from quoted or unrelated context`);
      if (entry.scope === "user" && fixture.user_profile_opted_in !== true) errors.push(`${label} selected user profile entry without explicit opt-in`);
      if (isConfirmationOnly(entry) && entry.source !== "explicit_confirmation") errors.push(`${label} confirmation-only entry selected without source explicit_confirmation`);
      if (isConfirmationOnly(entry) && !safeConfirmationRef(entry.confirmation_ref)) errors.push(`${label} confirmation-only entry selected without confirmation_ref`);
    }
  }

  const groups = new Map();
  for (const entry of fixture.entries.filter((candidate) => eligible(candidate, fixture))) {
    const group = groups.get(entry.conflict_key) || [];
    group.push(entry);
    groups.set(entry.conflict_key, group);
  }
  const resolvable = [];
  for (const [key, group] of groups.entries()) {
    const ordered = [...group].sort(compareScopeSourcePriority);
    const top = ordered.filter((entry) => compareScopeSourcePriority(entry, ordered[0]) === 0);
    const signatures = new Set(top.map(entryEffectSignature));
    if (signatures.size > 1) {
      if (group.some((entry) => entry.selected)) errors.push(`conflict group ${key} has same-priority different values and must skip all`);
      continue;
    }
    resolvable.push(top.sort(comparePriority)[0]);
  }
  const expectedSelection = resolvable.sort(comparePriority).slice(0, 2).map((entry) => entry.id);
  if (selectedIds.length <= 2 && JSON.stringify(selectedIds) !== JSON.stringify(expectedSelection)) {
    errors.push(`selected entries must be the first two non-conflicting eligible candidates: ${expectedSelection.join(", ") || "none"}`);
  }

  if (fixture.measurement_status === "measured") {
    if (!Array.isArray(fixture.injected_refs)) {
      errors.push("measured projection requires injected_refs array");
    } else {
      if (fixture.injected_refs.length !== selected.length) {
        errors.push("profile injected_refs count must equal selected entry count");
      }
      const seen = new Set();
      for (const [index, ref] of fixture.injected_refs.entries()) {
        const label = `injected_refs[${index}]`;
        const entry = selected[index];
        if (!isObject(ref)) {
          errors.push(`${label} must be an object`);
          continue;
        }
        if (ref.kind !== "profile" || ref.class !== "learned") errors.push(`${label} must be learned profile`);
        if (!nonEmptyString(ref.ref)) errors.push(`${label}.ref is required`);
        if (!/^[a-f0-9]{64}$/.test(ref.content_sha256 || "")) errors.push(`${label}.content_sha256 is invalid`);
        if (!hasMeaningfulInjectedRefReason(ref.reason)) {
          errors.push(`${label}.reason must name the match and effect`);
        }
        if (entry) {
          const expectedRoot = entry.scope === "user"
            ? "~/.ai/knowledge/collaboration-profile.md"
            : ".ai/knowledge/collaboration-profile.md";
          if (ref.ref !== `${expectedRoot}#${entry.id}`) errors.push(`${label}.ref must identify the exact entry id`);
        }
        const key = `${ref.kind}|${ref.ref}|${ref.content_sha256}`;
        if (seen.has(key)) errors.push(`${label} duplicates a profile ref`);
        seen.add(key);
      }
    }
  } else if (fixture.measurement_status === "unknown") {
    if (fixture.injected_refs !== undefined) errors.push("unknown measurement must omit injected_refs");
    if (selected.length > 0) errors.push("selected entries cannot have unknown injection measurement");
  } else {
    errors.push("measurement_status is invalid");
  }

  if (fixture.measurement_status === "measured" && Array.isArray(fixture.injected_refs) && fixture.injected_refs.some((entry) => entry && entry.kind === "profile") && !fixtureOnly) {
    const hasUserProfileRef = fixture.injected_refs.some((entry) => (
      entry && entry.kind === "profile" && typeof entry.ref === "string" && entry.ref.startsWith("~/.ai/knowledge/collaboration-profile.md#")
    ));
    const hasStructuredUserOptIn = hasUserProfileOptInAssumption(profileOptions.assumptions);
    if (hasUserProfileRef && !hasStructuredUserOptIn) {
      errors.push("user profile refs require a current_session user_profile_opt_in assumption with a safe source_ref");
    }
    const binding = verifyProfileRefs({
      refs: fixture.injected_refs,
      baseDir: profileOptions.baseDir,
      projectProfilePath: profileOptions.projectProfilePath,
      userProfilePath: profileOptions.userProfilePath,
      userProfileOptedIn: fixture.user_profile_opted_in === true && profileOptions.userProfileOptedIn === true && hasStructuredUserOptIn,
    });
    for (const error of binding.errors) errors.push(`source binding: ${error}`);
    if (binding.status === "NOT_RUN") errors.push("source binding NOT_RUN because a selected carrier was not supplied");
  }

  const effect = fixture.effect;
  if (!AUTHORITIES.has(effect.action_authority_before) || !AUTHORITIES.has(effect.action_authority_after)) {
    errors.push("effect action authority is invalid");
  } else if (effect.action_authority_after !== effect.action_authority_before) {
    errors.push("profile must not change action_authority");
  }
  if (!ASSURANCES.has(effect.assurance_before) || !ASSURANCES.has(effect.assurance_after)) {
    errors.push("effect assurance is invalid");
  } else if (effect.assurance_after !== effect.assurance_before) {
    errors.push("profile must not change assurance floor");
  }
  if (!nonEmptyString(effect.evidence_floor_before) || effect.evidence_floor_after !== effect.evidence_floor_before) {
    errors.push("profile must not lower or replace the evidence floor");
  }
  if (!Array.isArray(effect.fixed_solution_steps_added) || effect.fixed_solution_steps_added.length !== 0) {
    errors.push("profile must not add fixed solution steps");
  }
  if (!isObject(effect.collaboration_brief) || effect.collaboration_brief.contract_id !== null || effect.collaboration_brief.phase !== null || effect.collaboration_brief.persisted !== false) {
    errors.push("Collaboration Brief must have no independent id, phase, or persistence");
  }
  if (!isObject(effect.preserved_non_profile_context) || Object.values(effect.preserved_non_profile_context).some((value) => value !== true)) {
    errors.push("Fresh Mode and projection must preserve non-profile context and trust boundaries");
  }
  if (effect.profile_written !== false) errors.push("projection must not create or rewrite a profile object");
  if (effect.active_entry_rewritten !== false) errors.push("temporary override must not rewrite an active profile entry");
  if (!Array.isArray(effect.last_fired_updates)) errors.push("last_fired_updates must be an array");
  if (fixture.fresh_mode) {
    if (selected.length !== 0) errors.push("Fresh Mode must select zero profile entries");
    if (Array.isArray(fixture.injected_refs) && fixture.injected_refs.some((entry) => entry.kind === "profile")) {
      errors.push("Fresh Mode must inject no profile refs");
    }
    if (Array.isArray(effect.last_fired_updates) && effect.last_fired_updates.length > 0) {
      errors.push("Fresh Mode must not update last_fired");
    }
  }
  if (effect.profile_write_authorized !== true && Array.isArray(effect.last_fired_updates) && effect.last_fired_updates.length > 0) {
    errors.push("last_fired update requires profile write authority");
  }
  if (Array.isArray(effect.last_fired_updates)) {
    for (const update of effect.last_fired_updates) {
      if (!isObject(update) || !nonEmptyString(update.id) || !isCalendarDate(update.new_date)) {
        errors.push("last_fired update must include id and a real new_date");
        continue;
      }
      if (update.new_date > fixture.as_of) errors.push("last_fired update cannot be after as_of");
      if (!selectedIds.includes(update.id)) errors.push("last_fired may update only a selected entry that affected the contract");
    }
  }
  if (fixture.task_clear && effect.user_visible_questions_added !== 0) {
    errors.push("clear tasks must add zero profile questions");
  }
  if (!fixture.audit_requested && nonEmptyString(effect.user_visible_text)) {
    for (const term of FORBIDDEN_ORDINARY_SURFACE) {
      if (effect.user_visible_text.includes(term)) errors.push(`ordinary output must not expose ${term}`);
    }
  }
  if (effect.guided_deviation === true && !nonEmptyString(effect.guided_deviation_reason)) {
    errors.push("Guided deviation requires a concrete professional reason");
  }
  return errors;
}

function validateProjection(fixture, profileOptions = {}) {
  return validateProjectionInternal(fixture, profileOptions, false);
}

function validateSuite(suite) {
  const errors = [];
  if (!isObject(suite)) return ["fixture suite must be an object"];
  if (suite.schema_version !== "profile-projection-fixtures/v1") errors.push("fixture schema_version is invalid");
  if (!nonEmptyString(suite.fixture_version)) errors.push("fixture_version is required");
  if (!isObject(suite.defaults) || !isObject(suite.defaults.semantic) || !isObject(suite.defaults.effect)) {
    errors.push("fixture defaults are incomplete");
  }
  if (!isObject(suite.entries)) errors.push("fixture entry catalog is required");
  if (!Array.isArray(suite.cases) || suite.cases.length < 20) errors.push("fixture suite requires at least 20 cases");
  if (errors.length > 0) return errors;

  const ids = new Set();
  let validControls = 0;
  let negativeControls = 0;
  for (const spec of suite.cases) {
    if (!nonEmptyString(spec.id) || ids.has(spec.id)) {
      errors.push(`fixture case id is missing or duplicate: ${spec.id}`);
      continue;
    }
    ids.add(spec.id);
    let fixture;
    try {
      fixture = resolveCase(suite, spec);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const caseErrors = validateProjectionInternal(fixture, {}, true);
    const expected = spec.expected || {};
    if (expected.valid === true) {
      validControls += 1;
      if (caseErrors.length > 0) errors.push(`${spec.id} expected valid: ${caseErrors.join("; ")}`);
    } else if (expected.valid === false) {
      negativeControls += 1;
      if (!nonEmptyString(expected.error_contains)) {
        errors.push(`${spec.id} negative control requires error_contains`);
      } else if (!caseErrors.some((error) => error.includes(expected.error_contains))) {
        errors.push(`${spec.id} expected error ${JSON.stringify(expected.error_contains)}; got ${caseErrors.join("; ") || "none"}`);
      }
    } else {
      errors.push(`${spec.id} expected.valid must be boolean`);
    }
  }
  if (validControls === 0 || negativeControls === 0) errors.push("fixture suite needs both valid and negative controls");
  return errors;
}

function loadSuite(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateSourceBindingSelfTest(suite) {
  const parsed = readProfile(DEFAULT_PROFILE_CARRIER_FIXTURE);
  const userParsed = readProfile(DEFAULT_USER_PROFILE_CARRIER_FIXTURE);
  const entry = parsed.byId.get("project-architecture-detail");
  const otherEntry = parsed.byId.get("project-architecture-concise");
  const spec = suite.cases.find((item) => item.id === "PP01");
  const userEntry = userParsed.byId.get("route-review-accept");
  const userSpec = suite.cases.find((item) => item.id === "PP38");
  if (!entry || !otherEntry || !spec || !userEntry || !userSpec) return ["source binding self-test fixture is incomplete"];
  const fixture = resolveCase(suite, spec);
  fixture.injected_refs[0].content_sha256 = entry.content_sha256;
  const passErrors = validateProjection(fixture, { baseDir: DEFAULT_PROFILE_FIXTURE_ROOT });
  const forged = deepClone(fixture);
  forged.injected_refs[0].content_sha256 = otherEntry.content_sha256;
  const forgedErrors = validateProjection(forged, { baseDir: DEFAULT_PROFILE_FIXTURE_ROOT });
  const missingCarrierErrors = validateProjection(fixture, { baseDir: path.join(DEFAULT_PROFILE_FIXTURE_ROOT, "missing") });
  const userFixture = resolveCase(suite, userSpec);
  userFixture.injected_refs[0].content_sha256 = userEntry.content_sha256;
  const userWithoutAssumptionErrors = validateProjection(userFixture, {
    userProfilePath: DEFAULT_USER_PROFILE_CARRIER_FIXTURE,
    userProfileOptedIn: true,
  });
  const userWithAssumptionErrors = validateProjection(userFixture, {
    userProfilePath: DEFAULT_USER_PROFILE_CARRIER_FIXTURE,
    userProfileOptedIn: true,
    assumptions: [{
      kind: "user_profile_opt_in",
      enabled: true,
      scope: "current_session",
      source_ref: "current-turn:user-profile-opt-in",
    }],
  });
  const errors = [];
  if (passErrors.length > 0) errors.push(`real carrier binding expected valid: ${passErrors.join("; ")}`);
  if (!forgedErrors.some((error) => error.includes("digest does not match canonical entry block"))) {
    errors.push(`forged caller content was not rejected: ${forgedErrors.join("; ") || "none"}`);
  }
  if (!missingCarrierErrors.some((error) => error.includes("source binding NOT_RUN"))) {
    errors.push(`missing carrier did not fail closed: ${missingCarrierErrors.join("; ") || "none"}`);
  }
  if (!userWithoutAssumptionErrors.some((error) => error.includes("current_session user_profile_opt_in assumption"))) {
    errors.push(`user carrier passed without structured current-session assumption: ${userWithoutAssumptionErrors.join("; ") || "none"}`);
  }
  if (userWithAssumptionErrors.length > 0) {
    errors.push(`user carrier with all three opt-in gates expected valid: ${userWithAssumptionErrors.join("; ")}`);
  }
  return errors;
}

function main(argv = process.argv.slice(2)) {
  const fixtureArg = argv.find((arg) => arg !== "--self-test");
  const fixturePath = path.resolve(fixtureArg || DEFAULT_FIXTURE);
  let suite;
  try {
    suite = loadSuite(fixturePath);
  } catch (error) {
    console.error(`FAIL cannot read profile projection fixtures: ${error.message}`);
    return 1;
  }
  const errors = validateSuite(suite);
  errors.push(...validateSourceBindingSelfTest(suite));
  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL ${error}`);
    return 1;
  }
  const valid = suite.cases.filter((entry) => entry.expected.valid).length;
  const negative = suite.cases.length - valid;
  console.log(`PASS Profile Projection v1 fixture contract (${suite.cases.length} cases: ${valid} valid, ${negative} negative controls)`);
  console.log(`fixture_version: ${suite.fixture_version}`);
  console.log(`fixture_sha256: ${sha256(fs.readFileSync(fixturePath, "utf8"))}`);
  console.log("PASS profile source binding uses canonical carrier bytes and requires Task Contract assumption plus runtime opt-in for user carriers; fixture-only receipts remain NOT_RUN for source binding");
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = {
  validateProjection,
  validateSuite,
  validateSourceBindingSelfTest,
  resolveCase,
  sha256,
};
