import type { IPreMarketRequest } from "./pre-market.model";

import {
  PRE_MARKET_NEIGHBORHOOD_LOOKUP,
  type PreMarketNeighborhoodLookupEntry,
} from "./pre-market-neighborhood-lookup.generated";

export type MatchSectionToggles = {
  unitFeatures: boolean;
  buildingFeatures: boolean;
  petPolicy: boolean;
  guarantorsPolicy: boolean;
  priorityBonuses: boolean;
};

export type MatchApartmentInput = {
  borough: "Manhattan" | "Brooklyn";
  neighborhood: string;
  bedrooms: "Studio" | "1BR" | "2BR" | "3BR" | "4BR+";
  bathrooms: "1" | "2" | "3" | "4+";
  rent: number;
  movingDateRange: {
    earliest: Date | string;
    latest: Date | string;
  };
  unitFeatures: {
    laundryInUnit: boolean;
    privateOutdoorSpace: boolean;
    dishwasher: boolean;
  };
  buildingFeatures: {
    doorman: boolean;
    elevator: boolean;
    laundryInBuilding: boolean;
  };
  petPolicy: {
    catsAllowed: boolean;
    dogsAllowed: boolean;
  };
  guarantorPolicy: {
    personalGuarantor: boolean;
    thirdPartyGuarantor: boolean;
  };
  availableFeatures: Record<string, boolean>;
  toggles: MatchSectionToggles;
};

export type MissingFeatureCode =
  | "bedrooms"
  | "bathrooms"
  | "rent"
  | "location"
  | "moveDateTotalMiss"
  | "moveDateNearMiss"
  | "laundryInUnit"
  | "privateOutdoorSpace"
  | "dishwasher"
  | "doorman"
  | "elevator"
  | "laundryInBuilding";

export type MatchMissingFeature = {
  code: MissingFeatureCode;
  label: string;
  description: string;
  deduction: number;
};

export type MatchDisqualificationReason =
  | "registrationDisclosureMissing"
  | "location"
  | "bedrooms"
  | "bathrooms"
  | "rent"
  | "petPolicy"
  | "guarantorPolicy"
  | "tooManySoftMisses";

export type MatchScoreResult =
  | {
      disqualified: true;
      reason: MatchDisqualificationReason;
      missingFeatures: MatchMissingFeature[];
    }
  | {
      disqualified: false;
      score: number;
      starRating: number;
      missingFeatures: MatchMissingFeature[];
      preferenceMatches: boolean[];
      priorityBonus: number;
      primaryDeduction: number;
      secondaryDeduction: number;
      exactLocationMatch: boolean;
      regionLocationMatch: boolean;
    };

type RequestWithMatchContext = Pick<
  IPreMarketRequest,
  | "bedrooms"
  | "bathrooms"
  | "priceRange"
  | "locations"
  | "movingDateRange"
  | "unitFeatures"
  | "buildingFeatures"
  | "petPolicy"
  | "guarantorRequired"
  | "preferences"
> & {
  registrationDisclosureConfirmed?: boolean;
};

type PreferenceMatchSource = {
  label: string;
  present: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const BEDROOM_VALUES: Record<string, number> = {
  Studio: 0,
  "1BR": 1,
  "2BR": 2,
  "3BR": 3,
  "4BR+": 4,
};

const BATHROOM_VALUES: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4+": 4,
};

