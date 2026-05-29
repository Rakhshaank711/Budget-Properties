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
  const [search, setSearch] = useState("");
  const [locality, setLocality] = useState("All");
  const [bhk, setBhk] = useState("All");
  const [maxRent, setMaxRent] = useState(50000);
  const [saved, setSaved] = useState(() => new Set());
  const [showSaved, setShowSaved] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
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

  const results = useMemo(() => {
    return properties.filter((item) => {
      const haystack = `${item.title} ${item.locality} ${item.city} ${item.features.join(" ")}`.toLowerCase();
      const matchesSearch = haystack.includes(search.trim().toLowerCase());
      const matchesLocality = locality === "All" || item.locality === locality;
      const matchesBhk = bhk === "All" || item.bhk === bhk;
      const matchesSaved = !showSaved || saved.has(item.id);
      return matchesSearch && matchesLocality && matchesBhk && matchesSaved && item.rent <= maxRent;
    });
  }, [bhk, locality, maxRent, saved, search, showSaved]);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2400);
  }

  function toggleSaved(id) {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        notify("Removed from shortlist.");
      } else {
        next.add(id);
        notify("Added to shortlist.");
      }
      if (!next.size) setShowSaved(false);
      return next;
    });
  }

  function toggleSavedView() {
    if (!saved.size) {
      notify("No saved properties yet.");
      return;
    }
    setShowSaved((current) => !current);
  }

  function submitUrgentRequest(event) {
    event.preventDefault();
    event.currentTarget.reset();
    notify("Urgent help request sent.");
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      notify(error.message);
      return;
    }
    setAuthOpen(false);
    notify("Signed out.");
  }

  const userLabel = session?.user?.user_metadata?.full_name || session?.user?.email || "Account";

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">Budget Properties</div>
          <nav className="nav" aria-label="Primary navigation">
            <a className="active mobile-keep" href="#properties">Properties</a>
            <a href="#how">How it works</a>
            <a href="#urgent">Urgent help</a>
            <button className={showSaved ? "active" : ""} onClick={toggleSavedView}>Saved {saved.size}</button>
            {session ? (
              <button onClick={signOut}>{userLabel} · Sign out</button>
            ) : (
              <button onClick={() => setAuthOpen(true)}>Login</button>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Hero />
        <section className="section" id="properties">
          <div className="container">
            <p className="eyebrow">Inventory</p>
            <h2 className="section-title">{showSaved ? "Your shortlisted homes." : "Browse available homes."}</h2>

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

            <div className={results.length ? "properties-grid" : ""}>
              {results.length ? (
                results.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    saved={saved.has(property.id)}
                    onSave={() => toggleSaved(property.id)}
                    onDetails={() => setSelectedProperty(property)}
                    onVisit={() => notify("Visit request captured.")}
                  />
                ))
              ) : (
                <div className="empty">
                  {showSaved ? "No saved homes match these filters yet." : "No homes match these filters. Increase the budget or clear a filter."}
                </div>
              )}
            </div>
          </div>
        </section>

        <HowItWorks />
        <UrgentHelp onSubmit={submitUrgentRequest} />
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
          onVisit={() => notify("Visit request captured.")}
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

function UrgentHelp({ onSubmit }) {
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
            <label className="field"><span>Name</span><input required placeholder="Your name" /></label>
            <label className="field"><span>Phone</span><input required placeholder="+91 98765 43210" /></label>
            <div className="range-inputs">
              <label className="field"><span>Preferred locality</span><input required placeholder="Indiranagar" /></label>
              <label className="field"><span>Move by</span><input type="date" /></label>
            </div>
            <label className="field"><span>Budget and notes</span><textarea placeholder="Example: 1 BHK, under Rs 25k, close to metro" /></label>
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
