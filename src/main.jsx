import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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

const localities = ["All", ...new Set(properties.map((item) => item.locality))];
const bhks = ["All", "1 RK", "1 BHK", "2 BHK", "3 BHK"];
const money = (value) => `Rs ${Number(value).toLocaleString("en-IN")}`;

function App() {
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [locality, setLocality] = useState("All");
  const [bhk, setBhk] = useState("All");
  const [maxRent, setMaxRent] = useState(50000);
  const [saved, setSaved] = useState(() => new Set());
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [urgentFeedback, setUrgentFeedback] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setSaved(new Set());
      setPage("home");
      return;
    }

    let isActive = true;

    async function loadSavedProperties() {
      const { data, error } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("user_id", session.user.id);

      if (!isActive) return;

      if (error) {
        notify(error.message);
        return;
      }

      setSaved(new Set((data ?? []).map((row) => row.property_id)));
    }

    loadSavedProperties();

    return () => {
      isActive = false;
    };
  }, [session?.user?.id]);

  const results = useMemo(() => {
    return properties.filter((item) => {
      const haystack = `${item.title} ${item.locality} ${item.city} ${item.features.join(" ")}`.toLowerCase();
      const matchesSearch = haystack.includes(search.trim().toLowerCase());
      const matchesLocality = locality === "All" || item.locality === locality;
      const matchesBhk = bhk === "All" || item.bhk === bhk;
      return matchesSearch && matchesLocality && matchesBhk && item.rent <= maxRent;
    });
  }, [bhk, locality, maxRent, search]);

  const savedProperties = useMemo(() => {
    return properties.filter((property) => saved.has(property.id));
  }, [saved]);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openHome(sectionId) {
    setPage("home");
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
    setUrgentFeedback("");
    if (!supabase) {
      notify("Supabase is not configured.");
      return;
    }

    if (!session?.user?.id) {
      setAuthOpen(true);
      notify("Login to send an urgent request.");
      return;
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
      notify(error.message);
      return;
    }

    event.currentTarget.reset();
    setUrgentFeedback("Priority support request sent. We will follow up shortly.");
    notify("Priority support request sent.", 6000);
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
            <button className={page === "home" ? "active mobile-keep" : "mobile-keep"} onClick={() => openHome("properties")}>Properties</button>
            <button onClick={() => openHome("how")}>How it works</button>
            <button onClick={() => openHome("urgent")}>Urgent help</button>
            <button className={page === "saved" ? "active" : ""} onClick={openSavedPage}>Saved {saved.size}</button>
            {session ? (
              <button onClick={signOut}>{userLabel} · Sign out</button>
            ) : (
              <button onClick={() => setAuthOpen(true)}>Login</button>
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
                  bhk={bhk}
                  setBhk={setBhk}
                  maxRent={maxRent}
                  setMaxRent={setMaxRent}
                  count={results.length}
                />

                <PropertyGrid
                  propertiesToShow={results}
                  saved={saved}
                  onSave={toggleSaved}
                  onDetails={setSelectedProperty}
                  onVisit={requestVisit}
                  emptyText="No homes match these filters. Increase the budget or clear a filter."
                />
              </div>
            </section>

            <HowItWorks />
            <UrgentHelp onSubmit={submitUrgentRequest} feedback={urgentFeedback} />
          </>
        ) : (
          <SavedPropertiesPage
            propertiesToShow={savedProperties}
            saved={saved}
            onBack={() => openHome("properties")}
            onSave={toggleSaved}
            onDetails={setSelectedProperty}
            onVisit={requestVisit}
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

      {toast && <div className="toast">{toast}</div>}
    </>
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

function PropertyFilters({ search, setSearch, locality, setLocality, bhk, setBhk, maxRent, setMaxRent, count }) {
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

function PropertyGrid({ propertiesToShow, saved, onSave, onDetails, onVisit, emptyText }) {
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
          />
        ))
      ) : (
        <div className="empty">{emptyText}</div>
      )}
    </div>
  );
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

function PropertyCard({ property, saved, onSave, onDetails, onVisit }) {
  return (
    <article className="property-card">
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

function UrgentHelp({ onSubmit, feedback }) {
  return (
    <section className="section" id="urgent">
      <div className="container request-wrap">
        <div>
          <p className="eyebrow">Priority support</p>
          <h2 className="section-title">Need a home this week?</h2>
          <p className="hero-copy">Send your core requirements and the ops team can prioritize matching inventory.</p>
        </div>
        <div className="request-card">
          <form onSubmit={onSubmit}>
            <label className="field"><span>Name</span><input name="name" required placeholder="Your name" /></label>
            <label className="field"><span>Phone</span><input name="phone" required placeholder="+91 98765 43210" /></label>
            <div className="range-inputs">
              <label className="field"><span>Preferred locality</span><input name="preferred_locality" required placeholder="Indiranagar" /></label>
              <label className="field"><span>Move by</span><input name="move_by" type="date" /></label>
            </div>
            <label className="field"><span>Budget and notes</span><textarea name="notes" placeholder="Example: 1 BHK, under Rs 25k, close to metro" /></label>
            {feedback && <div className="form-feedback success">{feedback}</div>}
            <button className="button primary" type="submit">Send request</button>
          </form>
        </div>
      </div>
    </section>
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