const MISSING_FEATURE_META: Record<MissingFeatureCode, Omit<MatchMissingFeature, "code">> = {
  bedrooms: {
    label: "Bedrooms 1 less",
    description: "Apartment has one fewer bedroom than requested",
    deduction: -50,
  },
  bathrooms: {
    label: "Bathrooms 1 less",
    description: "Apartment has one fewer bathroom than requested",
    deduction: -50,
  },
  rent: {
    label: "Rent over budget",
    description: "Apartment rent is 1-10% above renter budget",
    deduction: -30,
  },
  location: {
    label: "Location same region",
    description: "Same region, not a preferred neighborhood",
    deduction: -40,
  },
  moveDateTotalMiss: {
    label: "Move date total miss",
    description: "Move date does not overlap by more than 16 days",
    deduction: -50,
  },
  moveDateNearMiss: {
    label: "Move date near miss",
    description: "Move date does not overlap but is within 16 days",
    deduction: -30,
  },
  laundryInUnit: {
    label: "W/D in Unit missing",
    description: "No in-unit washer/dryer",
    deduction: -40,
  },
  privateOutdoorSpace: {
    label: "Private Outdoor missing",
    description: "No private outdoor space",
    deduction: -40,
  },
  dishwasher: {
    label: "Dishwasher missing",
    description: "No dishwasher",
    deduction: -40,
  },
  doorman: {
    label: "Doorman missing",
    description: "No doorman",
    deduction: -30,
  },
  elevator: {
    label: "Elevator missing",
    description: "No elevator",
    deduction: -30,
  },
  laundryInBuilding: {
    label: "Laundry in Building missing",
    description: "No building laundry",
    deduction: -30,
  },
};

const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const neighborhoodLookupByName = PRE_MARKET_NEIGHBORHOOD_LOOKUP.reduce(
  (lookup, entry) => {
    const key = normalizeText(entry.neighborhood);
    if (!lookup.has(key)) {
      lookup.set(key, entry);
    }
    return lookup;
  },
  new Map<string, PreMarketNeighborhoodLookupEntry>(),
);

export const getPreMarketNeighborhoodsByBorough = () => {
  const grouped = PRE_MARKET_NEIGHBORHOOD_LOOKUP.reduce<
    Record<string, PreMarketNeighborhoodLookupEntry[]>
  >((acc, entry) => {
    acc[entry.borough] ??= [];
    acc[entry.borough].push(entry);
    return acc;
  }, {});

  return grouped;
};

const getNeighborhoodLookup = (
  neighborhood: string,
): PreMarketNeighborhoodLookupEntry | null =>
  neighborhoodLookupByName.get(normalizeText(neighborhood)) ?? null;

const toDate = (value: Date | string | undefined): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumber = (value: unknown): number | null => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const smallestRequestedValue = (
  values: unknown,
  mapping: Record<string, number>,
): number | null => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const numericValues = values
    .map(value => mapping[String(value)])
    .filter((value): value is number => typeof value === "number");
  return numericValues.length ? Math.min(...numericValues) : null;
};

const isTruthy = (value: unknown): boolean => value === true;

const hasCompatibleGuarantorPolicy = (
  apartment: MatchApartmentInput,
  request: RequestWithMatchContext,
): boolean => {
  const renterAcceptsPersonal = isTruthy(
    request.guarantorRequired?.personalGuarantor,
  );
  const renterAcceptsThirdParty = isTruthy(
    request.guarantorRequired?.thirdPartyGuarantor,
  );

  if (!renterAcceptsPersonal && !renterAcceptsThirdParty) {
    return true;
  }

  return (
    (renterAcceptsPersonal && apartment.guarantorPolicy.personalGuarantor)
    || (renterAcceptsThirdParty && apartment.guarantorPolicy.thirdPartyGuarantor)
  );
};

const missingFeature = (code: MissingFeatureCode): MatchMissingFeature => ({
  code,
  ...MISSING_FEATURE_META[code],
});

const hasDateOverlap = (
  apartmentStart: Date,
  apartmentEnd: Date,
  requestStart: Date,
  requestEnd: Date,
) => apartmentStart <= requestEnd && apartmentEnd >= requestStart;

const dateGapInDays = (
  apartmentStart: Date,
  apartmentEnd: Date,
  requestStart: Date,
  requestEnd: Date,
) => {
  if (apartmentEnd < requestStart) {
    return Math.ceil((requestStart.getTime() - apartmentEnd.getTime()) / MS_PER_DAY);
  }

  return Math.ceil((apartmentStart.getTime() - requestEnd.getTime()) / MS_PER_DAY);
};

