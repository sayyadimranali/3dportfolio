/* =========================================================
   3D Portfolio App (Vanilla JS + Three.js)
   - Hash router with animated view transitions
   - Dynamic content loading (projects + details drawer)
   - 3D object rotation: drag to rotate, touch supported
   - Hover effects: 3D card tilt using CSS variables
   - Responsive nav toggle
========================================================= */

(() => {
  "use strict";

  // --------------------------
  // Utilities
  // --------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Basic safe HTML escape (for dynamic injection)
  const esc = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  // --------------------------
  // Data (Replace with your own)
  // --------------------------
  const DATA = {
    name: "Your Name",
    role: "DevOps / Cloud Engineer",
    summary:
      "I build reliable infrastructure, automate delivery pipelines, and ship production-grade systems. This portfolio showcases interactive 3D UI, dynamic routing, and performance-focused frontend engineering.",
    projects: [
      {
        id: "cicd",
        title: "CI/CD Platform Blueprint",
        description: "Secure pipelines with artifact signing, parallel stages, and policy gates.",
        tags: ["GitHub Actions", "Docker", "SAST", "SBOM"],
        links: {
          repo: "https://github.com/",
          live: "https://example.com/"
        },
        details: `
A full pipeline design covering:
- Branch protections + required checks
- Build caching + parallel test matrix
- Artifact signing + provenance
- Deployment with canary + automated rollback
        `.trim()
      },
      {
        id: "iac",
        title: "Infrastructure as Code Stack",
        description: "Reusable IaC modules with drift detection and ephemeral environments.",
        tags: ["Terraform", "AWS", "OPA", "Terragrunt"],
        links: { repo: "https://github.com/" },
        details: `
Highlights:
- Module versioning strategy
- Policy-as-code guardrails (OPA)
- Plan/apply workflow with approvals
- Drift detection + remediation
        `.trim()
      },
      {
        id: "k8s",
        title: "Kubernetes Observability",
        description: "Metrics, traces, logs with actionable SLO dashboards and alerts.",
        tags: ["Kubernetes", "Prometheus", "Grafana", "OpenTelemetry"],
        links: { live: "https://example.com/" },
        details: `
What’s included:
- Golden signals dashboards
- Distributed tracing with sampling
- Alert tuning to reduce noise
- SLO burn-rate alerting patterns
        `.trim()
      }
    ],
    skills: [
      { name: "Cloud & Networking", items: ["AWS / Azure", "VPC / VNets", "DNS, TLS, IAM"], level: 86 },
      { name: "Automation & IaC", items: ["Terraform", "Ansible", "Packer"], level: 82 },
      { name: "Containers & Orchestration", items: ["Docker", "Kubernetes", "Helm"], level: 78 },
      { name: "Observability", items: ["Prometheus", "Grafana", "OTel"], level: 74 }
    ]
  };

  // --------------------------
  // Router + Views
  // --------------------------
  const routeEl = $("#route");

  const routes = {
    "/": renderHome,
    "/projects": renderProjects,
    "/skills": renderSkills,
    "/contact": renderContact
  };

  function getHashPath() {
    const raw = location.hash.replace("#", "") || "/";
    // Normalize: "#/projects" => "/projects"
    if (raw.startsWith("/")) return raw;
    if (raw.startsWith("!/")) return raw.slice(1);
    return "/" + raw;
  }

  async function navigate() {
    const path = getHashPath();
    const viewFn = routes[path] || renderNotFound;

    // animate old view out
    const oldView = $(".view", routeEl);
    if (oldView) {
      oldView.classList.add("is-leaving");
      await wait(180);
    }

    // Load new view "dynamically"
    // (In a real app, you could fetch HTML/JSON here)
    const html = await viewFn();
    routeEl.innerHTML = html;

    // Focus main for accessibility
    $("#app").focus({ preventScroll: true });

    // After render: attach behaviors
    initCardTilt();
    initDrawerHandlers();

    // Only create the Three.js scene on the home view (performance)
    if (path === "/") initThreeStage();
  }

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  // --------------------------
  // Views (HTML templates)
  // --------------------------
  async function renderHome() {
    // Simulate dynamic loading delay (remove if you want)
    if (!prefersReducedMotion) await wait(60);

    return `
      <section class="view container">
        <div class="hero">
          <div>
            <p class="kicker">3D PORTFOLIO</p>
            <h1 class="h1">Interactive, performant, and professional.</h1>
            <p class="lead">
              ${esc(DATA.summary)}
            </p>

            <div class="cta">
              <a class="btn btn--primary" href="#/projects">View Projects</a>
              <a class="btn" href="#/contact">Contact</a>
            </div>

            <div class="section">
              <div class="section__head">
                <h2 class="h2">Highlights</h2>
                <p class="small">3D scene + hover tilt + dynamic routing</p>
              </div>

              <div class="grid">
                ${DATA.projects
                  .slice(0, 3)
                  .map(
                    (p) => `
                      <article class="card tilt" data-project="${esc(p.id)}" tabindex="0">
                        <div class="card__body">
                          <h3 class="card__title">${esc(p.title)}</h3>
                          <p class="card__meta">${esc(p.description)}</p>
                          <ul class="tags">
                            ${p.tags.map((t) => `<li class="tag">${esc(t)}</li>`).join("")}
                          </ul>
                          <div class="card__actions">
                            <button class="btn" data-open-project="${esc(p.id)}">Details</button>
                            ${p.links.repo ? `<a class="btn" href="${esc(p.links.repo)}" target="_blank" rel="noreferrer">Repo</a>` : ""}
                          </div>
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </div>
            </div>
          </div>

          <aside class="stage" aria-label="3D object viewer">
            <div class="stage__top">
              <span class="pill">3D Viewer</span>
              <span class="pill" id="fpsHint">Drag • Rotate</span>
            </div>
            <div class="stage__canvas" id="threeStage" role="img" aria-label="Interactive 3D object"></div>
            <div class="stage__hint">
              Tip: drag to rotate. On mobile, use one finger.
            </div>
          </aside>
        </div>

        ${drawerHTML()}
      </section>
    `;
  }

  async function renderProjects() {
    if (!prefersReducedMotion) await wait(60);

    return `
      <section class="view container">
        <div class="section__head">
          <h2 class="h2">Projects</h2>
          <p class="small">Dynamic content loading + interactive hover effects</p>
        </div>

        <div class="grid">
          ${DATA.projects
            .map(
              (p) => `
                <article class="card tilt" tabindex="0">
                  <div class="card__body">
                    <h3 class="card__title">${esc(p.title)}</h3>
                    <p class="card__meta">${esc(p.description)}</p>
                    <ul class="tags">${p.tags.map((t) => `<li class="tag">${esc(t)}</li>`).join("")}</ul>

                    <div class="card__actions">
                      <button class="btn btn--primary" data-open-project="${esc(p.id)}">Open</button>
                      ${p.links.live ? `<a class="btn" href="${esc(p.links.live)}" target="_blank" rel="noreferrer">Live</a>` : ""}
                      ${p.links.repo ? `<a class="btn" href="${esc(p.links.repo)}" target="_blank" rel="noreferrer">Repo</a>` : ""}
                    </div>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>

        ${drawerHTML()}
      </section>
    `;
  }

  async function renderSkills() {
    if (!prefersReducedMotion) await wait(60);

    return `
      <section class="view container">
        <div class="section__head">
          <h2 class="h2">Skills</h2>
          <p class="small">Responsive layout + accessible visual meters</p>
        </div>

        <div class="skill-row">
          ${DATA.skills
            .map(
              (s) => `
                <article class="skill">
                  <h3 class="card__title">${esc(s.name)}</h3>
                  <p class="card__meta">${esc(s.items.join(" • "))}</p>
                  <div class="meter" aria-label="${esc(s.name)} level ${s.level}%">
                    <span style="--w:${s.level}%"></span>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  async function renderContact() {
    if (!prefersReducedMotion) await wait(60);

    return `
      <section class="view container">
        <div class="section__head">
          <h2 class="h2">Contact</h2>
          <p class="small">No backend needed — use mailto or plug in your endpoint later</p>
        </div>

        <div class="skill">
          <form id="contactForm" novalidate>
            <label class="sr-only" for="name">Name</label>
            <input class="input" id="name" name="name" placeholder="Your name" autocomplete="name" required />

            <label class="sr-only" for="email">Email</label>
            <input class="input" id="email" name="email" type="email" placeholder="Email" autocomplete="email" required />

            <label class="sr-only" for="message">Message</label>
            <textarea class="input" id="message" name="message" rows="5" placeholder="Tell me about your project..." required></textarea>

            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
              <button class="btn btn--primary" type="submit">Send</button>
              <a class="btn" href="mailto:you@example.com?subject=Portfolio%20Inquiry">Email directly</a>
            </div>

            <p id="formMsg" class="small" style="margin-top:10px;"></p>
          </form>
        </div>
      </section>
    `;
  }

  async function renderNotFound() {
    return `
      <section class="view container">
        <h2 class="h2">Page not found</h2>
        <p class="small">Try going back to <a href="#/">Home</a>.</p>
      </section>
    `;
  }

  function drawerHTML() {
    return `
      <div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Project details">
        <div class="drawer__panel" role="document">
          <div class="drawer__head">
            <div>
              <h3 class="drawer__title" id="drawerTitle">Project</h3>
              <p class="small" id="drawerMeta"></p>
            </div>
            <button class="drawer__close" id="drawerClose" aria-label="Close details">✕</button>
          </div>
          <div class="drawer__content" id="drawerContent"></div>
        </div>
      </div>
    `;
  }

  // --------------------------
  // Hover 3D Tilt for cards
  // --------------------------
  function initCardTilt() {
    const cards = $$(".tilt", routeEl);

    for (const card of cards) {
      // Set defaults for glow position (CSS reads --mx/--my)
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");

      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;   // 0..1
        const y = (e.clientY - rect.top) / rect.height;   // 0..1
        const rotY = (x - 0.5) * 10; // degrees
        const rotX = (0.5 - y) * 10;

        card.style.setProperty("--mx", `${x * 100}%`);
        card.style.setProperty("--my", `${y * 100}%`);

        card.style.transform = `translateY(-4px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        card.style.borderColor = "rgba(124,92,255,0.28)";
      };

      const onLeave = () => {
        card.style.transform = "translateY(0) rotateX(0) rotateY(0)";
        card.style.borderColor = "rgba(255,255,255,0.12)";
        card.style.setProperty("--mx", "50%");
        card.style.setProperty("--my", "50%");
      };

      // Disable tilt if reduced motion is preferred
      if (!prefersReducedMotion) {
        card.addEventListener("mousemove", onMove);
        card.addEventListener("mouseleave", onLeave);
      }

      // Keyboard accessibility: open details with Enter on focused card if it has a project id
      card.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          const id = card.getAttribute("data-project");
          if (id) openProject(id);
        }
      });
    }
  }

  // --------------------------
  // Dynamic content loading (Drawer)
  // --------------------------
  function initDrawerHandlers() {
    const drawer = $("#drawer");
    if (!drawer) return;

    const closeBtn = $("#drawerClose");
    const onBackdropClick = (e) => {
      if (e.target === drawer) closeDrawer();
    };

    closeBtn?.addEventListener("click", closeDrawer);
    drawer.addEventListener("click", onBackdropClick);

    // Esc closes drawer
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.dataset.open === "true") closeDrawer();
    });

    // Buttons that open details
    $$("[data-open-project]", routeEl).forEach((btn) => {
      btn.addEventListener("click", () => openProject(btn.dataset.openProject));
    });

    // Contact form handler (no backend)
    const form = $("#contactForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const msg = $("#formMsg");

        const name = $("#name").value.trim();
        const email = $("#email").value.trim();
        const message = $("#message").value.trim();

        if (!name || !email || !message) {
          msg.textContent = "Please fill in all fields.";
          return;
        }

        // For a real deployment: POST to your endpoint here.
        msg.textContent = "Thanks! This demo doesn’t send emails yet — use the Email directly button.";
        form.reset();
      });
    }
  }

  async function openProject(id) {
    const drawer = $("#drawer");
    if (!drawer) return;

    // Simulate fetching (dynamic content loading)
    const project = DATA.projects.find((p) => p.id === id);
    if (!project) return;

    $("#drawerTitle").textContent = project.title;
    $("#drawerMeta").textContent = project.description;

    // Simulate async content load
    $("#drawerContent").innerHTML = `<p>Loading…</p>`;
    drawer.dataset.open = "true";
    lockScroll(true);

    await wait(prefersReducedMotion ? 0 : 120);

    $("#drawerContent").innerHTML = `
      <p>${esc(project.details).replaceAll("\n", "<br>")}</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
        ${project.links.live ? `<a class="btn btn--primary" href="${esc(project.links.live)}" target="_blank" rel="noreferrer">Open Live</a>` : ""}
        ${project.links.repo ? `<a class="btn" href="${esc(project.links.repo)}" target="_blank" rel="noreferrer">View Repo</a>` : ""}
      </div>
    `;

    // Focus close button for accessibility
    $("#drawerClose")?.focus();
  }

  function closeDrawer() {
    const drawer = $("#drawer");
    if (!drawer) return;
    drawer.dataset.open = "false";
    lockScroll(false);
