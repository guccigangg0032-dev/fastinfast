(() => {
"use strict";
const menu=document.querySelector(".menu-toggle"), nav=document.getElementById("primary-navigation");
const closeMenu=()=>{nav?.classList.remove("is-open");menu?.setAttribute("aria-expanded","false");menu?.setAttribute("aria-label","Открыть меню")};
menu?.addEventListener("click",()=>{const open=menu.getAttribute("aria-expanded")!=="true";nav?.classList.toggle("is-open",open);menu.setAttribute("aria-expanded",String(open));menu.setAttribute("aria-label",open?"Закрыть меню":"Открыть меню")});
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMenu));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
document.addEventListener("click",e=>{if(nav&&menu&&!nav.contains(e.target)&&!menu.contains(e.target))closeMenu()});
document.getElementById("year")?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
const search=document.getElementById("guideInsurerSearch"), filters=[...document.querySelectorAll("[data-guide-filter]")], cards=[...document.querySelectorAll(".guide-insurer")];
let currentFilter="all";
function applyFilters(){const q=(search?.value||"").toLocaleLowerCase("ru").trim();let visible=0;for(const card of cards){const matches=(card.dataset.name||"").includes(q)&&(currentFilter==="all"||(currentFilter==="other"?card.dataset.kind!=="direct":card.dataset.kind==="direct"));card.hidden=!matches;if(matches)visible++}const empty=document.getElementById("guideEmpty");if(empty)empty.hidden=visible>0}
search?.addEventListener("input",applyFilters);
filters.forEach(b=>b.addEventListener("click",()=>{currentFilter=b.dataset.guideFilter;filters.forEach(x=>{const yes=x===b;x.classList.toggle("is-selected",yes);x.setAttribute("aria-pressed",String(yes))});applyFilters()}));
const choice=document.getElementById("guideChoice"), company=document.getElementById("guideCompanyChoice"), output=document.getElementById("guideOrderResult"), text=document.getElementById("guideOrderText"), status=document.getElementById("guideOrderStatus");
document.querySelectorAll("[data-guide]").forEach(b=>b.addEventListener("click",()=>{if(choice)choice.value=b.dataset.guide;document.getElementById("order")?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});choice?.focus({preventScroll:true})}));
document.getElementById("guidePrepareOrder")?.addEventListener("click",()=>{const guide=choice?.value||"ОГПО с нуля",insurer=company?.value||"Любая страховая";if(text)text.value="Здравствуйте! Хочу приобрести видеоинструкцию Fast Insurance Online.\nТема: "+guide+"\nСтраховщик: "+insurer+"\nПодскажите, пожалуйста, стоимость, наличие, способ оплаты и получения видео.";if(output)output.hidden=false;if(status)status.textContent="Заявка сформирована только на вашем устройстве. Она ещё не отправлена."});
document.getElementById("guideShareOrder")?.addEventListener("click",async()=>{if(!text?.value)return;const value=text.value;try{if(navigator.share){await navigator.share({title:"Запрос видеоинструкции",text:value});if(status)status.textContent="Передача текста зависит от выбранного приложения.";return}}catch(e){if(e?.name==="AbortError")return}try{await navigator.clipboard.writeText(value);if(status)status.textContent="Текст заявки скопирован. Отправьте его продавцу самостоятельно."}catch(_){text.focus();text.select();if(status)status.textContent="Выделите и скопируйте текст вручную."}});
})();