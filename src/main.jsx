import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "mapbox-gl/dist/mapbox-gl.css";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import "../styles.css";

const properties = [
  {
    id: "bp-101",
    title: "Sunlit Studio near Metro",
    locality: "Indiranagar",
    city: "Bengaluru",
    bhk: "1 BHK",
    rent: 18500,
    deposit: 50000,
    area: 520,
    type: "Studio",
    status: "Ready",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80",
    features: ["Furnished", "Metro 700m", "No brokerage"],
    description: "A compact, bright studio for a renter who wants a clean commute and a simple move-in."
  },
  {
    id: "bp-102",
    title: "Quiet 2 BHK with Balcony",
    locality: "HSR Layout",
    city: "Bengaluru",
    bhk: "2 BHK",
    rent: 32000,
    deposit: 90000,
    area: 980,
    type: "Apartment",
    status: "Verified",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80",
    features: ["Family friendly", "Balcony", "Lift"],
    description: "A practical two bedroom home in a calm lane with daily essentials nearby."
  },
  {
    id: "bp-103",
    title: "Managed Co-living Room",
    locality: "Koramangala",
    city: "Bengaluru",
    bhk: "1 RK",
    rent: 14500,
    deposit: 25000,
    area: 260,
    type: "Co-living",
    status: "Hot",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
    features: ["Meals option", "Wi-Fi", "Housekeeping"],
    description: "A managed room close to cafes, offices and nightlife, designed for fast move-ins."
  },
  {
    id: "bp-104",
    title: "Spacious 3 BHK for Sharing",
    locality: "Whitefield",
    city: "Bengaluru",
    bhk: "3 BHK",
    rent: 47000,
    deposit: 130000,
    area: 1460,
    type: "Apartment",
    status: "Ready",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
    features: ["Gated society", "Pool", "Power backup"],
    description: "A larger apartment for colleagues or a family who want amenities and space."
  },
  {
    id: "bp-105",
    title: "Minimal 1 BHK in Gated Block",
    locality: "Bellandur",
    city: "Bengaluru",
    bhk: "1 BHK",
    rent: 24000,
    deposit: 70000,
    area: 650,
    type: "Apartment",
    status: "Verified",
    image: "https://images.unsplash.com/photo-1560448075-bb485b067938?auto=format&fit=crop&w=1000&q=80",
    features: ["Security", "Gym", "Covered parking"],
    description: "A polished one bedroom home in a managed community near tech parks."
  },
  {
    id: "bp-106",
    title: "Budget Room near College",
    locality: "BTM Layout",
    city: "Bengaluru",
    bhk: "1 RK",
    rent: 9800,
    deposit: 18000,
    area: 210,
    type: "Room",
    status: "Budget",
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=80",
    features: ["Low deposit", "Shared kitchen", "Bus stop 200m"],
    description: "A simple budget room for students or first-time renters watching monthly spend."
  }
];

const bhks = ["All", "1 RK", "1 BHK", "2 BHK", "3 BHK"];
const sortOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "rent-low", label: "Rent: low to high" },
  { value: "rent-high", label: "Rent: high to low" },
  { value: "area-high", label: "Largest first" },
  { value: "deposit-low", label: "Lowest deposit" }
];
const money = (value) => `Rs ${Number(value).toLocaleString("en-IN")}`;
const validPages = new Set(["home", "saved", "account", "manage"]);
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
const propertyImageBucket = "property-images";
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function normalizePropertyRow(row) {
  const images = normalizePropertyImages(row);
  const coverImage = images[0]?.image_url || row.image_url || "";

  return {
    id: row.id,
    title: row.title,
    locality: row.locality,
    localityTag: row.locality_tag,
    city: row.city,
    state: row.state,
    bhk: row.bhk,
    rent: row.rent,
    deposit: row.deposit,
    area: row.area,
    type: row.type,
    status: row.status,
    image: coverImage,
    images,
    features: Array.isArray(row.features) ? row.features : [],
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    is_active: row.is_active
  };
}

function normalizePropertyImages(row) {
  const relatedImages = Array.isArray(row.property_images) ? row.property_images : [];
  const normalized = relatedImages
    .filter((image) => image?.image_url)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((image, index) => ({
      id: image.id ?? `${row.id}-${index}`,
      image_url: image.image_url,
      alt_text: image.alt_text || "",
      sort_order: Number(image.sort_order ?? index)
    }));

  if (!normalized.length && row.image_url) {
    normalized.push({
      id: `${row.id}-cover`,
      image_url: row.image_url,
      alt_text: row.title || "",
      sort_order: 0
    });
  }

  return normalized;
}

function createEmptyImageEntry() {
  return {
    id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    source: "url",
    image_url: "",
    image_file: null,
    alt_text: ""
  };
}

function getPropertyImageAlt(property, index = 0) {
  return property.images?.[index]?.alt_text || property.title;
}

function getFileExtension(file) {
  const fallback = file.type.split("/")[1] || "jpg";
  const fromName = file.name.split(".").pop();
  return (fromName || fallback).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

function getSafePathPart(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "property";
}

async function uploadPropertyImage(file, propertyId, userId) {
  if (!supportedImageTypes.has(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP, or GIF image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be under 5 MB.");
  }

  const extension = getFileExtension(file);
  const path = `${userId}/${getSafePathPart(propertyId)}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(propertyImageBucket)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(propertyImageBucket).getPublicUrl(path);
  return data.publicUrl;
}

function getPropertyScore(property) {
  const status = String(property.status || "").toLowerCase();
  const hasMapPin = Number.isFinite(Number(property.latitude)) && Number.isFinite(Number(property.longitude));
  const featureCount = Array.isArray(property.features) ? property.features.length : 0;
  return (
    (status.includes("verified") ? 40 : 0) +
    (status.includes("ready") ? 24 : 0) +
    (hasMapPin ? 18 : 0) +
    Math.min(featureCount, 5) * 3 +
    Math.max(0, 50000 - Number(property.rent || 0)) / 2500
  );
}

async function geocodePropertyLocation(propertyForm) {
  if (!mapboxToken || !propertyForm.locality?.trim() || !propertyForm.city?.trim()) {
    return null;
  }

  const query = [propertyForm.locality, propertyForm.city, propertyForm.state, "India"].filter(Boolean).join(", ");
  const sessionToken = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const searchBoxMatches = await fetchLocalitySuggestions(query, { city: "", state: "" }, sessionToken);
  const bestMatch = searchBoxMatches[0];

  if (bestMatch) {
    if (bestMatch.source === "searchbox") {
      const retrievedFeature = await retrieveSearchBoxSuggestion(bestMatch.mapboxId, sessionToken);
      const selected = retrievedFeature ? normalizeRetrievedSearchBoxFeature(retrievedFeature, bestMatch) : bestMatch;
      if (selected.longitude != null && selected.latitude != null) {
        return {
          longitude: selected.longitude,
          latitude: selected.latitude,
          label: selected.label
        };
      }
    }

    if (bestMatch.longitude != null && bestMatch.latitude != null) {
      return {
        longitude: bestMatch.longitude,
        latitude: bestMatch.latitude,
        label: bestMatch.label
      };
    }
  }

  const params = new URLSearchParams({
    access_token: mapboxToken,
    country: "IN",
    limit: "1",
    proximity: "77.5946,12.9716",
    types: "place,locality,neighborhood,address,poi"
  });
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Could not reach Mapbox for this locality.");
  }

  const data = await response.json();
  const center = data.features?.[0]?.center;
  if (!center) return null;

  return {
    longitude: center[0],
    latitude: center[1],
    label: data.features[0].place_name
  };
}

async function fetchMapboxSuggestions(query, options = {}) {
  if (!mapboxToken || !query?.trim()) return [];

  const params = new URLSearchParams({
    access_token: mapboxToken,
    autocomplete: "true",
    country: "IN",
    limit: "5",
    proximity: "77.5946,12.9716",
    ...options
  });
  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`);

  if (!response.ok) return [];

  const data = await response.json();
  return data.features ?? [];
}

async function fetchSearchBoxSuggestions(query, sessionToken) {
  if (!mapboxToken || !query?.trim()) return [];

  const params = new URLSearchParams({
    access_token: mapboxToken,
    country: "IN",
    language: "en",
    limit: "7",
    proximity: "77.5946,12.9716",
    session_token: sessionToken
  });
  const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&${params.toString()}`);

  if (!response.ok) return [];

  const data = await response.json();
  return data.suggestions ?? [];
}

async function retrieveSearchBoxSuggestion(mapboxId, sessionToken) {
  if (!mapboxToken || !mapboxId) return null;

  const params = new URLSearchParams({
    access_token: mapboxToken,
    session_token: sessionToken
  });
  const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}?${params.toString()}`);

  if (!response.ok) return null;

  const data = await response.json();
  return data.features?.[0] ?? null;
}

