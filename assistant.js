/* Insurance assistant: usable informational mode, optional same-origin Qwen backend. */
(() => {
  "use strict";
  const shell = document.getElementById("insurance-assistant");
  if (!shell) return;
  const toggle = shell.querySelector(".ai-toggle");
  const panel = shell.querySelector(".ai-panel");
  const close = shell.querySelector(".ai-close");
  const messages = shell.querySelector(".ai-messages");
  const form = shell.querySelector(".ai-form");
  const input = shell.querySelector(".ai-input");
  const submit = shell.querySelector(".ai-send");
  const modeLabel = shell.querySelector(".ai-mode");
  const endpoint = document.documentElement.dataset.aiEndpoint || "";
  const entities = {
    home: {name:"MyHome от KMIC",url:"https://www.kmic.kz/product/MyHome_Comprehensive_Property_Insurance_Program"},
    auto: {name:"ОС ГПО ВТС от KupiPolis",url:"https://kupipolis.kz/ru/osgpo/ogpo/"}
  };
  const sensitive = /(?:\b\d{12}\b|(?:\d[\s-]?){16,19}|\+?7[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i;
  let busy = false;
  let latestFocus = null;

  function addMessage(text, role, action) {
    const item = document.createElement("div");
    item.className = "ai-message ai-message-" + role;
    const body = document.createElement("p");
    body.textContent = text;
    item.appendChild(body);
    if (action && entities[action]) {
      const controls = document.createElement("div");
      controls.className = "ai-message-actions";
      const choose = document.createElement("button");
      choose.type = "button"; choose.textContent = "Открыть нашу форму";
      choose.addEventListener("click", () => {
        setOpen(false);
        const pick = document.querySelector('[data-open-product="' + action + '"]');
        if (pick) pick.click();
      });
      const official = document.createElement("a");
      official.href = entities[action].url;
      official.target = "_blank"; official.rel = "noopener noreferrer";
      official.textContent = "Официальная форма ↗";
      controls.append(choose,official); item.appendChild(controls);
    }
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }
  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) { latestFocus = document.activeElement; input.focus(); }
    else if (latestFocus && typeof latestFocus.focus === "function") latestFocus.focus();
  }
  function localAnswer(question) {
    const q = question.toLowerCase().replace(/ё/g,"е");
    if (/1414|кдп|sms|смс|авторизац|верификац/.test(q))
      return {text:"Подтверждение через 1414 запускает только уполномоченная система. Наш сайт не выполняет проверку личности и не получает результат КДП. Для этого потребуется официальная интеграция."};
    if (/тумар|tumar|фридом|freedom|бонус|малус|класс/.test(q))
      return {text:"Доступ промоутера Tumar не равен разрешению на подключение API. Класс бонус-малус и статус полиса можно получать автоматически только из официально разрешённого источника."};
    if (/дом|квартир|недвиж|имуществ|myhome|kmic|казахмыс/.test(q))
      return {text:"Для квартиры или дома есть программа MyHome от KMIC. У нас можно выбрать тип недвижимости и регион, затем перейти к официальной заявке для ввода персональных данных.",action:"home"};
    if (/машин|автомоб|авто|огпо|осгпо|осаго|kupipolis|купи|госномер/.test(q))
      return {text:"Для обязательной ответственности автовладельца рассмотрите ОС ГПО ВТС от KupiPolis. На нашем сайте выбираются общие параметры, а точный расчёт выполняется в официальной системе.",action:"auto"};
    if (/стоим|цен|сколько|рассчит|посчит|тариф|сумм/.test(q))
      return {text:"Точную страховую премию я сейчас не рассчитываю: тарифы и подтверждённые данные страхователя из системы страховщика недоступны. Не буду показывать выдуманную цену.",action:"auto"};
    if (/оплат|полис|договор|скача|приложени/.test(q))
      return {text:"Оплата и выпуск полиса происходят в разрешённой системе страховщика или брокера. На preview.asia пока нет приёма платежей и выдачи полисов."};
    return {text:"Могу помочь выбрать страхование имущества MyHome или автострахование ОС ГПО ВТС, объяснить 1414 и порядок оформления. Не отправляйте ИИН, номер телефона, банковские данные или SMS-коды."};
  }
  async function ask(question) {
    if (busy || !question) return;
    if (sensitive.test(question)) {
      addMessage("Не отправляйте в чат ИИН, телефон, адрес электронной почты, банковские реквизиты или коды из SMS. Сформулируйте вопрос без личных данных.", "bot");
      return;
    }
    addMessage(question, "user");
    busy = true; submit.disabled = true; input.disabled = true;
    if (endpoint) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        let result;
        try { result = await fetch(endpoint, {
          method:"POST",credentials:"same-origin",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({message:question}), signal:controller.signal
        }); } finally { clearTimeout(timeout); }
        if (!result.ok) throw new Error("Backend unavailable");
        const data = await result.json();
        if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Empty reply");
        addMessage(data.answer.slice(0,1600),"bot");
        modeLabel.textContent = "Qwen · справочные ответы";
      } catch (_) {
        addMessage("Сейчас нет соединения с локальным Qwen. Перехожу к встроенной справке.", "bot");
        const response = localAnswer(question);
        addMessage(response.text,"bot",response.action);
        modeLabel.textContent = "Справочный режим · без Qwen";
      }
    } else {
      const answer = localAnswer(question);
      addMessage(answer.text,"bot",answer.action);
    }
    busy = false; input.disabled = false; submit.disabled = false; input.focus();
  }
  toggle.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  panel.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  form.addEventListener("submit",e => {
    e.preventDefault();
    const question=input.value.trim().slice(0,350);
    input.value="";
    if (question) void ask(question);
  });
  shell.querySelectorAll("[data-ai-question]").forEach(b =>
    b.addEventListener("click", () => void ask(b.dataset.aiQuestion))
  );
  modeLabel.textContent = endpoint ? "Qwen · ожидает соединения" : "Справочный режим · без Qwen";
  addMessage("Здравствуйте. Помогу выбрать MyHome или ОС ГПО ВТС и разобраться в порядке оформления. Персональные и платёжные данные сюда не присылайте.", "bot");
})();