const supportedLanguages = ["zh-Hans", "zh-Hant", "en", "ja", "ko", "fr", "de", "es"];
const languageSelect = document.querySelector("#languageSelect");
const productShot = document.querySelector("#productShot");
const descriptionMeta = document.querySelector('meta[name="description"]');
const browserLocale = (navigator.languages?.[0] || navigator.language || "en-US").toLowerCase();

const baseText = {};
document.querySelectorAll("[data-i18n]").forEach(element => {
  baseText[element.dataset.i18n] ??= element.textContent;
});

const baseHTML = {};
document.querySelectorAll("[data-i18n-html]").forEach(element => {
  baseHTML[element.dataset.i18nHtml] ??= element.innerHTML;
});

const appStoreURL = "macappstore://itunes.apple.com/app/id6759540480?mt=12&l=us";

function detectedLanguage(locale) {
  if (/^zh-(tw|hk|mo|hant)/.test(locale)) return "zh-Hant";
  if (locale.startsWith("zh")) return "zh-Hans";
  return supportedLanguages.find(language => language !== "zh-Hans" && language !== "zh-Hant" && locale.startsWith(language)) || "en";
}

function savedLanguage() {
  try {
    const saved = localStorage.getItem("keylaunch.language");
    return supportedLanguages.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}

function persistLanguage(language) {
  try {
    localStorage.setItem("keylaunch.language", language);
  } catch {
    // The selected language still applies for the current page in private browsing modes.
  }
}

function applyLanguage(language, shouldPersist = false) {
  const resolvedLanguage = supportedLanguages.includes(language) ? language : "en";
  const strings = resolvedLanguage === "zh-Hans" ? null : window.siteTranslations[resolvedLanguage] || window.siteTranslations.en;

  document.documentElement.lang = resolvedLanguage;
  languageSelect.value = resolvedLanguage;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    element.textContent = strings?.[key] ?? baseText[key];
  });

  document.querySelectorAll("[data-i18n-html]").forEach(element => {
    const key = element.dataset.i18nHtml;
    element.innerHTML = strings?.[key] ?? baseHTML[key];
  });

  const usesChineseScreenshot = resolvedLanguage === "zh-Hans" || resolvedLanguage === "zh-Hant";
  productShot.src = usesChineseScreenshot ? "assets/keylaunch-window-zh.webp" : "assets/keylaunch-window-en.webp";
  productShot.alt = strings?.["shot.alt"] ?? "键启应用界面，键盘上设置了多个 macOS 系统 App 快捷键";

  document.title = strings?.["meta.title"] ?? "KeyLaunch — 一键启动常用 App";
  descriptionMeta.content = strings?.["meta.description"] ?? "KeyLaunch 是一款轻量级 macOS 键盘启动器，让常用 App 一键即达。";
  document.querySelectorAll("[data-app-store-link]").forEach(link => {
    link.href = appStoreURL;
  });

  if (shouldPersist) persistLanguage(resolvedLanguage);
}

languageSelect.addEventListener("change", event => {
  applyLanguage(event.target.value, true);
});

applyLanguage(savedLanguage() || detectedLanguage(browserLocale));

document.querySelectorAll("[data-copy]").forEach(button => {
  button.addEventListener("click", async () => {
    const textToCopy = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(textToCopy);
      const textSpan = button.querySelector('[data-i18n="install.copy"]') || button.querySelector("span");
      if (textSpan) {
        const originalText = textSpan.textContent;
        const currentLang = document.documentElement.lang || "zh-Hans";
        const copiedText = window.siteTranslations?.[currentLang]?.["install.copied"] || "已复制！";
        textSpan.textContent = copiedText;
        button.classList.add("copied");
        setTimeout(() => {
          textSpan.textContent = originalText;
          button.classList.remove("copied");
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to copy command:", err);
    }
  });
});


const productFrame = document.querySelector(".product-shot-frame");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let tiltFrame = 0;

function resetProductTilt() {
  cancelAnimationFrame(tiltFrame);
  productFrame.classList.remove("is-tracking", "is-pressed");
  productFrame.style.setProperty("--tilt-x", "0deg");
  productFrame.style.setProperty("--tilt-y", "0deg");
  productFrame.style.setProperty("--shift-x", "0px");
  productFrame.style.setProperty("--shift-y", "0px");
}

productFrame.addEventListener("pointermove", event => {
  if (reduceMotion.matches || event.pointerType === "touch") return;
  const bounds = productFrame.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
  cancelAnimationFrame(tiltFrame);
  tiltFrame = requestAnimationFrame(() => {
    productFrame.classList.add("is-tracking");
    productFrame.style.setProperty("--tilt-x", `${(0.5 - y) * 6}deg`);
    productFrame.style.setProperty("--tilt-y", `${(x - 0.5) * 7}deg`);
    productFrame.style.setProperty("--shift-x", `${(x - 0.5) * 5}px`);
    productFrame.style.setProperty("--shift-y", `${(y - 0.5) * 5}px`);
  });
});

productFrame.addEventListener("pointerleave", resetProductTilt);
productFrame.addEventListener("pointerdown", event => {
  if (!reduceMotion.matches && event.pointerType !== "touch") productFrame.classList.add("is-pressed");
});
productFrame.addEventListener("pointerup", () => productFrame.classList.remove("is-pressed"));
productFrame.addEventListener("pointercancel", resetProductTilt);
reduceMotion.addEventListener("change", resetProductTilt);

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