async function fetchLocalitySuggestions(query, propertyForm, sessionToken) {
  if (!query?.trim()) return [];

  const contextualQuery = [query, propertyForm.city, propertyForm.state].filter(Boolean).join(", ");
  const shouldUseContext = contextualQuery.toLowerCase() !== query.toLowerCase();
  const [rawSearchBoxSuggestions, contextualSearchBoxSuggestions, rawGeocodingSuggestions, contextualGeocodingSuggestions] = await Promise.all([
    fetchSearchBoxSuggestions(query, sessionToken),
    shouldUseContext ? fetchSearchBoxSuggestions(contextualQuery, sessionToken) : Promise.resolve([]),
    fetchMapboxSuggestions(query, { types: "address,poi,neighborhood,locality,place,district" }),
    shouldUseContext ? fetchMapboxSuggestions(contextualQuery, { types: "address,poi,neighborhood,locality,place,district" }) : Promise.resolve([])
  ]);

  const suggestions = [
    ...rawSearchBoxSuggestions.map(normalizeSearchBoxSuggestion),
    ...rawGeocodingSuggestions.map(normalizeGeocodingSuggestion),
    ...contextualSearchBoxSuggestions.map(normalizeSearchBoxSuggestion),
    ...contextualGeocodingSuggestions.map(normalizeGeocodingSuggestion)
  ];

  return dedupeSuggestions(rankLocalitySuggestions(suggestions, query, propertyForm));
}

function dedupeSuggestions(suggestions) {
  const seen = new Set();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.text}|${suggestion.label}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function rankLocalitySuggestions(suggestions, query, propertyForm) {
  return suggestions
    .map((suggestion) => ({
      ...suggestion,
      score: getLocalitySuggestionScore(suggestion, query, propertyForm)
    }))
    .sort((a, b) => b.score - a.score);
}

function getLocalitySuggestionScore(suggestion, query, propertyForm) {
  const haystack = `${suggestion.text} ${suggestion.label}`.toLowerCase();
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  const tokenScore = tokens.reduce((score, token) => score + (haystack.includes(token) ? 10 : 0), 0);
  const cityScore = propertyForm.city && haystack.includes(propertyForm.city.toLowerCase()) ? 12 : 0;
  const stateScore = propertyForm.state && haystack.includes(propertyForm.state.toLowerCase()) ? 8 : 0;
  const pinScore = suggestion.longitude != null && suggestion.latitude != null ? 6 : 0;
  const nameStartsScore = tokens.some((token) => suggestion.text.toLowerCase().startsWith(token)) ? 5 : 0;

  return tokenScore + cityScore + stateScore + pinScore + nameStartsScore;
}

function normalizeSearchBoxSuggestion(suggestion) {
  return {
    id: suggestion.mapbox_id || `${suggestion.name}-${suggestion.place_formatted}`,
    source: "searchbox",
    mapboxId: suggestion.mapbox_id,
    text: suggestion.name || suggestion.text || "Mapbox result",
    label: suggestion.full_address || suggestion.place_formatted || suggestion.name || "",
    city: getSearchBoxContext(suggestion, "place"),
    state: getSearchBoxContext(suggestion, "region")
  };
}

function normalizeGeocodingSuggestion(feature) {
  const center = feature.center || [];
  return {
    id: feature.id,
    source: "geocoding",
    text: feature.text || "Mapbox result",
    label: getMapboxPlaceLabel(feature),
    city: getMapboxContext(feature, "place"),
    state: getMapboxContext(feature, "region"),
    longitude: center[0],
    latitude: center[1]
  };
}

function getMapboxContext(feature, contextType) {
  const context = feature.context?.find((item) => item.id?.startsWith(`${contextType}.`));
  return context?.text || "";
}

function getMapboxPlaceLabel(feature) {
  return feature.place_name || feature.text || "";
}

function getSearchBoxContext(suggestion, contextType) {
  const context = suggestion.context?.[contextType];
  return context?.name || context?.text || "";
}

function normalizeRetrievedSearchBoxFeature(feature, fallbackSuggestion) {
  const properties = feature?.properties || {};
  const coordinates = properties.coordinates || {};
  const geometryCoordinates = feature?.geometry?.coordinates || [];
  const context = properties.context || {};

  return {
    text: properties.name || fallbackSuggestion.text,
    label: properties.full_address || properties.place_formatted || fallbackSuggestion.label,
    city: context.place?.name || context.locality?.name || fallbackSuggestion.city,
    state: context.region?.name || fallbackSuggestion.state,
    longitude: coordinates.longitude ?? geometryCoordinates[0],
    latitude: coordinates.latitude ?? geometryCoordinates[1]
  };
}

function getInitialPage() {
  const hashPage = window.location.hash.replace("#", "");
  return validPages.has(hashPage) ? hashPage : "home";
}

