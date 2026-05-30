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
const money = (value) => `Rs ${Number(value).toLocaleString("en-IN")}`;
const validPages = new Set(["home", "saved", "account", "manage"]);
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

function normalizePropertyRow(row) {
  return {
    id: row.id,
    title: row.title,
    locality: row.locality,
    city: row.city,
    state: row.state,
    bhk: row.bhk,
    rent: row.rent,
    deposit: row.deposit,
    area: row.area,
    type: row.type,
    status: row.status,
    image: row.image_url,
    features: Array.isArray(row.features) ? row.features : [],
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    is_active: row.is_active
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
        .select("id, title, locality, city, state, bhk, rent, deposit, area, type, status, image_url, features, description, latitude, longitude, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!isActive) return;
      setInventoryLoading(false);

      if (error) {
        notify(error.message);
        return;
      }

      const normalized = (data ?? []).map(normalizePropertyRow);

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

  const results = useMemo(() => {
    return inventory.filter((item) => {
      const haystack = `${item.title} ${item.locality} ${item.city} ${item.features.join(" ")}`.toLowerCase();
      const matchesSearch = haystack.includes(search.trim().toLowerCase());
      const matchesLocality = locality === "All" || item.locality === locality;
      const matchesBhk = bhk === "All" || item.bhk === bhk;
      return matchesSearch && matchesLocality && matchesBhk && item.rent <= maxRent;
    });
  }, [bhk, inventory, locality, maxRent, search]);

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

    const payload = {
      id: propertyForm.id.trim(),
      title: propertyForm.title.trim(),
      locality: propertyForm.locality.trim(),
      city: propertyForm.city.trim(),
      state: propertyForm.state.trim() || null,
      bhk: propertyForm.bhk,
      rent: Number(propertyForm.rent),
      deposit: Number(propertyForm.deposit || 0),
      area: propertyForm.area ? Number(propertyForm.area) : null,
      type: propertyForm.type.trim() || null,
      status: propertyForm.status.trim() || "Ready",
      image_url: propertyForm.image_url.trim() || null,
      features: propertyForm.features
        .split(",")
        .map((feature) => feature.trim())
        .filter(Boolean),
      description: propertyForm.description.trim() || null,
      latitude: propertyForm.latitude ? Number(propertyForm.latitude) : null,
      longitude: propertyForm.longitude ? Number(propertyForm.longitude) : null,
      is_active: propertyForm.is_active,
      created_by: session.user.id
    };

    if (!payload.id || !payload.title || !payload.locality || !payload.city || !payload.bhk || !payload.rent) {
      notify("Fill required property fields.");
      return false;
    }

    const { data, error } = await supabase
      .from("properties")
      .upsert(payload)
      .select("id, title, locality, city, state, bhk, rent, deposit, area, type, status, image_url, features, description, latitude, longitude, is_active")
      .single();

    if (error) {
      notify(error.message);
      return false;
    }

    const normalized = normalizePropertyRow(data);
    setInventory((current) => {
      const withoutCurrent = current.filter((property) => property.id !== normalized.id);
      return normalized.is_active ? [normalized, ...withoutCurrent] : withoutCurrent;
    });
    notify("Property saved.");
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
                  localities={["All", ...new Set(inventory.map((item) => item.locality))]}
                  bhk={bhk}
                  setBhk={setBhk}
                  maxRent={maxRent}
                  setMaxRent={setMaxRent}
                  count={results.length}
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

function PropertyFilters({ search, setSearch, locality, setLocality, localities, bhk, setBhk, maxRent, setMaxRent, count }) {
  return (
    <div className="controls">
      <div className="controls-top">
        <label className="search">
          <span>Search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Locality, feature, or property name" autoComplete="off" />
        </label>
        <span className="count-pill">{count} matches</span>
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
          <span>Max rent</span>
          <input type="number" min="8000" max="60000" step="1000" value={maxRent} onChange={(event) => setMaxRent(Number(event.target.value))} />
        </label>
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
          <span>Add latitude and longitude in Manage to place pins.</span>
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
          <span>Add latitude and longitude in Manage to place pins.</span>
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
  city: "Bengaluru",
  state: "Karnataka",
  bhk: "1 BHK",
  rent: "",
  deposit: "",
  area: "",
  type: "Apartment",
  status: "Ready",
  image_url: "",
  features: "",
  description: "",
  latitude: "",
  longitude: "",
  is_active: true
};

function ManagePropertiesPage({ propertiesToShow, onSaveProperty, onDeactivateProperty }) {
  const [form, setForm] = useState(emptyPropertyForm);
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editProperty(property) {
    setForm({
      id: property.id || "",
      title: property.title || "",
      locality: property.locality || "",
      city: property.city || "Bengaluru",
      state: property.state || "Karnataka",
      bhk: property.bhk || "1 BHK",
      rent: property.rent || "",
      deposit: property.deposit || "",
      area: property.area || "",
      type: property.type || "Apartment",
      status: property.status || "Ready",
      image_url: property.image || "",
      features: (property.features || []).join(", "),
      description: property.description || "",
      latitude: property.latitude || "",
      longitude: property.longitude || "",
      is_active: property.is_active !== false
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitProperty(event) {
    event.preventDefault();
    setSaving(true);
    const ok = await onSaveProperty(form);
    setSaving(false);
    if (ok) setForm(emptyPropertyForm);
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
          <button className="button ghost page-head-cta" onClick={() => setForm(emptyPropertyForm)}>New property</button>
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
              <label className="field"><span>Locality</span><input value={form.locality} onChange={(event) => updateField("locality", event.target.value)} placeholder="Indiranagar" required /></label>
              <label className="field"><span>City</span><input value={form.city} onChange={(event) => updateField("city", event.target.value)} placeholder="Bengaluru" required /></label>
            </div>
            <div className="range-inputs">
              <label className="field"><span>State</span><input value={form.state} onChange={(event) => updateField("state", event.target.value)} placeholder="Karnataka" /></label>
              <label className="field"><span>Layout</span><select value={form.bhk} onChange={(event) => updateField("bhk", event.target.value)}>{bhks.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <div className="range-inputs">
              <label className="field"><span>Rent</span><input type="number" value={form.rent} onChange={(event) => updateField("rent", event.target.value)} placeholder="25000" required /></label>
              <label className="field"><span>Deposit</span><input type="number" value={form.deposit} onChange={(event) => updateField("deposit", event.target.value)} placeholder="75000" /></label>
            </div>
            <div className="range-inputs">
              <label className="field"><span>Area</span><input type="number" value={form.area} onChange={(event) => updateField("area", event.target.value)} placeholder="850" /></label>
              <label className="field"><span>Type</span><input value={form.type} onChange={(event) => updateField("type", event.target.value)} placeholder="Apartment" /></label>
            </div>
            <label className="field"><span>Image URL</span><input value={form.image_url} onChange={(event) => updateField("image_url", event.target.value)} placeholder="https://..." /></label>
            <label className="field"><span>Features</span><input value={form.features} onChange={(event) => updateField("features", event.target.value)} placeholder="Furnished, Balcony, Lift" /></label>
            <div className="range-inputs">
              <label className="field"><span>Latitude</span><input type="number" step="any" value={form.latitude} onChange={(event) => updateField("latitude", event.target.value)} placeholder="12.9716" /></label>
              <label className="field"><span>Longitude</span><input type="number" step="any" value={form.longitude} onChange={(event) => updateField("longitude", event.target.value)} placeholder="77.5946" /></label>
            </div>
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
                      <span>{property.locality}, {property.city} - {property.bhk} - {money(property.rent)}</span>
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
  return (
    <article className={`property-card ${isActive ? "active" : ""}`} onMouseEnter={onHover} onFocus={onHover}>
      <div className="property-media">
        <img src={property.image} alt={property.title} loading="lazy" />
        <span className="badge">{property.status}</span>
        <button className={`heart ${saved ? "saved" : ""}`} onClick={onSave} aria-label={`Save ${property.title}`}>{saved ? "Saved" : "Save"}</button>
      </div>
      <div className="property-body">
        <div className="property-title-row">
          <div>
            <div className="property-title">{property.title}</div>
            <div className="property-meta">{property.locality}, {property.city}</div>
          </div>
          <div className="property-price">{money(property.rent)}</div>
        </div>
        <div className="specs">
          <div className="spec"><strong>{property.bhk}</strong>Layout</div>
          <div className="spec"><strong>{property.area} sq ft</strong>Area</div>
          <div className="spec"><strong>{money(property.deposit)}</strong>Deposit</div>
        </div>
        <div className="property-meta">{property.features.join(" - ")}</div>
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
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={property.title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <strong>{property.locality} property</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="modal-body">
          <div className="modal-image">
            <img src={property.image} alt={property.title} />
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