const resolveLocationMatch = (
  apartment: MatchApartmentInput,
  request: RequestWithMatchContext,
) => {
  const apartmentLookup = getNeighborhoodLookup(apartment.neighborhood);
  const requestLocations = Array.isArray(request.locations)
    ? request.locations
    : [];
  const requestNeighborhoods = requestLocations.flatMap(
    location => location.neighborhoods ?? [],
  );
  const normalizedApartmentNeighborhood = normalizeText(apartment.neighborhood);
  const exactLocationMatch = requestNeighborhoods.some(
    neighborhood => normalizeText(neighborhood) === normalizedApartmentNeighborhood,
  );

  if (exactLocationMatch) {
    return {
      hasLocationMatch: true,
      exactLocationMatch: true,
      regionLocationMatch: false,
    };
  }

  if (!apartmentLookup) {
    const boroughMatch = requestLocations.some(
      location => normalizeText(location.borough) === normalizeText(apartment.borough),
    );
    return {
      hasLocationMatch: boroughMatch,
      exactLocationMatch: false,
      regionLocationMatch: false,
    };
  }

  const regionLocationMatch = requestNeighborhoods.some((neighborhood) => {
    const requestLookup = getNeighborhoodLookup(neighborhood);
    return requestLookup?.region === apartmentLookup.region;
  });

  return {
    hasLocationMatch: regionLocationMatch,
    exactLocationMatch: false,
    regionLocationMatch,
  };
};

const buildPreferenceSources = (
  apartment: MatchApartmentInput,
): PreferenceMatchSource[] => {
  const available = apartment.availableFeatures ?? {};

  return [
    { label: "Large Apartment", present: Boolean(available.largeApartment) },
    { label: "Lots of Light", present: Boolean(available.lotsOfLight) },
    { label: "New Renovation", present: Boolean(available.newRenovation) },
    { label: "New Ranovation", present: Boolean(available.newRenovation) },
    { label: "High Ceilings", present: Boolean(available.highCeilings) },
    { label: "Not Ground Floor", present: Boolean(available.notGroundFloor) },
    { label: "Avoid Ground Floor", present: Boolean(available.notGroundFloor) },
    { label: "Avoid the Ground Floor", present: Boolean(available.notGroundFloor) },
    { label: "Lots of Storage", present: Boolean(available.lotsOfStorage) },
    { label: "Gym in Building", present: Boolean(available.gymInBuilding) },
    {
      label: "If Walk-Up: Below 3rd Floor",
      present: Boolean(available.ifWalkUpBelow3rdFloor),
    },
    {
      label: "If Walk-Up: Prefer Lower Floors",
      present: Boolean(available.ifWalkUpBelow3rdFloor),
    },
    { label: "Open Views", present: Boolean(available.openViews) },
    { label: "Open Kitchen", present: Boolean(available.openKitchen) },
    { label: "Outdoor Space", present: apartment.unitFeatures.privateOutdoorSpace },
    { label: "Private Outdoor Space", present: apartment.unitFeatures.privateOutdoorSpace },
    { label: "W/D in Unit", present: apartment.unitFeatures.laundryInUnit },
    { label: "Laundry in Unit", present: apartment.unitFeatures.laundryInUnit },
    { label: "Dishwasher", present: apartment.unitFeatures.dishwasher },
    { label: "Doorman", present: apartment.buildingFeatures.doorman },
    { label: "Elevator", present: apartment.buildingFeatures.elevator },
    {
      label: "Laundry in Building",
      present: apartment.buildingFeatures.laundryInBuilding,
    },
    {
      label: "Laundry in the Building",
      present: apartment.buildingFeatures.laundryInBuilding,
    },
  ];
};

