const yearNode = document.getElementById("year");

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16
      }
    )
  : null;

function setupReveal(root = document) {
  const nodes = root.querySelectorAll(".reveal:not(.is-visible)");

  if (!revealObserver) {
    nodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  nodes.forEach((node) => revealObserver.observe(node));
}

setupReveal();

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function setText(id, value) {
  const node = document.getElementById(id);

  if (node) {
    node.textContent = value;
  }
}

function setLink(id, href, label) {
  const node = document.getElementById(id);

  if (!node) {
    return;
  }

  node.href = href;
  node.textContent = label;
}

function logContentError(file, message, detail) {
  console.error(`[content] ${file}: ${message}`, detail || "");
}

async function loadJson(path, options = {}) {
  const { optional = false } = options;

  try {
    const response = await fetch(path, { cache: "no-cache" });

    if (!response.ok) {
      if (optional && response.status === 404) {
        return null;
      }

      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (optional) {
      console.warn(`[content] Optional file unavailable: ${path}`, error);
      return null;
    }

    logContentError(path, "failed to load", error);
    return null;
  }
}

function validateProfile(data) {
  const requiredStrings = [
    "full_name",
    "alternate_name",
    "hero_eyebrow",
    "hero_headline",
    "hero_subheadline",
    "hero_cta_primary_label",
    "hero_cta_primary_url",
    "hero_cta_secondary_label",
    "hero_cta_secondary_target",
    "about_kicker",
    "about_heading",
    "connect_kicker",
    "connect_heading",
    "connect_copy",
    "connect_linkedin_label",
    "connect_back_to_top_label",
    "contact_note",
    "linkedin_url",
    "footer_identity"
  ];

  if (!isObject(data)) {
    return false;
  }

  if (!requiredStrings.every((key) => isNonEmptyString(data[key]))) {
    return false;
  }

  if (!isStringArray(data.about_paragraphs)) {
    return false;
  }

  if (
    !Array.isArray(data.about_cards) ||
    !data.about_cards.every(
      (card) => isObject(card) && isNonEmptyString(card.title) && isNonEmptyString(card.body)
    )
  ) {
    return false;
  }

  return true;
}

function validateFocus(data) {
  if (!isObject(data) || !isNonEmptyString(data.section_kicker) || !isNonEmptyString(data.section_heading)) {
    return false;
  }

  return (
    Array.isArray(data.cards) &&
    data.cards.every(
      (card) =>
        isObject(card) &&
        isNonEmptyString(card.title) &&
        Array.isArray(card.items) &&
        card.items.every(
          (item) =>
            isObject(item) &&
            isNonEmptyString(item.title) &&
            isNonEmptyString(item.description)
        )
    )
  );
}

function validatePerspective(data) {
  if (
    !isObject(data) ||
    !isNonEmptyString(data.left_column_kicker) ||
    !isNonEmptyString(data.right_column_kicker)
  ) {
    return false;
  }

  const isEntryArray = (value) =>
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isObject(entry) &&
        isNonEmptyString(entry.title) &&
        isNonEmptyString(entry.description)
    );

  return isEntryArray(data.business_entries) && isEntryArray(data.personal_entries);
}

function validateActivity(data) {
  if (data === null) {
    return true;
  }

  if (!isObject(data) || !isNonEmptyString(data.section_kicker) || !Array.isArray(data.items)) {
    return false;
  }

  return data.items.every(
    (item) =>
      isObject(item) &&
      isNonEmptyString(item.type) &&
      isNonEmptyString(item.title) &&
      isNonEmptyString(item.url)
  );
}

function createPanelCard(title, body) {
  const article = document.createElement("article");
  article.className = "panel reveal";

  const heading = document.createElement("h3");
  heading.className = "section-title";
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.className = "section-copy";
  paragraph.textContent = body;

  article.append(heading, paragraph);
  return article;
}

function renderProfile(profile) {
  if (!validateProfile(profile)) {
    logContentError("content/profile.json", "invalid shape");
    document.getElementById("hero-main")?.setAttribute("hidden", "");
    document.getElementById("about")?.setAttribute("hidden", "");
    document.getElementById("connect")?.setAttribute("hidden", "");
    return;
  }

  setText("brand-name", profile.full_name);
  setText("hero-eyebrow", profile.hero_eyebrow);
  setText("hero-headline", profile.hero_headline);
  setText("hero-subheadline", profile.hero_subheadline);
  setText("footer-name", profile.full_name);
  setText("footer-identity", profile.footer_identity);

  const heroNote = document.getElementById("hero-note");
  if (heroNote) {
    if (isNonEmptyString(profile.hero_note)) {
      heroNote.textContent = profile.hero_note;
      heroNote.removeAttribute("hidden");
    } else {
      heroNote.setAttribute("hidden", "");
    }
  }

  setLink("hero-cta-primary", profile.hero_cta_primary_url, profile.hero_cta_primary_label);
  setLink("hero-cta-secondary", profile.hero_cta_secondary_target, profile.hero_cta_secondary_label);

  setText("about-kicker", profile.about_kicker);
  setText("about-heading", profile.about_heading);

  const aboutCards = document.getElementById("about-cards");
  if (aboutCards) {
    aboutCards.innerHTML = "";
    profile.about_cards.forEach((card) => {
      aboutCards.append(createPanelCard(card.title, card.body));
    });
    setupReveal(aboutCards);
  }

  setText("connect-kicker", profile.connect_kicker);
  setText("connect-heading", profile.connect_heading);
  setText("connect-copy", profile.connect_copy);
  setText("connect-note", profile.contact_note);
  setLink("connect-linkedin", profile.linkedin_url, profile.connect_linkedin_label);
  setLink("connect-back-to-top", "#top", profile.connect_back_to_top_label);

  document.getElementById("about")?.removeAttribute("hidden");
  document.getElementById("connect")?.removeAttribute("hidden");
}

function renderFocus(focus) {
  if (!validateFocus(focus)) {
    logContentError("content/focus.json", "invalid shape");
    document.getElementById("focus")?.setAttribute("hidden", "");
    return;
  }

  setText("focus-kicker", focus.section_kicker);
  setText("focus-heading", focus.section_heading);

  const cardsNode = document.getElementById("focus-cards");
  if (!cardsNode) {
    return;
  }

  cardsNode.innerHTML = "";

  focus.cards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "panel reveal";

    const title = document.createElement("h3");
    title.className = "section-title";
    title.textContent = card.title;

    const list = document.createElement("ul");
    list.className = "focus-list";

    card.items.forEach((item) => {
      const listItem = document.createElement("li");

      const itemTitle = document.createElement("div");
      itemTitle.className = "focus-title";
      itemTitle.textContent = item.title;

      const itemDescription = document.createElement("div");
      itemDescription.textContent = item.description;

      listItem.append(itemTitle, itemDescription);
      list.append(listItem);
    });

    article.append(title, list);
    cardsNode.append(article);
  });

  setupReveal(cardsNode);
  document.getElementById("focus")?.removeAttribute("hidden");
}

