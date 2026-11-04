/* Quote UI: public parameters only. No IIN, 1414, payments, or secret credentials. */
(() => {
  "use strict";
  const form = document.getElementById("inlineQuote");
  const sidebar = document.querySelector(".quote-sidebar");
  const amount = sidebar?.querySelector(".quote-amount strong");
  const explanation = sidebar?.querySelector(".quote-amount p");
  const status = document.getElementById("quoteStatus");
  const button = sidebar?.querySelector(".quote-disabled");
  if (!form || !sidebar || !status || !button || !amount || !explanation) return;

  const insurers = Object.freeze({
    halyk: { name: "Halyk Insurance", url: "https://skhalyk.kz/categories/auto/ogpo-ad", label: "Открыть официальный калькулятор Halyk" },
    nomad: { name: "NOMAD Insurance", url: "https://nomad.kz/", label: "Открыть сайт NOMAD (калькулятор не подтверждён)" },
    eurasia: { name: "СК «Евразия»", url: "https://eurasia36.kz/Eurasia/?open=calc", label: "Открыть официальный калькулятор Евразии" }
  });
  // Public endpoint configuration only: credentials belong on the server.
  const configuration = window.INSURANCE_QUOTE_CONFIG || {};
  const rawBase = typeof configuration.apiBaseUrl === "string" ? configuration.apiBaseUrl.trim() : "";
  let apiBase = "";
  try {
    if (rawBase) {
      const parsed = new URL(rawBase, window.location.origin);
      if (parsed.protocol !== "https:" && !(parsed.hostname === "localhost" && parsed.protocol === "http:")) throw new Error("HTTPS required");
      apiBase = parsed.origin;
    }
  } catch (_) { apiBase = ""; }
  let inFlight = false;
  let controller = null;

  const official = document.createElement("a");
  official.className = "button button-dark quote-official-link";
  official.target = "_blank";
  official.rel = "noopener noreferrer";
  official.setAttribute("aria-describedby", "quoteReturnInfo");
  sidebar.appendChild(official);

  const returnInfo = document.createElement("p");
  returnInfo.id = "quoteReturnInfo";
  returnInfo.className = "quote-return-info";
  returnInfo.textContent = "Страница страховщика откроется отдельно. Наша вкладка останется открытой; после расчёта вернитесь к ней через переключение вкладок. Цена между сайтами автоматически не передаётся.";
  sidebar.appendChild(returnInfo);

  function selectedInsurer() {
    const selected = form.querySelector('input[name="insurer"]:checked');
    return selected && insurers[selected.value] ? selected.value : "halyk";
  }
  function reset() {
    if (controller) { controller.abort(); controller = null; }
    inFlight = false;
    amount.textContent = "Не рассчитана";
    explanation.textContent = "Точная стоимость появится только после ответа страховщика.";
    status.textContent = apiBase
      ? "Можно запросить стоимость у подключённого страховщика. Без ИИН и персональных данных."
      : "Автоматический расчёт не подключён. Используйте официальный сайт страховой.";
    button.disabled = !apiBase;
    button.classList.toggle("quote-disabled", !apiBase);
    button.textContent = "Рассчитать стоимость";
    official.href = insurers[selectedInsurer()].url;
    official.textContent = insurers[selectedInsurer()].label + " ↗";
  }
  form.addEventListener("change", reset);

  // Keep the pre-existing form behaviour: avoid payment/issuance until verified by the insurer.
  button.addEventListener("click", async () => {
    if (inFlight || !apiBase) return;
    const insurer = selectedInsurer();
    const product = document.getElementById("quoteKind")?.value || "";
    const region = document.getElementById("quoteRegion")?.value || "";
    const vehicle = document.getElementById("quoteCar")?.value || "";
    const startDate = document.getElementById("quoteStartDate")?.value || "";
    if (!region || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      status.textContent = "Укажите регион регистрации и дату начала полиса.";
      return;
    }
    if (product !== "ОГПО ВТС") {
      status.textContent = "Для КАСКО требуется индивидуальный расчёт у страховщика.";
      return;
    }
    inFlight = true;
    controller = new AbortController();
    const currentController = controller;
    const timeout = setTimeout(() => currentController.abort(), 15000);
    button.disabled = true;
    button.textContent = "Получаем расчёт…";
    status.textContent = "Запрашиваем стоимость у страховщика. Без выпуска полиса и оплаты.";
    try {
      const response = await fetch(apiBase + "/api/insurance/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ insurer, product, region, vehicle, startDate }),
        signal: currentController.signal,
        cache: "no-store",
        credentials: "omit"
      });
      let result = {};
      try { result = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(response.status === 503 ? "Страховщик пока не подключён." : "Расчёт недоступен. Попробуйте позже.");
      const premium = Number(result.premiumKzt);
      if (!Number.isFinite(premium) || premium <= 0 || result.insurer !== insurer || result.currency !== "KZT") {
        throw new Error("Страховщик вернул неполные данные. Цена не показана.");
      }
      amount.textContent = new Intl.NumberFormat("ru-KZ", {style:"currency",currency:"KZT",maximumFractionDigits:0}).format(premium);
      explanation.textContent = "Расчёт от " + insurers[insurer].name + ". Окончательная премия подтверждается страховщиком.";
      status.textContent = "Предварительная стоимость получена. Это не полис и не подтверждение оплаты.";
    } catch (error) {
      if (currentController.signal.aborted && controller !== currentController) return;
      amount.textContent = "Не рассчитана";
      status.textContent = currentController.signal.aborted ? "Время ожидания истекло." : (error?.message || "Не удалось получить расчёт.");
    } finally {
      clearTimeout(timeout);
      if (controller === currentController) {
        controller = null; inFlight = false;
        button.disabled = false;
        button.textContent = "Рассчитать стоимость";
      }
    }
  });
  reset();
})();