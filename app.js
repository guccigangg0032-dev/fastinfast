/* Fast Insurance Online — frontend interaction only. No backend, analytics or lead storage. */
(function(){
  "use strict";
  const config = Object.freeze({
    // Configure only after confirming the number belongs to the business and
    // publishing a lawful personal-data notice appropriate to the integration.
    whatsappNumber: "",
    publicEmail: ""
  });
  const $ = (selector) => document.querySelector(selector);
  const menuButton = $(".menu-toggle");
  const nav = $("#primary-navigation");
  const form = $("#requestForm");
  const dialog = $("#requestDialog");
  const closeButton = $("#dialogClose");
  const copyButton = $("#copyRequest");
  const messageBox = $("#preparedMessage");
  const dialogDescription = $("#dialogDescription");
  const dialogStatus = $("#dialogStatus");
  const hint = $("#formHint");
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  function closeMenu(){
    if (!menuButton || !nav) return;
    nav.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Открыть меню");
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", function(){
      const open = menuButton.getAttribute("aria-expanded") === "true";
      if (open) closeMenu();
      else {
        nav.classList.add("is-open");
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Закрыть меню");
      }
    });
    nav.querySelectorAll("a").forEach(function(link){
      link.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function(event){
      if (event.key === "Escape") closeMenu();
    });
    document.addEventListener("click", function(event){
      if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
    window.addEventListener("resize", function(){
      if (window.innerWidth > 780) closeMenu();
    });
  }

  const product = $("#clientProduct");
  document.querySelectorAll(".solution-card").forEach(function(card, index){
    card.querySelectorAll('a[href="#request"]').forEach(function(link){
      link.addEventListener("click", function(){
        if (!product) return;
        product.value = ["ОГПО ВТС", "КАСКО (при наличии)", "Консультация"][index] || "";
      });
    });
  });

  function fieldValue(id){
    const el = document.getElementById(id);
    return el && typeof el.value === "string" ? el.value.trim() : "";
  }

  function makeRequestText(){
    const rows = [
      "Здравствуйте! Хочу уточнить условия автострахования через Fast Insurance Online.",
      "",
      "Имя: " + fieldValue("clientName"),
      "Телефон: " + fieldValue("clientPhone"),
      "Вид: " + fieldValue("clientProduct")
    ];
    if (fieldValue("clientCity")) rows.push("Город: " + fieldValue("clientCity"));
    if (fieldValue("clientMessage")) rows.push("Вопрос: " + fieldValue("clientMessage"));
    rows.push("", "Прошу связаться со мной для консультации.");
    return rows.join("\n");
  }

  function showError(msg, field){
    if (hint) {
      hint.textContent = msg;
      hint.style.color = "#ba4438";
    }
    if (field) field.focus();
  }

  if (form && dialog && messageBox) {
    if (config.whatsappNumber) {
      const actionButton = $("#submitLabel");
      if (actionButton) actionButton.textContent = "Продолжить в WhatsApp";
      if (hint) hint.textContent = "При продолжении текст обращения будет открыт в WhatsApp. Перед отправкой проверьте его.";
    }
    form.addEventListener("submit", function(event){
      event.preventDefault();
      const name = $("#clientName");
      const phone = $("#clientPhone");
      const consent = $("#clientConsent");
      const selectedProduct = $("#clientProduct");
      if (!name.value.trim() || name.value.trim().length < 2) {
        showError("Пожалуйста, укажите ваше имя (минимум два символа).", name);
        return;
      }
      const digits = phone.value.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 15) {
        showError("Проверьте номер телефона: нужно от 10 до 15 цифр.", phone);
        return;
      }
      if (!selectedProduct.value) {
        showError("Выберите вид страховки.", selectedProduct);
        return;
      }
      if (!consent.checked) {
        showError("Для продолжения подтвердите согласие в форме.", consent);
        return;
      }
      if (hint) {
        hint.textContent = "Обращение сформировано на вашем устройстве. Автоматическая отправка пока не подключена.";
        hint.style.color = "#647383";
      }
      const text = makeRequestText();
      messageBox.value = text;
      if (dialogStatus) dialogStatus.textContent = "";
      if (config.whatsappNumber && /^\d{10,15}$/.test(config.whatsappNumber)) {
        dialogDescription.textContent = "Заявка ещё не отправлена. Нажмите кнопку ниже, чтобы открыть WhatsApp и самостоятельно подтвердить отправку.";
        copyButton.textContent = "Открыть WhatsApp ↗";
        copyButton.dataset.action = "whatsapp";
      } else if (config.publicEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.publicEmail)) {
        dialogDescription.textContent = "Заявка ещё не отправлена. Вы можете открыть ваше почтовое приложение и отправить письмо.";
        copyButton.textContent = "Открыть почту ↗";
        copyButton.dataset.action = "email";
      } else {
        dialogDescription.textContent = "Заявка ещё не отправлена и не сохранена на сервере. Скопируйте текст, чтобы передать его менеджеру, когда контакты будут подключены.";
        copyButton.textContent = "Скопировать текст ↗";
        copyButton.dataset.action = "copy";
      }
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    });
  }

  function closeDialog(){
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }
  if (closeButton) closeButton.addEventListener("click", closeDialog);
  if (dialog) dialog.addEventListener("click", function(event){
    if (event.target === dialog) closeDialog();
  });
  if (copyButton) copyButton.addEventListener("click", async function(){
    const action = copyButton.dataset.action || "copy";
    if (action === "whatsapp") {
      const url = "https://wa.me/" + config.whatsappNumber + "?text=" + encodeURIComponent(messageBox.value);
      const newTab = window.open(url, "_blank", "noopener,noreferrer");
      if (!newTab) window.location.href = url;
      if (dialogStatus) dialogStatus.textContent = "Откройте WhatsApp и подтвердите отправку сами.";
      return;
    }
    if (action === "email") {
      window.location.href = "mailto:" + config.publicEmail + "?subject=" + encodeURIComponent("Запрос по автострахованию") + "&body=" + encodeURIComponent(messageBox.value);
      if (dialogStatus) dialogStatus.textContent = "Откройте почтовое приложение и отправьте письмо.";
      return;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(messageBox.value);
      } else {
        messageBox.focus();
        messageBox.select();
        if (!document.execCommand("copy")) throw new Error("Copy unsuccessful");
      }
      if (dialogStatus) dialogStatus.textContent = "Текст скопирован. Заявка пока не отправлена.";
    } catch (_) {
      messageBox.focus();
      messageBox.select();
      if (dialogStatus) dialogStatus.textContent = "Выделен текст обращения. Используйте стандартную команду «Копировать».";
    }
  });
})();