function setHash(hash) {
  if (window.location.hash === hash) return;
  window.history.pushState(null, "", hash);
}

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [page, setPage] = useState(getInitialPage);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [visitRequests, setVisitRequests] = useState([]);
  const [priorityRequests, setPriorityRequests] = useState([]);
  const [inventory, setInventory] = useState(properties);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [locality, setLocality] = useState("All");
  const [bhk, setBhk] = useState("All");
  const [maxRent, setMaxRent] = useState(50000);
  const [propertyType, setPropertyType] = useState("All");
  const [amenity, setAmenity] = useState("All");
  const [mappedOnly, setMappedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");
  const [saved, setSaved] = useState(() => new Set());
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [urgentFeedback, setUrgentFeedback] = useState("");
  const [urgentError, setUrgentError] = useState("");
  const [priorityFormOpen, setPriorityFormOpen] = useState(false);
  const [howModalOpen, setHowModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const canManageProperties = ["partner", "admin"].includes(profile?.role);

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let isActive = true;

    async function loadInventory() {
      setInventoryLoading(true);
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, locality, locality_tag, city, state, bhk, rent, deposit, area, type, status, image_url, features, description, latitude, longitude, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!isActive) return;
      setInventoryLoading(false);

      if (error) {
        notify(error.message);
        return;
      }

      let rows = data ?? [];
      const propertyIds = rows.map((property) => property.id);
      if (propertyIds.length) {
        const imageResult = await supabase
          .from("property_images")
          .select("id, property_id, image_url, alt_text, sort_order")
          .in("property_id", propertyIds)
          .order("sort_order", { ascending: true });

        if (!imageResult.error) {
          const imagesByProperty = new Map();
          (imageResult.data ?? []).forEach((image) => {
            const current = imagesByProperty.get(image.property_id) || [];
            current.push(image);
            imagesByProperty.set(image.property_id, current);
          });
          rows = rows.map((property) => ({
            ...property,
            property_images: imagesByProperty.get(property.id) || []
          }));
        }
      }

      const normalized = rows.map(normalizePropertyRow);

      setInventory(normalized);
    }

    loadInventory();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    function syncPageFromHash() {
      const hashPage = window.location.hash.replace("#", "");
      if (validPages.has(hashPage)) {
        setPage(hashPage);
      } else if (["properties", "how", "urgent"].includes(hashPage)) {
        setPage("home");
      } else if (!hashPage) {
        setPage("home");
      }
    }

    window.addEventListener("hashchange", syncPageFromHash);
    return () => window.removeEventListener("hashchange", syncPageFromHash);
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!supabase || !session?.user?.id) {
      setSaved(new Set());
      setProfile(null);
      setVisitRequests([]);
      setPriorityRequests([]);
      if (page !== "home") {
        setPage("home");
        window.history.replaceState(null, "", "#home");
      }
      return;
    }

    let isActive = true;

    async function loadAccountData() {
      setProfileLoading(true);
      const [savedResult, profileResult, visitResult, priorityResult] = await Promise.all([
        supabase
          .from("saved_properties")
          .select("property_id")
          .eq("user_id", session.user.id),
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, city, state, role")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase
          .from("visit_requests")
          .select("id, property_id, property_title, status, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("urgent_help_requests")
          .select("id, preferred_locality, move_by, status, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
      ]);

      if (!isActive) return;

      setProfileLoading(false);

      const firstError = savedResult.error || profileResult.error || visitResult.error || priorityResult.error;
      if (firstError) notify(firstError.message);

      setSaved(new Set((savedResult.data ?? []).map((row) => row.property_id)));
      setProfile(profileResult.data ?? {
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "",
        email: session.user.email || "",
        phone: "",
        city: "",
        state: "",
        role: "user"
      });
      setVisitRequests(visitResult.data ?? []);
      setPriorityRequests(priorityResult.data ?? []);
    }

    loadAccountData();

    return () => {
      setProfileLoading(false);
      isActive = false;
    };
  }, [authReady, session?.user?.id]);

  const localities = useMemo(() => ["All", ...new Set(inventory.map((item) => item.localityTag || item.locality).filter(Boolean))], [inventory]);
  const propertyTypes = useMemo(() => ["All", ...new Set(inventory.map((item) => item.type).filter(Boolean))], [inventory]);
  const amenities = useMemo(() => {
    const allFeatures = inventory.flatMap((item) => item.features || []).filter(Boolean);
    return ["All", ...new Set(allFeatures)];
  }, [inventory]);

  const results = useMemo(() => {
    const searchTerms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = inventory.filter((item) => {
      const haystack = [
        item.title,
        item.locality,
        item.localityTag,
        item.city,
        item.state,
        item.bhk,
        item.type,
        item.status,
        item.description,
        ...(item.features || [])
      ].join(" ").toLowerCase();
      const matchesSearch = searchTerms.every((term) => haystack.includes(term));
      const matchesLocality = locality === "All" || (item.localityTag || item.locality) === locality;
      const matchesBhk = bhk === "All" || item.bhk === bhk;
      const matchesType = propertyType === "All" || item.type === propertyType;
      const matchesAmenity = amenity === "All" || item.features.includes(amenity);
      const hasMapPin = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
      return matchesSearch && matchesLocality && matchesBhk && matchesType && matchesAmenity && item.rent <= maxRent && (!mappedOnly || hasMapPin);
    });

    return filtered.sort((a, b) => {
      if (sortBy === "rent-low") return a.rent - b.rent;
      if (sortBy === "rent-high") return b.rent - a.rent;
      if (sortBy === "area-high") return Number(b.area || 0) - Number(a.area || 0);
      if (sortBy === "deposit-low") return Number(a.deposit || 0) - Number(b.deposit || 0);
      return getPropertyScore(b) - getPropertyScore(a);
    });
  }, [amenity, bhk, inventory, locality, mappedOnly, maxRent, propertyType, search, sortBy]);

  function clearPropertyFilters() {
    setSearch("");
    setLocality("All");
    setBhk("All");
    setMaxRent(50000);
    setPropertyType("All");
    setAmenity("All");
    setMappedOnly(false);
    setSortBy("recommended");
  }

  const savedProperties = useMemo(() => {
    return inventory.filter((property) => saved.has(property.id));
  }, [inventory, saved]);

  function notify(message, duration = 2400) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), duration);
  }

  async function toggleSaved(id) {
    if (!supabase) {
      notify("Supabase is not configured.");
      return;
    }

    if (!session?.user?.id) {
      setAuthOpen(true);
      notify("Login to save properties.");
      return;
    }

    if (saved.has(id)) {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("user_id", session.user.id)
        .eq("property_id", id);

      if (error) {
        notify(error.message);
        return;
      }

      setSaved((current) => {
        const next = new Set(current);
        next.delete(id);
        if (!next.size) setPage("home");
        return next;
      });
      notify("Removed from shortlist.");
      return;
    }

    const { error } = await supabase
      .from("saved_properties")
      .insert({ user_id: session.user.id, property_id: id });

    if (error) {
      notify(error.message);
      return;
    }

    setSaved((current) => new Set(current).add(id));
    notify("Added to shortlist.");
  }

  function openSavedPage() {
    if (!session?.user?.id) {
      setAuthOpen(true);
      notify("Login to view saved properties.");
      return;
    }
    setPage("saved");
    setHash("#saved");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openAccountPage() {
    if (!session?.user?.id) {
      setAuthOpen(true);
      notify("Login to view your account.");
      return;
    }
    setPage("account");
    setHash("#account");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openManagePage() {
    if (!session?.user?.id) {
      setAuthOpen(true);
      notify("Login to manage properties.");
      return;
    }
    if (!canManageProperties) {
      notify("Property management is limited to partner and admin accounts.");
      return;
    }
    setPage("manage");
    setHash("#manage");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

function openHome(sectionId) {
    setPage("home");
    setHash(sectionId ? `#${sectionId}` : "#home");
    window.setTimeout(() => {
      if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 0);
  }

  async function submitUrgentRequest(event) {
    event.preventDefault();
    setUrgentFeedback("Priority support request sent. We will follow up shortly.");
    setUrgentError("");
    if (!supabase) {
      const message = "Supabase is not configured.";
      setUrgentError(message);
      notify(message);
      return false;
    }

    if (!session?.user?.id) {
      setAuthOpen(true);
      const message = "Login to send an urgent request.";
      setUrgentError(message);
      notify(message);
      return false;
    }

    const formData = new FormData(event.currentTarget);
    const { error } = await supabase.from("urgent_help_requests").insert({
      user_id: session.user.id,
      name: formData.get("name"),
      phone: formData.get("phone"),
      preferred_locality: formData.get("preferred_locality"),
      move_by: formData.get("move_by") || null,
      notes: formData.get("notes")
    });

    if (error) {
      setUrgentError(error.message);
      notify(error.message);
      return false;
    }

    event.currentTarget.reset();
    notify("Priority support request sent.", 6000);
    return true;
  }

  async function saveProfile(nextProfile) {
    if (!supabase || !session?.user?.id) {
      notify("Login to update your profile.");
      return false;
    }

    const payload = {
      id: session.user.id,
      full_name: nextProfile.full_name || null,
      email: nextProfile.email || session.user.email || null,
      phone: nextProfile.phone || null,
      city: nextProfile.city || null,
      state: nextProfile.state || null
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload)
      .select("id, full_name, email, phone, city, state, role")
      .single();

    if (error) {
      notify(error.message);
      return false;
    }

    setProfile(data);
    notify("Profile updated.");
    return true;
  }

  async function deletePriorityRequest(id) {
    if (!supabase || !session?.user?.id) {
      notify("Login to delete priority requests.");
      return;
    }

    const { error } = await supabase
      .from("urgent_help_requests")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      notify(error.message);
      return;
    }

    setPriorityRequests((current) => current.filter((request) => request.id !== id));
    notify("Priority request deleted.");
  }

  function viewRequestProperty(propertyId) {
    const property = inventory.find((item) => item.id === propertyId);
    if (!property) {
      notify("This property is no longer available.");
      return;
    }
    setSelectedProperty(property);
  }

  async function deleteVisitRequest(id) {
    if (!supabase || !session?.user?.id) {
      notify("Login to delete visit requests.");
      return;
    }

    const { error } = await supabase
      .from("visit_requests")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      notify(error.message);
      return;
    }

    setVisitRequests((current) => current.filter((request) => request.id !== id));
    notify("Visit request deleted.");
  }

  async function saveManagedProperty(propertyForm) {
    if (!supabase || !session?.user?.id || !canManageProperties) {
      notify("You do not have permission to manage properties.");
      return false;
    }

    const propertyId = propertyForm.id.trim();
    const propertyTitle = propertyForm.title.trim();
    const propertyLocality = propertyForm.locality.trim();
    const propertyCity = propertyForm.city.trim();
    const rent = Number(propertyForm.rent);

    if (!propertyId || !propertyTitle || !propertyLocality || !propertyCity || !propertyForm.bhk || !rent) {
      notify("Fill required property fields.");
      return false;
    }

    const hasManualCoordinates = propertyForm.latitude !== "" && propertyForm.longitude !== "";
    let latitude = hasManualCoordinates ? Number(propertyForm.latitude) : null;
    let longitude = hasManualCoordinates ? Number(propertyForm.longitude) : null;
    let geocodedFromLocality = false;

    if (!hasManualCoordinates) {
      try {
        const geocodedLocation = await geocodePropertyLocation(propertyForm);
        if (geocodedLocation) {
          latitude = geocodedLocation.latitude;
          longitude = geocodedLocation.longitude;
          geocodedFromLocality = true;
        }
      } catch (error) {
        notify(error.message);
      }
    }

    const imageRows = [];
    try {
      for (const [index, image] of (propertyForm.images || []).entries()) {
        let nextImageUrl = image.image_url?.trim() || "";
        if (image.image_file) {
          nextImageUrl = await uploadPropertyImage(image.image_file, `${propertyId}-${index + 1}`, session.user.id);
        }

        if (nextImageUrl) {
          imageRows.push({
            property_id: propertyId,
            image_url: nextImageUrl,
            alt_text: image.alt_text?.trim() || null,
            sort_order: index
          });
        }
      }
    } catch (error) {
      notify(error.message);
      return false;
    }

    const imageUrl = imageRows[0]?.image_url || null;

    const payload = {
      id: propertyId,
      title: propertyTitle,
      locality: propertyLocality,
      locality_tag: propertyForm.locality_tag.trim() || null,
      city: propertyCity,
      state: propertyForm.state.trim() || null,
      bhk: propertyForm.bhk,
      rent,
      deposit: Number(propertyForm.deposit || 0),
      area: propertyForm.area ? Number(propertyForm.area) : null,
      type: propertyForm.type.trim() || null,
      status: propertyForm.status.trim() || "Ready",
      image_url: imageUrl,
      features: propertyForm.features
        .split(",")
        .map((feature) => feature.trim())
        .filter(Boolean),
      description: propertyForm.description.trim() || null,
      latitude,
      longitude,
      is_active: propertyForm.is_active,
      created_by: session.user.id
    };

    const { data, error } = await supabase
      .from("properties")
      .upsert(payload)
      .select("id, title, locality, locality_tag, city, state, bhk, rent, deposit, area, type, status, image_url, features, description, latitude, longitude, is_active")
      .single();

    if (error) {
      notify(error.message);
      return false;
    }

    const deleteImagesResult = await supabase
      .from("property_images")
      .delete()
      .eq("property_id", propertyId);

    if (deleteImagesResult.error) {
      notify(deleteImagesResult.error.message);
      return false;
    }

    if (imageRows.length) {
      const insertImagesResult = await supabase
        .from("property_images")
        .insert(imageRows);

      if (insertImagesResult.error) {
        notify(insertImagesResult.error.message);
        return false;
      }
    }

    const normalized = normalizePropertyRow({
      ...data,
      property_images: imageRows
    });
    setInventory((current) => {
      const withoutCurrent = current.filter((property) => property.id !== normalized.id);
      return normalized.is_active ? [normalized, ...withoutCurrent] : withoutCurrent;
    });
    notify(geocodedFromLocality ? "Property saved with map pin from locality." : "Property saved.");
    return true;
  }

  async function deactivateManagedProperty(id) {
    if (!supabase || !session?.user?.id || !canManageProperties) {
      notify("You do not have permission to manage properties.");
      return;
    }

    const { error } = await supabase
      .from("properties")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      notify(error.message);
      return;
    }

    setInventory((current) => current.filter((property) => property.id !== id));
    notify("Property deactivated.");
  }

  async function requestVisit(property) {
    if (!supabase) {
      notify("Supabase is not configured.");
      return;
    }

    if (!session?.user?.id) {
      setAuthOpen(true);
      notify("Login to request a visit.");
      return;
    }

    const { error } = await supabase.from("visit_requests").insert({
      user_id: session.user.id,
      property_id: property.id,
      property_title: property.title,
      message: `Requested from ${property.locality} listing.`
    });

    if (error) {
      notify(error.message);
      return;
    }

    notify("Visit request captured.");
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      notify(error.message);
      return;
    }
    setAuthOpen(false);
    setPage("home");
    notify("Signed out.");
  }

  const userLabel = session?.user?.user_metadata?.full_name || session?.user?.email || "Account";

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">Budget Properties</div>
          <nav className="nav" aria-label="Primary navigation">
            <div className="nav-main">
              <button className={page === "home" ? "active mobile-keep" : "mobile-keep"} onClick={() => openHome("properties")}>Properties</button>
              <button onClick={() => setHowModalOpen(true)}>How it works</button>
              <button onClick={() => openHome("urgent")}>Urgent help</button>
              <button className={page === "saved" ? "active" : ""} onClick={openSavedPage}>Saved <span className="nav-count">{saved.size}</span></button>
              {canManageProperties && <button className={page === "manage" ? "active" : ""} onClick={openManagePage}>Manage</button>}
            </div>
            {session ? (
              <div className="nav-account">
                <button className={`account-nav-btn ${page === "account" ? "active" : ""}`} onClick={openAccountPage}>
                  <span className="nav-label-full">Account</span>
                  <span className="nav-label-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
                    </svg>
                  </span>
                  <span className="sr-only">Account</span>
                  {!profile?.phone && <span className="nav-badge">!</span>}
                </button>
                <button className="signout-btn" onClick={signOut}>
                  <span className="nav-label-full">{userLabel} - Sign out</span>
                  <span className="nav-label-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M10 6H6v12h4" />
                      <path d="M13 12h8" />
                      <path d="m17 8 4 4-4 4" />
                    </svg>
                  </span>
                  <span className="sr-only">Sign out</span>
                </button>
              </div>
            ) : (
              <div className="nav-account">
                <button className="login-btn" onClick={() => setAuthOpen(true)}>Login</button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main>
        {page === "home" ? (
          <>
            <Hero />
            <section className="section" id="properties">
              <div className="container">
                <p className="eyebrow">Inventory</p>
                <h2 className="section-title">Browse available homes.</h2>

                <PropertyFilters
                  search={search}
                  setSearch={setSearch}
                  locality={locality}
                  setLocality={setLocality}
                  localities={localities}
                  bhk={bhk}
                  setBhk={setBhk}
                  maxRent={maxRent}
                  setMaxRent={setMaxRent}
                  propertyType={propertyType}
                  setPropertyType={setPropertyType}
                  propertyTypes={propertyTypes}
                  amenity={amenity}
                  setAmenity={setAmenity}
                  amenities={amenities}
                  mappedOnly={mappedOnly}
                  setMappedOnly={setMappedOnly}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  count={results.length}
                  onClear={clearPropertyFilters}
                />

                <SplitPropertyExplorer
                  propertiesToShow={results}
                  saved={saved}
                  onSave={toggleSaved}
                  onDetails={setSelectedProperty}
                  onVisit={requestVisit}
                  emptyText={inventoryLoading ? "Loading properties..." : "No homes match these filters. Increase the budget or clear a filter."}
                />
              </div>
            </section>

            <HowItWorks />
            <UrgentHelp onOpen={() => {
              setUrgentFeedback("");
              setUrgentError("");
              setPriorityFormOpen(true);
            }} />
          </>
        ) : page === "saved" ? (
          <SavedPropertiesPage
            propertiesToShow={savedProperties}
            saved={saved}
            onBack={() => openHome("properties")}
            onSave={toggleSaved}
            onDetails={setSelectedProperty}
            onVisit={requestVisit}
          />
        ) : page === "manage" && canManageProperties ? (
          <ManagePropertiesPage
            propertiesToShow={inventory}
            onSaveProperty={saveManagedProperty}
            onDeactivateProperty={deactivateManagedProperty}
          />
        ) : (
          <AccountPage
            profile={profile}
            loading={profileLoading}
            visitRequests={visitRequests}
            priorityRequests={priorityRequests}
            onSaveProfile={saveProfile}
            onDeletePriorityRequest={deletePriorityRequest}
            onViewVisitProperty={viewRequestProperty}
            onDeleteVisitRequest={deleteVisitRequest}
          />
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <strong>Budget Properties</strong>
          <span>Rental search interface inspired by Denner-style workflows.</span>
        </div>
      </footer>

      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          saved={saved.has(selectedProperty.id)}
          onClose={() => setSelectedProperty(null)}
          onSave={() => toggleSaved(selectedProperty.id)}
          onVisit={() => requestVisit(selectedProperty)}
        />
      )}

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onNotify={notify}
        />
      )}

      {priorityFormOpen && (
        <PriorityRequestModal
          onClose={() => {
            setPriorityFormOpen(false);
            setUrgentFeedback("");
            setUrgentError("");
          }}
          onSubmit={submitUrgentRequest}
          feedback={urgentFeedback}
          error={urgentError}
        />
      )}

      {howModalOpen && (
        <HowItWorksModal onClose={() => setHowModalOpen(false)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function PriorityRequestModal({ onClose, onSubmit, feedback, error }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="priority-modal" role="dialog" aria-modal="true" aria-label="Priority support request" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <strong>Priority support</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="priority-modal-body">
          {feedback ? (
            <div className="priority-success-state" role="status" aria-live="polite">
              <div className="success-mark">✓</div>
              <h2>Request sent</h2>
              <p>{feedback || "Priority support request sent. We will follow up shortly."}</p>
              <button className="button primary full" onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <p className="eyebrow">Fast-track request</p>
              <h2>Tell us what you need.</h2>
              <p className="property-meta">Share the essentials and we will prioritize matching homes for your timeline.</p>
              <PriorityRequestForm onSubmit={onSubmit} error={error} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HowItWorksModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="simple-modal" role="dialog" aria-modal="true" aria-label="How it works" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <strong>How it works</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="simple-modal-body">
          <p className="eyebrow">Process</p>
          <h2>Simple rental workflow.</h2>
          <div className="steps-list">
            <div><strong>1</strong><span>Browse verified budget homes.</span></div>
            <div><strong>2</strong><span>Save properties you like.</span></div>
            <div><strong>3</strong><span>Request visits or priority support.</span></div>
          </div>
          <button className="button primary full" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ onClose, onNotify }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState("");

  async function continueWithGoogle() {
    if (!isSupabaseConfigured) {
      onNotify("Add Supabase env vars before using login.");
      return;
    }

    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      onNotify(error.message);
      setLoading("");
    }
  }

  async function sendEmailLink(event) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      onNotify("Add Supabase env vars before using login.");
      return;
    }

    setLoading("email");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      onNotify(error.message);
    } else {
      onNotify("Login link sent. Check your email.");
      onClose();
    }
    setLoading("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Login" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <strong>Login</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="auth-body">
          <p className="eyebrow">Account access</p>
          <h2>Continue to Budget Properties.</h2>
          <p className="property-meta">Use Google for the fastest login, or get a secure email link.</p>

          {!isSupabaseConfigured && (
            <div className="setup-warning">
              Supabase is not configured yet. Add your URL and anon key to <strong>.env.local</strong>.
            </div>
          )}

          <button className="button primary full" onClick={continueWithGoogle} disabled={loading === "google"}>
            {loading === "google" ? "Opening Google..." : "Continue with Google"}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form className="auth-form" onSubmit={sendEmailLink}>
            <label className="field">
              <span>Email address</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            <button className="button ghost full" type="submit" disabled={loading === "email"}>
              {loading === "email" ? "Sending..." : "Send email login link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <p className="eyebrow">Verified rental search</p>
          <h1>Find budget homes without the <em>broker chaos.</em></h1>
          <p className="hero-copy">Browse rent-ready properties, shortlist the ones that fit, and request visits with a lightweight renter workflow.</p>
          <div className="hero-actions">
            <a className="button primary" href="#properties">Browse properties</a>
            <a className="button ghost" href="#urgent">Need a place fast?</a>
          </div>
        </div>
        <div className="hero-media">
          <img src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80" alt="Modern apartment living room" />
          <div className="stat-row">
            <div className="stat"><strong>{properties.length}</strong><span>Live homes</span></div>
            <div className="stat"><strong>Rs 9.8k</strong><span>Starting rent</span></div>
            <div className="stat"><strong>3</strong><span>Visit steps</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PropertyFilters({
  search,
  setSearch,
  locality,
  setLocality,
  localities,
  bhk,
  setBhk,
  maxRent,
  setMaxRent,
  propertyType,
  setPropertyType,
  propertyTypes,
  amenity,
  setAmenity,
  amenities,
  mappedOnly,
  setMappedOnly,
  sortBy,
  setSortBy,
  count,
  onClear
}) {
  return (
    <div className="controls">
      <div className="controls-top">
        <label className="search">
          <span>Where</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Indiranagar metro furnished" autoComplete="off" />
        </label>
        <div className="filter-summary">
          <span className="count-pill">{count} matches</span>
          <button className="button ghost filter-clear" type="button" onClick={onClear}>Reset</button>
        </div>
      </div>

      <div className="select-grid">
        <label className="field">
          <span>Locality</span>
          <select value={locality} onChange={(event) => setLocality(event.target.value)}>
            {localities.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Layout</span>
          <select value={bhk} onChange={(event) => setBhk(event.target.value)}>
            {bhks.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Type</span>
          <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)}>
            {propertyTypes.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Amenity</span>
          <select value={amenity} onChange={(event) => setAmenity(event.target.value)}>
            {amenities.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Max rent</span>
          <input type="number" min="8000" max="60000" step="1000" value={maxRent} onChange={(event) => setMaxRent(Number(event.target.value))} />
        </label>
      </div>

      <div className="filter-row">
        <button className={`chip ${mappedOnly ? "active" : ""}`} type="button" onClick={() => setMappedOnly(!mappedOnly)}>
          Map pins only
        </button>
        {localities.filter((value) => value !== "All").slice(0, 5).map((value) => (
          <button className={`chip ${locality === value ? "active" : ""}`} type="button" key={value} onClick={() => setLocality(locality === value ? "All" : value)}>
            {value}
          </button>
        ))}
      </div>

      <div className="range-card">
        <div className="range-head">
          <div>
            <strong>Budget range</strong>
            <p className="property-meta">Adjust the ceiling to filter affordable homes.</p>
          </div>
          <div className="range-values"><span>Up to {money(maxRent)}</span></div>
        </div>
        <input type="range" min="8000" max="60000" step="1000" value={maxRent} onChange={(event) => setMaxRent(Number(event.target.value))} />
      </div>
    </div>
  );
}

function PropertyGrid({ propertiesToShow, saved, onSave, onDetails, onVisit, emptyText, activeId, onHover }) {
  return (
    <div className={propertiesToShow.length ? "properties-grid" : ""}>
      {propertiesToShow.length ? (
        propertiesToShow.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            saved={saved.has(property.id)}
            onSave={() => onSave(property.id)}
            onDetails={() => onDetails(property)}
            onVisit={() => onVisit(property)}
            isActive={activeId === property.id}
            onHover={() => onHover?.(property)}
          />
        ))
      ) : (
        <div className="empty">{emptyText}</div>
      )}
    </div>
  );
}

function SplitPropertyExplorer({ propertiesToShow, saved, onSave, onDetails, onVisit, emptyText }) {
  const [activeId, setActiveId] = useState(null);
  const [mobileView, setMobileView] = useState("list");

  function setActiveProperty(property) {
    setActiveId(property.id);
  }

  return (
    <div className={`split-explorer mobile-${mobileView}`}>
      <div className="split-view-toggle" aria-label="Listing view mode">
        <button className={mobileView === "list" ? "active" : ""} onClick={() => setMobileView("list")}>List</button>
        <button className={mobileView === "map" ? "active" : ""} onClick={() => setMobileView("map")}>Map</button>
      </div>
      <div className="split-list-panel">
        <div className="split-list-head">
          <strong>{propertiesToShow.length} homes</strong>
          <span>{propertiesWithCoordinates(propertiesToShow).length} mapped</span>
        </div>
        <PropertyGrid
          propertiesToShow={propertiesToShow}
          saved={saved}
          onSave={onSave}
          onDetails={onDetails}
          onVisit={onVisit}
          emptyText={emptyText}
          activeId={activeId}
          onHover={setActiveProperty}
        />
      </div>
      <PropertyMapPanel
        propertiesToShow={propertiesToShow}
        activeId={activeId}
        onPinSelect={(property) => {
          setActiveId(property.id);
          onDetails(property);
        }}
      />
    </div>
  );
}

function propertiesWithCoordinates(propertiesToShow) {
  return propertiesToShow.filter((property) => Number.isFinite(Number(property.latitude)) && Number.isFinite(Number(property.longitude)));
}

function PropertyMapPanel({ propertiesToShow, activeId, onPinSelect }) {
  const mappedProperties = propertiesWithCoordinates(propertiesToShow);
  const bounds = getCoordinateBounds(mappedProperties);

  return (
    <aside className="map-panel" aria-label="Property map">
      <div className="map-toolbar">
        <strong>{mapboxToken ? "Map" : "Map preview"}</strong>
        <span>{mappedProperties.length ? `${mappedProperties.length} mapped` : "Add coordinates in Manage"}</span>
      </div>
      {mapboxToken ? (
        <MapboxPropertyMap mappedProperties={mappedProperties} activeId={activeId} onPinSelect={onPinSelect} />
      ) : (
        <PreviewPropertyMap mappedProperties={mappedProperties} bounds={bounds} activeId={activeId} onPinSelect={onPinSelect} />
      )}
    </aside>
  );
}

function MapboxPropertyMap({ mappedProperties, activeId, onPinSelect }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxModuleRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainerRef.current || mapRef.current) return;
      const mapboxModule = await import("mapbox-gl");
      if (cancelled || !mapContainerRef.current) return;

      const mapboxgl = mapboxModule.default;
      mapboxModuleRef.current = mapboxgl;
      mapboxgl.accessToken = mapboxToken;
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [77.5946, 12.9716],
        zoom: 11,
        attributionControl: false
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      setMapReady(true);
    }

    initMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxModuleRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const mapboxgl = mapboxModuleRef.current;
    if (!mapReady || !mapRef.current || !mapboxgl) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    mappedProperties.forEach((property) => {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `mapbox-price-marker ${activeId === property.id ? "active" : ""}`;
      markerElement.textContent = formatShortRent(property.rent);
      markerElement.addEventListener("click", () => onPinSelect(property));

      const marker = new mapboxgl.Marker({ element: markerElement, anchor: "center" })
        .setLngLat([Number(property.longitude), Number(property.latitude)])
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });

    if (mappedProperties.length) {
      const bounds = new mapboxgl.LngLatBounds();
      mappedProperties.forEach((property) => {
        bounds.extend([Number(property.longitude), Number(property.latitude)]);
      });
      mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 500 });
    }
  }, [activeId, mapReady, mappedProperties, onPinSelect]);

  return (
    <div className="mapbox-canvas" ref={mapContainerRef}>
      {!mappedProperties.length && (
        <div className="map-empty map-empty-overlay">
          <strong>No mapped homes yet</strong>
          <span>Add a locality in Manage and use Find map pin.</span>
        </div>
      )}
    </div>
  );
}