const resolvePreferenceMatches = (
  apartment: MatchApartmentInput,
  request: RequestWithMatchContext,
) => {
  const topPreferences = Array.isArray(request.preferences)
    ? request.preferences.slice(0, 4)
    : [];
  const sources = buildPreferenceSources(apartment);
  const sourceMap = new Map(
    sources.map(source => [normalizeText(source.label), source.present]),
  );

  const preferenceMatches = topPreferences.map(preference =>
    Boolean(sourceMap.get(normalizeText(preference))),
  );

  while (preferenceMatches.length < 4) {
    preferenceMatches.push(false);
  }

  const bonusValues = [8, 6, 4, 2];
  const priorityBonus = apartment.toggles.priorityBonuses
    ? preferenceMatches.reduce(
        (sum, matched, index) => sum + (matched ? bonusValues[index] ?? 0 : 0),
        0,
      )
    : 0;

  return {
    preferenceMatches,
    priorityBonus: Math.min(priorityBonus, 20),
  };
};

const scoreFromDeductions = (
  missingFeatures: MatchMissingFeature[],
  priorityBonus: number,
) => {
  const deductions = missingFeatures.map(feature => feature.deduction);
  const primaryDeduction = deductions.length ? Math.min(...deductions) : 0;
  const secondaryDeduction = deductions.length > 1
    ? -10 * (deductions.length - 1)
    : 0;
  const score = Math.max(
    0,
    Math.min(100, 100 + primaryDeduction + secondaryDeduction + priorityBonus),
  );

  return { score, primaryDeduction, secondaryDeduction };
};

const starRatingFromScore = (score: number): number => {
  if (score === 100) return 5;
  if (score >= 90) return 4.5;
  if (score >= 80) return 4;
  if (score >= 70) return 3.5;
  if (score >= 60) return 3;
  if (score >= 50) return 2.5;
  if (score >= 40) return 2;
  if (score >= 30) return 1.5;
  if (score >= 20) return 1;
  if (score >= 10) return 0.5;
  return 0;
};