function buildPerspectiveList(node, entries, listClass) {
  if (!node) {
    return;
  }

  node.className = listClass;
  node.innerHTML = "";

  entries.forEach((entry) => {
    const item = document.createElement("li");

    const title = document.createElement("div");
    title.className = "timeline-title";
    title.textContent = entry.title;

    const description = document.createElement("div");
    description.textContent = entry.description;

    item.append(title, description);
    node.append(item);
  });
}

function renderPerspective(perspective) {
  if (!validatePerspective(perspective)) {
    logContentError("content/perspective.json", "invalid shape");
    document.getElementById("experience")?.setAttribute("hidden", "");
    return;
  }

  setText("perspective-business-kicker", perspective.left_column_kicker);
  setText("perspective-personal-kicker", perspective.right_column_kicker);

  buildPerspectiveList(
    document.getElementById("perspective-business-list"),
    perspective.business_entries,
    "timeline"
  );
  buildPerspectiveList(
    document.getElementById("perspective-personal-list"),
    perspective.personal_entries,
    "insight-list"
  );

  document.getElementById("experience")?.removeAttribute("hidden");
}

function renderActivity(activity) {
  const shell = document.getElementById("activity-shell");
  const heroGrid = document.getElementById("hero-grid");
  const listNode = document.getElementById("activity-list");

  if (!shell || !heroGrid || !listNode) {
    return;
  }

  if (!activity) {
    shell.setAttribute("hidden", "");
    heroGrid.classList.add("hero-grid--single");
    return;
  }

  if (!validateActivity(activity)) {
    logContentError("content/activity.json", "invalid shape");
    shell.setAttribute("hidden", "");
    heroGrid.classList.add("hero-grid--single");
    return;
  }

  if (activity.items.length === 0) {
    shell.setAttribute("hidden", "");
    heroGrid.classList.add("hero-grid--single");
    return;
  }

  setText("activity-kicker", activity.section_kicker);
  listNode.innerHTML = "";

  activity.items.forEach((item) => {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    const type = document.createElement("span");
    const title = document.createElement("span");

    link.className = "activity-link";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    type.className = "activity-type";
    type.textContent = item.type;

    title.className = "activity-title";
    title.textContent = item.title;

    link.append(type, title);
    listItem.append(link);
    listNode.append(listItem);
  });

  heroGrid.classList.remove("hero-grid--single");
  shell.removeAttribute("hidden");
}

async function init() {
  const [profile, focus, perspective, activity] = await Promise.all([
    loadJson("content/profile.json"),
    loadJson("content/focus.json"),
    loadJson("content/perspective.json"),
    loadJson("content/activity.json", { optional: true })
  ]);

  if (profile) {
    renderProfile(profile);
  } else {
    document.getElementById("hero-main")?.setAttribute("hidden", "");
    document.getElementById("about")?.setAttribute("hidden", "");
    document.getElementById("connect")?.setAttribute("hidden", "");
  }

  if (focus) {
    renderFocus(focus);
  }

  if (perspective) {
    renderPerspective(perspective);
  }

  renderActivity(activity);
  setupReveal();
}

init();