function PreviewPropertyMap({ mappedProperties, bounds, activeId, onPinSelect }) {
  return (
    <div className="map-canvas">
      <div className="map-grid-lines" />
      {mappedProperties.map((property) => {
        const position = getPinPosition(property, bounds);
        return (
          <button
            className={`map-price-pin ${activeId === property.id ? "active" : ""}`}
            key={property.id}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => onPinSelect(property)}
            aria-label={`Open ${property.title}`}
          >
            {formatShortRent(property.rent)}
          </button>
        );
      })}
      {!mappedProperties.length && (
        <div className="map-empty">
          <strong>No mapped homes yet</strong>
          <span>Add a locality in Manage and use Find map pin.</span>
        </div>
      )}
    </div>
  );
}

function getCoordinateBounds(mappedProperties) {
  if (!mappedProperties.length) {
    return { minLat: 12.9, maxLat: 13.05, minLng: 77.5, maxLng: 77.75 };
  }

  const latitudes = mappedProperties.map((property) => Number(property.latitude));
  const longitudes = mappedProperties.map((property) => Number(property.longitude));
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPadding = Math.max((maxLat - minLat) * 0.18, 0.01);
  const lngPadding = Math.max((maxLng - minLng) * 0.18, 0.01);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding
  };
}

function getPinPosition(property, bounds) {
  const latitude = Number(property.latitude);
  const longitude = Number(property.longitude);
  const x = ((longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - (latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;

  return {
    x: Math.min(94, Math.max(6, x)),
    y: Math.min(94, Math.max(6, y))
  };
}

function formatShortRent(value) {
  const rent = Number(value);
  if (rent >= 100000) return `Rs ${(rent / 100000).toFixed(1)}L`;
  if (rent >= 1000) return `Rs ${(rent / 1000).toFixed(rent % 1000 === 0 ? 0 : 1)}k`;
  return money(rent);
}

function hasPropertyCoordinates(property) {
  return Number.isFinite(Number(property.latitude)) && Number.isFinite(Number(property.longitude));
}

function formatDepositLabel(value) {
  const deposit = Number(value || 0);
  return deposit ? money(deposit) : "No deposit";
}

function SavedPropertiesPage({ propertiesToShow, saved, onBack, onSave, onDetails, onVisit }) {
  return (
    <section className="page-section">
      <div className="container">
        <div className="page-head">
          <div>
            <p className="eyebrow">Shortlist</p>
            <h1 className="page-title">Your saved properties.</h1>
            <p className="listing-header-sub">Homes you have saved stay here across devices while you are logged in.</p>
          </div>
          <button className="button ghost page-head-cta" onClick={onBack}>Browse more</button>
        </div>

        <PropertyGrid
          propertiesToShow={propertiesToShow}
          saved={saved}
          onSave={onSave}
          onDetails={onDetails}
          onVisit={onVisit}
          emptyText="No saved properties yet. Browse properties and save homes you like."
        />
      </div>
    </section>
  );
}

const emptyPropertyForm = {
  id: "",
  title: "",
  locality: "",
  locality_tag: "",
  city: "Bengaluru",
  state: "Karnataka",
  bhk: "1 BHK",
  rent: "",
  deposit: "",
  area: "",
  type: "Apartment",
  status: "Ready",
  images: [createEmptyImageEntry()],
  features: "",
  description: "",
  latitude: "",
  longitude: "",
  is_active: true
};

function ManagePropertiesPage({ propertiesToShow, onSaveProperty, onDeactivateProperty }) {
  const [form, setForm] = useState(emptyPropertyForm);
  const [saving, setSaving] = useState(false);
  const [imageMessage, setImageMessage] = useState("");
  const [mapPinMessage, setMapPinMessage] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [localitySuggestions, setLocalitySuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState("");
  const [activeSuggestions, setActiveSuggestions] = useState("");
  const [pinEditorOpen, setPinEditorOpen] = useState(false);
  const searchSessionTokenRef = useRef(window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);

  useEffect(() => {
    const query = form.city.trim();
    if (!mapboxToken || query.length < 2) {
      setCitySuggestions([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSuggestionLoading("city");
      const suggestions = await fetchMapboxSuggestions(query, { types: "place,district" });
      setCitySuggestions(suggestions);
      setSuggestionLoading("");
    }, 260);

    return () => window.clearTimeout(timer);
  }, [form.city]);

  useEffect(() => {
    const localityQuery = form.locality.trim();
    if (!mapboxToken || localityQuery.length < 2) {
      setLocalitySuggestions([]);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSuggestionLoading("locality");
      const suggestions = await fetchLocalitySuggestions(localityQuery, form, searchSessionTokenRef.current);
      setLocalitySuggestions(suggestions);
      setSuggestionLoading("");
    }, 260);

    return () => window.clearTimeout(timer);
  }, [form.city, form.locality, form.state]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "locality" || field === "city" || field === "state" ? { latitude: "", longitude: "" } : {})
    }));
    if (["locality", "city", "state"].includes(field)) {
      setMapPinMessage("");
    }
  }

  function updateImageEntry(entryId, changes) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image) => image.id === entryId ? { ...image, ...changes } : image)
    }));
  }

  function chooseImageSource(entryId, nextSource) {
    setImageMessage("");
    setForm((current) => ({
      ...current,
      images: current.images.map((image) => image.id === entryId ? {
        ...image,
        source: nextSource,
        image_file: nextSource === "url" ? null : image.image_file,
        image_url: nextSource === "device" ? "" : image.image_url
      } : image)
    }));
  }

  function updateImageFile(entryId, file) {
    if (!file) {
      updateImageEntry(entryId, { image_file: null });
      setImageMessage("");
      return;
    }

    if (!supportedImageTypes.has(file.type)) {
      setImageMessage("Upload a JPG, PNG, WebP, or GIF image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageMessage("Image must be under 5 MB.");
      return;
    }

    updateImageEntry(entryId, { image_file: file, image_url: "", source: "device" });
    setImageMessage(`${file.name} selected.`);
  }

  function addImageEntry() {
    setForm((current) => ({
      ...current,
      images: [...current.images, createEmptyImageEntry()]
    }));
  }

  function removeImageEntry(entryId) {
    setForm((current) => ({
      ...current,
      images: current.images.length > 1
        ? current.images.filter((image) => image.id !== entryId)
        : [createEmptyImageEntry()]
    }));
  }

  function closeSuggestionsSoon() {
    window.setTimeout(() => setActiveSuggestions(""), 120);
  }

  function selectCitySuggestion(feature) {
    const state = getMapboxContext(feature, "region");
    setForm((current) => ({
      ...current,
      city: feature.text || current.city,
      state: state || current.state,
      latitude: "",
      longitude: ""
    }));
    setMapPinMessage(state ? `State set to ${state}.` : "");
    setActiveSuggestions("");
  }

  async function selectLocalitySuggestion(suggestion) {
    let selected = suggestion;
    if (suggestion.source === "searchbox") {
      setSuggestionLoading("locality");
      const retrievedFeature = await retrieveSearchBoxSuggestion(suggestion.mapboxId, searchSessionTokenRef.current);
      selected = retrievedFeature ? normalizeRetrievedSearchBoxFeature(retrievedFeature, suggestion) : suggestion;
      searchSessionTokenRef.current = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      setSuggestionLoading("");
    }

    setForm((current) => ({
      ...current,
      locality: selected.text || current.locality,
      city: selected.city || current.city,
      state: selected.state || current.state,
      longitude: selected.longitude != null ? String(selected.longitude) : current.longitude,
      latitude: selected.latitude != null ? String(selected.latitude) : current.latitude
    }));
    setMapPinMessage(selected.longitude != null && selected.latitude != null
      ? `Map pin selected: ${selected.label}`
      : `Selected ${selected.label}. Use Find map pin if needed.`
    );
    setActiveSuggestions("");
  }

  function updateMapPin(nextPin) {
    setForm((current) => ({
      ...current,
      latitude: String(nextPin.latitude),
      longitude: String(nextPin.longitude)
    }));
    setMapPinMessage("Map pin adjusted manually.");
  }

  function editProperty(property) {
    setForm({
      id: property.id || "",
      title: property.title || "",
      locality: property.locality || "",
      locality_tag: property.localityTag || "",
      city: property.city || "Bengaluru",
      state: property.state || "Karnataka",
      bhk: property.bhk || "1 BHK",
      rent: property.rent || "",
      deposit: property.deposit || "",
      area: property.area || "",
      type: property.type || "Apartment",
      status: property.status || "Ready",
      images: property.images?.length
        ? property.images.map((image) => ({
          id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
          source: "url",
          image_url: image.image_url,
          image_file: null,
          alt_text: image.alt_text || ""
        }))
        : [{
          ...createEmptyImageEntry(),
          image_url: property.image || "",
          alt_text: property.title || ""
        }],
      features: (property.features || []).join(", "),
      description: property.description || "",
      latitude: property.latitude || "",
      longitude: property.longitude || "",
      is_active: property.is_active !== false
    });
    setImageMessage("");
    setMapPinMessage(hasPropertyCoordinates(property) ? "This listing already has a map pin." : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitProperty(event) {
    event.preventDefault();
    setSaving(true);
    const ok = await onSaveProperty(form);
    setSaving(false);
    if (ok) {
      setForm({ ...emptyPropertyForm, images: [createEmptyImageEntry()] });
      setImageMessage("");
      setMapPinMessage("");
    }
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-head">
          <div>
            <p className="eyebrow">Partner tools</p>
            <h1 className="page-title">Manage properties.</h1>
            <p className="listing-header-sub">Create listings now, with coordinates ready for a map view later.</p>
          </div>
          <button className="button ghost page-head-cta" onClick={() => {
            setForm({ ...emptyPropertyForm, images: [createEmptyImageEntry()] });
            setImageMessage("");
            setMapPinMessage("");
          }}>New property</button>
        </div>

        <div className="manage-grid">
          <form className="account-card manage-form" onSubmit={submitProperty}>
            <div className="section-title-row">
              <div>
                <h3>Listing details</h3>
                <p>Required fields are id, title, locality, city, layout, and rent.</p>
              </div>
            </div>

            <div className="range-inputs">
              <label className="field"><span>Property ID</span><input value={form.id} onChange={(event) => updateField("id", event.target.value)} placeholder="bp-301" required /></label>
              <label className="field"><span>Status</span><input value={form.status} onChange={(event) => updateField("status", event.target.value)} placeholder="Ready" /></label>
            </div>
            <label className="field"><span>Title</span><input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Quiet 2 BHK near Metro" required /></label>
            <div className="range-inputs">
              <label className="field autocomplete-field">
                <span>Locality or society</span>
                <input
                  value={form.locality}
                  onChange={(event) => updateField("locality", event.target.value)}
                  onFocus={() => setActiveSuggestions("locality")}
                  onBlur={closeSuggestionsSoon}
                  placeholder="Prestige Shantiniketan, Indiranagar"
                  autoComplete="off"
                  required
                />
                {activeSuggestions === "locality" && (localitySuggestions.length > 0 || suggestionLoading === "locality") && (
                  <div className="autocomplete-menu">
                    {suggestionLoading === "locality" && <div className="autocomplete-status">Searching places...</div>}
                    {localitySuggestions.map((feature) => (
                      <button type="button" key={feature.id} onMouseDown={() => selectLocalitySuggestion(feature)}>
                        <strong>{feature.text}</strong>
                        <span>{feature.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </label>
              <label className="field autocomplete-field">
                <span>City</span>
                <input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  onFocus={() => setActiveSuggestions("city")}
                  onBlur={closeSuggestionsSoon}
                  placeholder="Bengaluru"
                  autoComplete="off"
                  required
                />
                {activeSuggestions === "city" && (citySuggestions.length > 0 || suggestionLoading === "city") && (
                  <div className="autocomplete-menu">
                    {suggestionLoading === "city" && <div className="autocomplete-status">Searching cities...</div>}
                    {citySuggestions.map((feature) => (
                      <button type="button" key={feature.id} onMouseDown={() => selectCitySuggestion(feature)}>
                        <strong>{feature.text}</strong>
                        <span>{getMapboxPlaceLabel(feature)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </label>
            </div>
            <label className="field">
              <span>Locality tag <em className="field-optional">Optional</em></span>
              <input value={form.locality_tag} onChange={(event) => updateField("locality_tag", event.target.value)} placeholder="Kalyani Nagar, Yerwada, HSR Layout" />
            </label>
            <div className="range-inputs">
              <label className="field"><span>State</span><input value={form.state} onChange={(event) => updateField("state", event.target.value)} placeholder="Karnataka" /></label>
              <label className="field"><span>Layout</span><select value={form.bhk} onChange={(event) => updateField("bhk", event.target.value)}>{bhks.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <MapPinControl
              latitude={form.latitude}
              longitude={form.longitude}
              label={form.locality || form.title || "Selected listing"}
              message={mapPinMessage}
              editorOpen={pinEditorOpen}
              onOpenEditor={() => setPinEditorOpen(true)}
              onCloseEditor={() => setPinEditorOpen(false)}
              onPinChange={updateMapPin}
            />
            <div className="range-inputs">
              <label className="field"><span>Rent</span><input type="number" value={form.rent} onChange={(event) => updateField("rent", event.target.value)} placeholder="25000" required /></label>
              <label className="field"><span>Deposit</span><input type="number" value={form.deposit} onChange={(event) => updateField("deposit", event.target.value)} placeholder="75000" /></label>
            </div>
            <div className="range-inputs">
              <label className="field"><span>Area</span><input type="number" value={form.area} onChange={(event) => updateField("area", event.target.value)} placeholder="850" /></label>
              <label className="field"><span>Type</span><input value={form.type} onChange={(event) => updateField("type", event.target.value)} placeholder="Apartment" /></label>
            </div>
            <div className="image-input-card">
              <div className="section-title-row">
                <div>
                  <h3>Gallery images</h3>
                  <p>The first image becomes the cover. Add labels like Hall, Bedroom 1, Kitchen.</p>
                </div>
                <button className="request-action-btn" type="button" onClick={addImageEntry}>Add image</button>
              </div>
              <div className="image-entry-list">
                {form.images.map((image, index) => (
                  <PropertyImageEditor
                    key={image.id}
                    image={image}
                    index={index}
                    canRemove={form.images.length > 1}
                    onSourceChange={(nextSource) => chooseImageSource(image.id, nextSource)}
                    onUrlChange={(value) => updateImageEntry(image.id, { image_url: value, image_file: null })}
                    onFileChange={(file) => updateImageFile(image.id, file)}
                    onAltChange={(value) => updateImageEntry(image.id, { alt_text: value })}
                    onRemove={() => removeImageEntry(image.id)}
                  />
                ))}
              </div>
              {imageMessage && <p className="image-input-note">{imageMessage}</p>}
            </div>
            <label className="field"><span>Features</span><input value={form.features} onChange={(event) => updateField("features", event.target.value)} placeholder="Furnished, Balcony, Lift" /></label>
            <label className="field"><span>Description</span><textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Short listing description" /></label>
            <button className="button primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save property"}</button>
          </form>

          <div className="account-card manage-list-card">
            <div className="section-title-row">
              <div>
                <h3>Active listings</h3>
                <p>{propertiesToShow.length} properties visible to renters.</p>
              </div>
            </div>
            {propertiesToShow.length ? (
              <div className="manage-list">
                {propertiesToShow.map((property) => (
                  <div className="manage-row" key={property.id}>
                    <div>
                      <strong>{property.title}</strong>
                      <span>{property.locality}, {property.city} - {property.localityTag || "No tag"} - {property.bhk} - {money(property.rent)}</span>
                    </div>
                    <div className="request-row-actions">
                      <button className="request-action-btn" onClick={() => editProperty(property)}>Edit</button>
                      <button className="request-delete-btn" onClick={() => onDeactivateProperty(property.id)}>Deactivate</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty compact-empty">No active properties yet.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PropertyImageEditor({ image, index, canRemove, onSourceChange, onUrlChange, onFileChange, onAltChange, onRemove }) {
  const [filePreview, setFilePreview] = useState("");
  const previewUrl = image.image_file ? filePreview : image.image_url;

  useEffect(() => {
    if (!image.image_file) {
      setFilePreview("");
      return undefined;
    }

    const nextPreview = URL.createObjectURL(image.image_file);
    setFilePreview(nextPreview);
    return () => URL.revokeObjectURL(nextPreview);
  }, [image.image_file]);

  return (
    <div className="image-entry-card">
      <div className="image-entry-head">
        <strong>{index === 0 ? "Cover image" : `Image ${index + 1}`}</strong>
        <button className="request-delete-btn" type="button" onClick={onRemove} disabled={!canRemove}>Remove</button>
      </div>
      <div className="image-source-toggle" aria-label={`Image ${index + 1} source`}>
        <button className={image.source === "url" ? "active" : ""} type="button" onClick={() => onSourceChange("url")}>Image URL</button>
        <button className={image.source === "device" ? "active" : ""} type="button" onClick={() => onSourceChange("device")}>Upload from device</button>
      </div>
      {image.source === "url" ? (
        <label className="field"><span>Image URL</span><input value={image.image_url} onChange={(event) => onUrlChange(event.target.value)} placeholder="https://..." /></label>
      ) : (
        <label className="field file-field">
          <span>Image file</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => onFileChange(event.target.files?.[0])} />
        </label>
      )}
      <label className="field"><span>Alt label</span><input value={image.alt_text} onChange={(event) => onAltChange(event.target.value)} placeholder="Hall, Bedroom 1, Kitchen" /></label>
      <div className="image-preview-box">
        {previewUrl ? (
          <img src={previewUrl} alt={image.alt_text || `Property image ${index + 1}`} />
        ) : (
          <div>
            <strong>No image selected</strong>
            <span>Use a URL or upload JPG, PNG, WebP, or GIF under 5 MB.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MapPinControl({ latitude, longitude, label, message, editorOpen, onOpenEditor, onCloseEditor, onPinChange }) {
  const hasPin = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  return (
    <div className="map-pin-card">
      <div className="manage-map-preview">
        {hasPin && mapboxToken ? (
          <MapPinMap latitude={latitude} longitude={longitude} label={label} />
        ) : (
          <div className="manage-map-empty">
            <strong>No pin selected</strong>
            <span>Choose a locality or society suggestion.</span>
          </div>
        )}
      </div>
      <div className="map-pin-card-copy">
        <strong>{hasPin ? "Map pin ready" : "Map pin preview"}</strong>
        <p>{message || "The selected suggestion will place this listing on the map."}</p>
        <button className="button ghost" type="button" onClick={onOpenEditor} disabled={!hasPin}>
          Adjust pin
        </button>
      </div>

      {editorOpen && hasPin && (
        <MapPinEditorModal
          latitude={latitude}
          longitude={longitude}
          label={label}
          onClose={onCloseEditor}
          onPinChange={onPinChange}
        />
      )}
    </div>
  );
}

function MapPinEditorModal({ latitude, longitude, label, onClose, onPinChange }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pin-editor-modal" role="dialog" aria-modal="true" aria-label="Adjust map pin" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <strong>Adjust map pin</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="pin-editor-body">
          <MapPinMap
            latitude={latitude}
            longitude={longitude}
            label={label}
            interactive
            onPinChange={onPinChange}
          />
          <p className="property-meta">Drag the marker or click the map to set the exact listing location.</p>
          <button className="button primary full" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function MapPinMap({ latitude, longitude, label, interactive = false, onPinChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapboxModuleRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const hasPin = Number.isFinite(numericLatitude) && Number.isFinite(numericLongitude);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainerRef.current || mapRef.current || !hasPin) return;
      const mapboxModule = await import("mapbox-gl");
      if (cancelled || !mapContainerRef.current) return;

      const mapboxgl = mapboxModule.default;
      mapboxModuleRef.current = mapboxgl;
      mapboxgl.accessToken = mapboxToken;
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [numericLongitude, numericLatitude],
        zoom: interactive ? 16 : 14,
        attributionControl: false,
        interactive
      });

      if (interactive) {
        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
        mapRef.current.on("click", (event) => {
          onPinChange?.({
            latitude: event.lngLat.lat,
            longitude: event.lngLat.lng
          });
        });
      }

      setMapReady(true);
      window.setTimeout(() => mapRef.current?.resize(), 80);
    }

    initMap();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxModuleRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const mapboxgl = mapboxModuleRef.current;
    if (!mapReady || !mapRef.current || !mapboxgl || !hasPin) return;

    const lngLat = [numericLongitude, numericLatitude];
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#111111", draggable: interactive })
        .setLngLat(lngLat)
        .addTo(mapRef.current);

      if (interactive) {
        markerRef.current.on("dragend", () => {
          const nextPosition = markerRef.current.getLngLat();
          onPinChange?.({
            latitude: nextPosition.lat,
            longitude: nextPosition.lng
          });
        });
      }
    } else {
      markerRef.current.setLngLat(lngLat);
    }

    mapRef.current.easeTo({ center: lngLat, zoom: interactive ? 16 : 14, duration: 300 });
    mapRef.current.resize();
  }, [hasPin, interactive, latitude, longitude, mapReady, numericLatitude, numericLongitude, onPinChange]);

  return (
    <div className={`pin-map ${interactive ? "pin-map-editor" : ""}`} ref={mapContainerRef}>
      {!mapboxToken && (
        <div className="manage-map-empty">
          <strong>Mapbox not configured</strong>
          <span>Add VITE_MAPBOX_TOKEN to preview pins.</span>
        </div>
      )}
      <span className="pin-map-label">{label}</span>
    </div>
  );
}

function AccountPage({
  profile,
  loading,
  visitRequests,
  priorityRequests,
  onSaveProfile,
  onDeletePriorityRequest,
  onViewVisitProperty,
  onDeleteVisitRequest
}) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    state: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      city: profile?.city || "",
      state: profile?.state || ""
    });
  }, [profile]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitProfile(event) {
    event.preventDefault();
    setSaving(true);
    await onSaveProfile(form);
    setSaving(false);
  }

  return (
    <section className="page-section">
      <div className="container">
        <div className="page-head">
          <div>
            <p className="eyebrow">Account</p>
            <h1 className="page-title">Your renter workspace.</h1>
            <p className="listing-header-sub">Manage your contact details and review the requests you have sent.</p>
          </div>
        </div>

        <div className="account-grid">
          <form className="account-card" onSubmit={submitProfile}>
            <div className="section-title-row">
              <div>
                <h3>Profile details</h3>
                <p>These details help us coordinate visits and follow-ups.</p>
              </div>
            </div>

            {loading ? (
              <div className="empty">Loading account...</div>
            ) : (
              <>
                <div className="form-stack">
                  <label className="field">
                    <span>Full name</span>
                    <input value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} placeholder="Your name" />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" />
                  </label>
                  <label className="field">
                    <span>Phone {!form.phone && <em className="field-inline-hint">Add for faster follow-up</em>}</span>
                    <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+91 98765 43210" />
                  </label>
                  <div className="range-inputs">
                    <label className="field">
                      <span>City</span>
                      <input value={form.city} onChange={(event) => updateField("city", event.target.value)} placeholder="Bengaluru" />
                    </label>
                    <label className="field">
                      <span>State</span>
                      <input value={form.state} onChange={(event) => updateField("state", event.target.value)} placeholder="Karnataka" />
                    </label>
                  </div>
                </div>
                <button className="button primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
              </>
            )}
          </form>

          <div className="account-stack">
            <RequestHistory
              title="Visit requests"
              emptyText="No visit requests yet."
              rows={visitRequests}
              renderRow={(row) => (
                <>
                  <div>
                    <strong>{row.property_title || row.property_id}</strong>
                    <span>{formatRequestDate(row.created_at)} - {row.status}</span>
                  </div>
                  <div className="request-row-actions">
                    <button className="request-action-btn" onClick={() => onViewVisitProperty(row.property_id)}>View</button>
                    <button className="request-delete-btn" onClick={() => onDeleteVisitRequest(row.id)}>Delete</button>
                  </div>
                </>
              )}
            />
            <RequestHistory
              title="Priority requests"
              emptyText="No priority requests yet."
              rows={priorityRequests}
              renderRow={(row) => (
                <>
                  <div>
                    <strong>{row.preferred_locality || "Priority request"}</strong>
                    <span>{formatRequestDate(row.created_at)} - {row.status}{row.move_by ? ` - Move by ${row.move_by}` : ""}</span>
                  </div>
                  <div className="request-row-actions">
                    <button className="request-delete-btn" onClick={() => onDeletePriorityRequest(row.id)}>Delete</button>
                  </div>
                </>
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function RequestHistory({ title, rows, emptyText, renderRow }) {
  return (
    <div className="account-card request-history-card">
      <div className="section-title-row">
        <div>
          <h3>{title}</h3>
        </div>
      </div>
      {rows.length ? (
        <div className="request-history-list">
          {rows.map((row) => (
            <div className="request-history-row" key={row.id}>
              {renderRow(row)}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty compact-empty">{emptyText}</div>
      )}
    </div>
  );
}

function formatRequestDate(value) {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function PropertyCard({ property, saved, onSave, onDetails, onVisit, isActive, onHover }) {
  const topFeatures = (property.features || []).slice(0, 3);

  return (
    <article className={`property-card ${isActive ? "active" : ""}`} onMouseEnter={onHover} onFocus={onHover}>
      <div className="property-media">
        <img src={property.image} alt={getPropertyImageAlt(property)} loading="lazy" />
        <span className="badge">{property.status}</span>
        <button className={`heart ${saved ? "saved" : ""}`} onClick={onSave} aria-label={`Save ${property.title}`}>{saved ? "Saved" : "Save"}</button>
      </div>
      <div className="property-body">
        <div className="property-title-row">
          <div>
            <div className="property-title">{property.title}</div>
            <div className="property-meta">{property.locality}, {property.city}</div>
          </div>
          <div className="property-price-badge"><strong>{money(property.rent)}</strong><span>/ mo</span></div>
        </div>
        <div className="specs">
          <div className="spec"><strong>{property.bhk}</strong>Layout</div>
          <div className="spec"><strong>{property.area ? `${property.area} sq ft` : "Size TBD"}</strong>Area</div>
          <div className="spec"><strong>{property.localityTag || property.type || "Home"}</strong></div>
        </div>
        <div className="property-meta card-feature-line">
          {topFeatures.length ? topFeatures.join(" - ") : property.type || "Rental home"}
        </div>
        <div className="card-actions">
          <button className="button ghost" onClick={onDetails}>View details</button>
          <button className="button primary" onClick={onVisit}>Request visit</button>
        </div>
      </div>
    </article>
  );
}

function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <p className="eyebrow">Process</p>
        <h2 className="section-title">Simple enough to repeat.</h2>
        <div className="info-grid">
          <article className="info-card"><h3>Shortlist</h3><p>Save the homes that meet your rent, locality and move-in needs.</p></article>
          <article className="info-card"><h3>Request</h3><p>Share visit intent and a preferred time without calling every owner.</p></article>
          <article className="info-card"><h3>Move</h3><p>Track practical details like deposit, furnishing and commute before deciding.</p></article>
        </div>
      </div>
    </section>
  );
}

function UrgentHelp({ onOpen }) {
  return (
    <section className="section" id="urgent">
      <div className="container request-wrap">
        <div>
          <p className="eyebrow">Priority support</p>
          <h2 className="section-title">Need a home this week?</h2>
          <p className="hero-copy">Send your core requirements and the ops team can prioritize matching inventory.</p>
        </div>
        <div className="request-card urgent-launch-card">
          <p className="eyebrow">Fast track</p>
          <h3>Open the priority form.</h3>
          <p>Use this when your move-in timeline is tight and you want us to prioritize matches.</p>
          <button className="button primary full" onClick={onOpen}>Open priority form</button>
        </div>
      </div>
    </section>
  );
}

function PriorityRequestForm({ onSubmit, error }) {
  return (
    <form className="priority-request-form" onSubmit={onSubmit}>
      <label className="field"><span>Name</span><input name="name" required placeholder="Your name" /></label>
      <label className="field"><span>Phone</span><input name="phone" required placeholder="+91 98765 43210" /></label>
      <div className="range-inputs">
        <label className="field"><span>Preferred locality</span><input name="preferred_locality" required placeholder="Indiranagar" /></label>
        <label className="field"><span>Move by</span><input name="move_by" type="date" /></label>
      </div>
      <label className="field"><span>Budget and notes</span><textarea name="notes" placeholder="Example: 1 BHK, under Rs 25k, close to metro" /></label>
      {error && (
        <div className="priority-confirmation priority-confirmation--error" role="alert">
          <strong>Could not send request</strong>
          <span>{error}</span>
        </div>
      )}
      <button className="button primary" type="submit">Send request</button>
    </form>
  );
}

function PropertyModal({ property, saved, onClose, onSave, onVisit }) {
  const images = property.images?.length ? property.images : [{ image_url: property.image, alt_text: property.title }];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImage = images[activeImageIndex] || images[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={property.title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <strong>{property.locality} property</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="modal-body">
          <div className="modal-gallery">
            <div className="modal-image">
              <img src={activeImage.image_url} alt={activeImage.alt_text || property.title} />
            </div>
            {images.length > 1 && (
              <div className="gallery-thumbs" aria-label="Property image gallery">
                {images.map((image, index) => (
                  <button
                    className={activeImageIndex === index ? "active" : ""}
                    type="button"
                    key={`${image.image_url}-${index}`}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <img src={image.image_url} alt={image.alt_text || `${property.title} image ${index + 1}`} />
                    <span>{image.alt_text || `Image ${index + 1}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="detail-stack">
            <p className="eyebrow">{property.status}</p>
            <h2>{property.title}</h2>
            <div className="detail-price">{money(property.rent)} / month</div>
            <p>{property.description}</p>
            <div className="detail-list">
              <div><span>Locality</span><strong>{property.locality}</strong></div>
              <div><span>Layout</span><strong>{property.bhk}</strong></div>
              <div><span>Home type</span><strong>{property.type}</strong></div>
              <div><span>Area</span><strong>{property.area} sq ft</strong></div>
              <div><span>Deposit</span><strong>{money(property.deposit)}</strong></div>
            </div>
            <button className="button primary" onClick={onVisit}>Request a visit</button>
            <button className="button ghost" onClick={onSave}>{saved ? "Remove from shortlist" : "Add to shortlist"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