export const scorePreMarketRequest = (
  apartment: MatchApartmentInput,
  request: RequestWithMatchContext,
): MatchScoreResult => {
  const missingFeatures: MatchMissingFeature[] = [];
  const { toggles } = apartment;
  const apartmentBedrooms = BEDROOM_VALUES[apartment.bedrooms];
  const apartmentBathrooms = BATHROOM_VALUES[apartment.bathrooms];
  const requestBedrooms = smallestRequestedValue(request.bedrooms, BEDROOM_VALUES);
  const requestBathrooms = smallestRequestedValue(request.bathrooms, BATHROOM_VALUES);
  const maxRent = toNumber(request.priceRange?.max);
  const locationMatch = resolveLocationMatch(apartment, request);

  if (request.registrationDisclosureConfirmed === false) {
    return {
      disqualified: true,
      reason: "registrationDisclosureMissing",
      missingFeatures,
    };
  }

  if (!locationMatch.hasLocationMatch) {
    return { disqualified: true, reason: "location", missingFeatures };
  }

  if (
    requestBedrooms != null
    && apartmentBedrooms != null
    && requestBedrooms - apartmentBedrooms >= 2
  ) {
    return { disqualified: true, reason: "bedrooms", missingFeatures };
  }

  if (
    requestBathrooms != null
    && apartmentBathrooms != null
    && requestBathrooms - apartmentBathrooms >= 2
  ) {
    return { disqualified: true, reason: "bathrooms", missingFeatures };
  }

  if (maxRent != null && apartment.rent > maxRent * 1.1) {
    return { disqualified: true, reason: "rent", missingFeatures };
  }

  if (toggles.petPolicy) {
    if (
      (isTruthy(request.petPolicy?.catsAllowed)
        && !apartment.petPolicy.catsAllowed
        && !apartment.petPolicy.dogsAllowed)
      || (isTruthy(request.petPolicy?.dogsAllowed) && !apartment.petPolicy.dogsAllowed)
    ) {
      return { disqualified: true, reason: "petPolicy", missingFeatures };
    }
  }

  if (toggles.guarantorsPolicy) {
    if (!hasCompatibleGuarantorPolicy(apartment, request)) {
      return { disqualified: true, reason: "guarantorPolicy", missingFeatures };
    }
  }

  const addSoftMiss = (code: MissingFeatureCode): boolean => {
    missingFeatures.push(missingFeature(code));
    return missingFeatures.length <= 3;
  };

  if (
    requestBedrooms != null
    && apartmentBedrooms != null
    && requestBedrooms - apartmentBedrooms === 1
    && !addSoftMiss("bedrooms")
  ) {
    return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
  }

  if (
    requestBathrooms != null
    && apartmentBathrooms != null
    && requestBathrooms - apartmentBathrooms === 1
    && !addSoftMiss("bathrooms")
  ) {
    return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
  }

  if (
    maxRent != null
    && apartment.rent > maxRent
    && apartment.rent <= maxRent * 1.1
    && !addSoftMiss("rent")
  ) {
    return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
  }

  if (locationMatch.regionLocationMatch && !addSoftMiss("location")) {
    return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
  }

  const apartmentStart = toDate(apartment.movingDateRange.earliest);
  const apartmentEnd = toDate(apartment.movingDateRange.latest);
  const requestStart = toDate(request.movingDateRange?.earliest);
  const requestEnd = toDate(request.movingDateRange?.latest);

  if (apartmentStart && apartmentEnd && requestStart && requestEnd) {
    const overlaps = hasDateOverlap(
      apartmentStart,
      apartmentEnd,
      requestStart,
      requestEnd,
    );
    if (!overlaps) {
      const gap = dateGapInDays(apartmentStart, apartmentEnd, requestStart, requestEnd);
      const code = gap > 16 ? "moveDateTotalMiss" : "moveDateNearMiss";
      if (!addSoftMiss(code)) {
        return {
          disqualified: true,
          reason: "tooManySoftMisses",
          missingFeatures,
        };
      }
    }
  }

  if (toggles.unitFeatures) {
    if (
      isTruthy(request.unitFeatures?.laundryInUnit)
      && !apartment.unitFeatures.laundryInUnit
      && !addSoftMiss("laundryInUnit")
    ) {
      return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
    }

    if (
      isTruthy(request.unitFeatures?.privateOutdoorSpace)
      && !apartment.unitFeatures.privateOutdoorSpace
      && !addSoftMiss("privateOutdoorSpace")
    ) {
      return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
    }

    if (
      isTruthy(request.unitFeatures?.dishwasher)
      && !apartment.unitFeatures.dishwasher
      && !addSoftMiss("dishwasher")
    ) {
      return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
    }
  }

  if (toggles.buildingFeatures) {
    if (
      isTruthy(request.buildingFeatures?.doorman)
      && !apartment.buildingFeatures.doorman
      && !addSoftMiss("doorman")
    ) {
      return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
    }

    if (
      isTruthy(request.buildingFeatures?.elevator)
      && !apartment.buildingFeatures.elevator
      && !addSoftMiss("elevator")
    ) {
      return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
    }

    if (
      isTruthy(request.buildingFeatures?.laundryInBuilding)
      && !apartment.buildingFeatures.laundryInBuilding
      && !addSoftMiss("laundryInBuilding")
    ) {
      return { disqualified: true, reason: "tooManySoftMisses", missingFeatures };
    }
  }

  const { preferenceMatches, priorityBonus } = resolvePreferenceMatches(
    apartment,
    request,
  );
  const { score, primaryDeduction, secondaryDeduction } = scoreFromDeductions(
    missingFeatures,
    priorityBonus,
  );

  return {
    disqualified: false,
    score,
    starRating: starRatingFromScore(score),
    missingFeatures,
    preferenceMatches: apartment.toggles.priorityBonuses
      ? preferenceMatches
      : [false, false, false, false],
    priorityBonus,
    primaryDeduction,
    secondaryDeduction,
    exactLocationMatch: locationMatch.exactLocationMatch,
    regionLocationMatch: locationMatch.regionLocationMatch,
  };
};
