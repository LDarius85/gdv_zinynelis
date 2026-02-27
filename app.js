let APP_VERSION = "dev"; // fallback jei nepavyksta parsisiųsti

async function loadVersion() {
  try {
    const res = await fetch("version.json", { cache: "no-store" });
    if (!res.ok) throw new Error("version.json fetch failed");
    const data = await res.json();
    if (data && data.version) APP_VERSION = data.version;
  } catch (e) {
    console.warn("[App] Nepavyko užkrauti version.json, naudoju fallback:", APP_VERSION);
  }

  const v = document.querySelector(".version");
  if (v) v.textContent = APP_VERSION;
}

// Reloadinam puslapį kai naujas SW perima kontrolę (turi būti prieš register!)
navigator.serviceWorker.addEventListener("controllerchange", () => {
  console.log("[App] Naujas Service Worker perėmė valdymą – puslapis persikrauna");
  window.location.reload();
});

document.addEventListener("DOMContentLoaded", () => {
  const v = document.querySelector(".version");
  loadVersion();

  const menuBtn = document.getElementById("menuButton");
  if (menuBtn) {
    menuBtn.addEventListener("click", toggleMenu);
  }

  const backBtn = document.getElementById("backToTop");
  const content = document.querySelector(".content");

  if (backBtn && content) {
    backBtn.style.display = content.scrollTop > 100 ? "flex" : "none";

    content.addEventListener("scroll", () => {
      backBtn.style.display = content.scrollTop > 100 ? "flex" : "none";
    });

    backBtn.addEventListener("click", () => {
      scrollToTop();
    });
  }
});

function scrollToTop() {
  const content = document.querySelector(".content");
  if (content && content.scrollTop > 0) {
    content.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function toggleMenu() {
  document.getElementById("sidebar").classList.toggle("active");
}
function closeMenu() {
  document.getElementById("sidebar").classList.remove("active");
}

//Paieškos funkcija su paryškintais žodžiais
function filterSections() {
  const input = document.getElementById("searchBox");
  const filter = input.value.trim().toLowerCase();
  const sections = document.querySelectorAll("section");

  sections.forEach(section => {
    // Grąžinam originalų turinį (suvalgom highlight'us)
    const originalHTML = section.getAttribute("data-original-html");
    if (originalHTML) {
      section.innerHTML = originalHTML;
    } else {
      section.setAttribute("data-original-html", section.innerHTML);
    }

    const text = section.textContent.toLowerCase();
    const shouldShow = text.includes(filter);

    section.style.display = shouldShow ? "block" : "none";

    //if (filter && shouldShow) {
    //  const regex = new RegExp(`(${filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    //  section.innerHTML = section.innerHTML.replace(regex, '<span class="highlight">$1</span>');
    //}
	if (filter && shouldShow) {
	  const regex = new RegExp(`(${filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");

	  const imgs = [];
	  let html = section.innerHTML;

	  // 1) išimam <img> į laikinas žymes be jokio base64
	  html = html.replace(/<img\b[^>]*>/gi, (match) => {
		imgs.push(match);
		return `[[[IMG:${imgs.length - 1}]]]`;
	  });

	  // 2) highlightinam tik tekstą
	  html = html.replace(regex, '<span class="highlight">$1</span>');

	  // 3) grąžinam <img> atgal
	  html = html.replace(/\[\[\[IMG:(\d+)\]\]\]/g, (m, idx) => imgs[Number(idx)] ?? m);

	  section.innerHTML = html;
	}
  });
}
//Paieškos laukelio trynimas
function clearSearch() {
  const input = document.getElementById("searchBox");
  input.value = "";
  filterSections();
  toggleClearButton(); // paslėpsim mygtuką
}
//susije su paieška
function toggleClearButton() {
  const input = document.getElementById("searchBox");
  const clearBtn = document.getElementById("clearSearch");
  clearBtn.style.display = input.value ? "inline" : "none";
}

// 🔄 Service Worker – atnaujinimų aptikimas
let newWorker;
let serviceWorkerRegistration;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    console.log("[App] SW užregistruotas");
    serviceWorkerRegistration = reg;

    if (reg.waiting) {
      console.log("[App] Rasta laukianti versija");
      newWorker = reg.waiting;
      showUpdateNotification();
    }

    reg.addEventListener("updatefound", () => {
      console.log("[App] Rasta nauja versija");
      newWorker = reg.installing;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          console.log("[App] Nauja versija paruošta, rodome pranešimą");
          showUpdateNotification();
        }
      });
    });

    // 👇 Versijos numerio paspaudimas
    const vElement = document.querySelector(".version");
    if (vElement) {
      vElement.style.cursor = "pointer";
      vElement.title = "Patikrinti ar yra nauja versija";
      vElement.addEventListener("click", () => {
        console.log("[App] Versijos numeris paspaustas – tikrinam atnaujinimus");
        serviceWorkerRegistration.update();

        setTimeout(() => {
          if (!serviceWorkerRegistration.waiting) {
            showNoUpdateNotification();
          }
        }, 1500);
      });
    }
  });
}

// 🧾 Pranešimas apie NAUJĄ versiją
function showUpdateNotification() {
  const toast = document.createElement("div");
  toast.id = "updateNotification";
  toast.innerHTML = `
    <span>Yra nauja versija</span>
    <button id="reloadBtn">Atnaujinti</button>
  `;
  document.body.appendChild(toast);

  document.getElementById("reloadBtn").onclick = () => {
    if (newWorker) {
      console.log("[App] Spaustas 'Atnaujinti', siunčiam skipWaiting()");
      newWorker.postMessage({ action: "skipWaiting" });
    }
  };
}

// 🧾 Pranešimas kai NAUJINIMO NĖRA
function showNoUpdateNotification() {
  const toast = document.createElement("div");
  toast.id = "updateNotification";
  toast.innerHTML = `
    <span>Naudojate naujausią versiją 👌</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadSections();
});

async function loadSections() {
  const container = document.getElementById('content');
  if (!container) {
    console.error('Neradau #content. Patikrink ar yra <main id="content">');
    return;
  }

  try {
    const res = await fetch('sections/manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status} ${res.statusText}`);

    const files = await res.json();

    for (const file of files) {
      const r = await fetch(file, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Section fetch failed (${file}): ${r.status} ${r.statusText}`);

      const html = await r.text();
      container.insertAdjacentHTML('beforeend', html);
    }

    // jei turi init po įkėlimo, kviesk čia:
    // initSearch(); initScrollSpy(); ...
  } catch (e) {
    container.innerHTML = '<p>Nepavyko užkrauti turinio.</p>';
    console.error(e);
  }
}
