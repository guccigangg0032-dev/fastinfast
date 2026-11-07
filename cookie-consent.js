/* First-party consent and optional convenience preferences. No analytics or ad scripts. */
(() => {
  "use strict";
  const CHOICE_KEY = "fastinfast_cookie_choice_v1";
  const PREFERENCES_KEY = "fastinfast_guide_preferences_v1";
  const POLICY_VERSION = "2026-11-07";
  const CHOICE_TTL = 180 * 24 * 60 * 60 * 1000;
  const PREFERENCES_TTL = 90 * 24 * 60 * 60 * 1000;
  const storage = {
    read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    write(key, value) { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } },
    remove(key) { try { localStorage.removeItem(key); } catch (_) {} }
  };
  const readChoice = () => {
    try {
      const data = JSON.parse(storage.read(CHOICE_KEY) || "null");
      if (!data || data.version !== POLICY_VERSION || !["all","essential"].includes(data.mode)
        || typeof data.updatedAt !== "number" || Date.now() - data.updatedAt > CHOICE_TTL
        || data.updatedAt > Date.now() + 60000) return null;
      return data.mode;
    } catch (_) { return null; }
  };
  let choice = readChoice();
  const notice = document.createElement("section");
  notice.className = "cookie-notice";
  notice.id = "cookieNotice";
  notice.hidden = true;
  notice.setAttribute("role", "region");
  notice.setAttribute("aria-labelledby", "cookieNoticeTitle");
  notice.innerHTML = `
    <button class="cookie-notice-close" type="button" data-cookie-close aria-label="Закрыть уведомление">×</button>
    <div class="cookie-notice-top"><span class="cookie-notice-icon" aria-hidden="true">✓</span><h2 id="cookieNoticeTitle">Конфиденциальность и cookie</h2></div>
    <p>Мы используем хранилище браузера, чтобы запомнить ваш выбор. С вашего разрешения сайт также сохранит выбранную страховую и тему видеоинструкции для удобства. <strong>Рекламных и аналитических cookie сейчас нет.</strong> Подробнее в <a href="privacy.html">Политике конфиденциальности</a>.</p>
    <div class="cookie-notice-details"><strong>Необходимые:</strong> запись решения о cookie.<br><strong>Дополнительные:</strong> сохранение темы инструкции и выбранной страховой только на вашем устройстве.</div>
    <div class="cookie-notice-actions">
      <button class="cookie-notice-reject" type="button" data-cookie-essential>Только необходимые</button>
      <button class="cookie-notice-accept" type="button" data-cookie-all>Принять</button>
    </div>`;
  document.body.appendChild(notice);
  const company = document.getElementById("guideCompanyChoice");
  const guide = document.getElementById("guideChoice");
  function persistOptionalPreferences(){
    if (choice !== "all" || !company || !guide) return;
    storage.write(PREFERENCES_KEY, JSON.stringify({
      guide: guide.value, company: company.value, updatedAt: Date.now()
    }));
  }
  function restoreOptionalPreferences(){
    if (choice !== "all" || !company || !guide) return;
    try {
      const saved = JSON.parse(storage.read(PREFERENCES_KEY) || "null");
      if (!saved || Date.now() - saved.updatedAt > PREFERENCES_TTL) return;
      if ([...guide.options].some(x => x.value === saved.guide)) guide.value = saved.guide;
      if ([...company.options].some(x => x.value === saved.company)) company.value = saved.company;
    } catch (_) {}
  }
  function saveChoice(mode){
    choice = mode;
    storage.write(CHOICE_KEY, JSON.stringify({mode, version: POLICY_VERSION, updatedAt: Date.now()}));
    if (mode === "essential") storage.remove(PREFERENCES_KEY);
    else persistOptionalPreferences();
    notice.hidden = true;
    document.dispatchEvent(new CustomEvent("fastinfast:cookie-choice", {detail: {mode}}));
  }
  notice.querySelector("[data-cookie-essential]").addEventListener("click",()=>saveChoice("essential"));
  notice.querySelector("[data-cookie-all]").addEventListener("click",()=>saveChoice("all"));
  notice.querySelector("[data-cookie-close]").addEventListener("click",()=>{notice.hidden=true});
  document.querySelectorAll("[data-cookie-settings]").forEach(button=>{
    button.addEventListener("click",()=>{notice.hidden=false;notice.querySelector("[data-cookie-essential]").focus()});
  });
  if (company) company.addEventListener("change",persistOptionalPreferences);
  if (guide) guide.addEventListener("change",persistOptionalPreferences);
  restoreOptionalPreferences();
  if (!choice) notice.hidden = false;
})();
