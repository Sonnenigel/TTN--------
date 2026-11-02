/* ============================================================
   terraterm v2 — script
   + working calculator (index + calculator.html)
   ============================================================ */

(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* Мобильное меню */
  function initMenu() {
    const b = $('#burger'), n = $('#nav');
    if (!b || !n) return;
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      n.classList.toggle('open', !open);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && n.classList.contains('open')) {
        b.setAttribute('aria-expanded', 'false');
        n.classList.remove('open');
        b.focus();
      }
    });
  }

  /* Маска телефона */
  function maskPhone(input) {
    input.addEventListener('input', (e) => {
      let d = e.target.value.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (!d.startsWith('7')) d = '7' + d;
      d = d.slice(0, 11);
      let o = '+7';
      if (d.length > 1) o += ' (' + d.slice(1, 4);
      if (d.length >= 5) o += ') ' + d.slice(4, 7);
      if (d.length >= 8) o += '-' + d.slice(7, 9);
      if (d.length >= 10) o += '-' + d.slice(9, 11);
      e.target.value = o;
    });
  }
  function initMasks() { $$('input[type="tel"]').forEach(maskPhone); }

  /* КАЛЬКУЛЯТОР — работающая логика */
  function initCalculator() {
    const root = $('#calcFull') || $('#calc-preview');
    if (!root) return;

    const state = {
      area: 150,
      fuel: 'gas',
      system: 'rad',
      insul: 'good',
      floors: 1,
      pipe: 'tee'
    };

    // Удельные теплопотери Вт/м² по утеплению и этажности (упрощённая модель)
    const qByInsul = {
      good:   { 1: 55, 2: 60, 3: 65 },  // хорошее утепление
      normal: { 1: 75, 2: 82, 3: 88 },  // среднее
      weak:   { 1: 100, 2: 110, 3: 118 } // слабое
    };

    // Коэффициент стоимости оборудования, материалов, работ (₽/м²)
    const priceByFuel = {
      gas:      { equip: 3200, mat: 1800, work: 2200, project: 300 },
      electric: { equip: 1500, mat: 1600, work: 2000, project: 280 },
      tt:       { equip: 2400, mat: 1900, work: 2100, project: 300 },
      hp:       { equip: 7200, mat: 2400, work: 2600, project: 400 }
    };

    // Множитель по схеме
    const systemMult = { rad: 1.0, floor: 1.15, both: 1.25 };

    // Множитель по разводке
    const pipeMult = { tee: 1.0, collector: 1.12 };

    function fmt(n) {
      return new Intl.NumberFormat('ru-RU').format(Math.round(n / 1000) * 1000) + ' ₽';
    }

    function calc() {
      // Теплопотери
      const q = (qByInsul[state.insul] || qByInsul.good)[state.floors] || 60;
      const heatLoss = (state.area * q) / 1000; // кВт
      // Мощность котла с запасом 20%
      const boilerPower = Math.ceil((heatLoss * 1.2) / 1) * 1; // кВт, округляем до целого

      // Стоимость
      const base = priceByFuel[state.fuel];
      const mult = systemMult[state.system] * pipeMult[state.pipe];

      const equip   = state.area * base.equip * mult;
      const mat     = state.area * base.mat * mult;
      const work    = state.area * base.work * mult;
      const project = state.area * base.project;

      const total = equip + mat + work + project;

      // Обновление DOM (на index и calculator)
      const scope = root;
      const setTxt = (sel, val) => { const el = $(sel, scope); if (el) el.textContent = val; };

      const powerEl = $('#resPower', scope);
      if (powerEl) {
        powerEl.innerHTML = boilerPower + '<span>кВт</span>';
      }
      setTxt('#resHeat', `Теплопотери: ${heatLoss.toFixed(1)} кВт · запас мощности ×1,2`);
      setTxt('#resEquip', fmt(equip));
      setTxt('#resMat', fmt(mat));
      setTxt('#resWork', fmt(work));
      setTxt('#resProj', fmt(project));
      setTxt('#resTotal', fmt(total));

      // Обновить подпись кнопки CTA
      const cta = $('#calcCTA', scope);
      if (cta) {
        cta.href = `#lead?power=${boilerPower}&area=${state.area}&total=${Math.round(total)}`;
      }
    }

    // Слайдер площади
    const area = $('#area', root);
    const areaVal = $('#areaVal', root);
    if (area) {
      area.addEventListener('input', () => {
        state.area = Number(area.value);
        if (areaVal) areaVal.textContent = state.area + ' м²';
        calc();
      });
    }

    // Чипы (fuel / system / insul / floors / pipe)
    function initChips(containerId, key, castFn) {
      const box = $('#' + containerId, root);
      if (!box) return;
      box.addEventListener('click', (e) => {
        const chip = e.target.closest('.calc__chip');
        if (!chip) return;
        const attr = chip.dataset[key] || chip.dataset.fuel || chip.dataset.system
                  || chip.dataset.insul || chip.dataset.floors || chip.dataset.pipe;
        $$('.calc__chip', box).forEach(c => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        state[castFn.key] = castFn.cast(attr);
        calc();
      });
    }

    initChips('fuelChips', 'fuel',  { key: 'fuel',   cast: v => v });
    initChips('systemChips', 'system',{ key: 'system', cast: v => v });
    initChips('insulChips', 'insul', { key: 'insul',  cast: v => v });
    initChips('floorChips', 'floors',{ key: 'floors', cast: v => Number(v) });
    initChips('pipeChips', 'pipe',   { key: 'pipe',   cast: v => v });

    // Первый расчёт
    calc();
  }

  /* Формы с aria-live */
  function initForms() {
    $$('.cta-band__form, .cta-banner__form').forEach((form) => {
      const input = $('input[type="tel"]', form);
      const btn = $('button', form);
      if (!input || !btn) return;
      const status = document.createElement('div');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.style.cssText = 'font-size:12px;margin-top:8px;min-height:16px;font-family:var(--mono);';
      form.appendChild(status);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const phone = (input.value || '').trim();
        const digits = phone.replace(/\D/g, '');
        if (digits.length !== 11) {
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          status.style.color = '#FECACA';
          status.textContent = 'Укажите телефон в формате +7 (___) ___-__-__.';
          return;
        }
        input.setAttribute('aria-invalid', 'false');
        console.log('LEAD:', { phone, source: window.location.pathname });
        status.style.color = '#86EFAC';
        status.textContent = 'Спасибо. Свяжемся в течение 15 минут.';
        input.value = '';
      });
    });
  }

  function boot() {
    initMenu();
    initMasks();
    initCalculator();
    initForms();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* ============================================================
   v2.1 — quiz multi-step, catalog filters
   ============================================================ */

/* КВИЗ 5 ШАГОВ */
function initQuizPage() {
  const quiz = document.getElementById('quiz');
  if (!quiz) return;

  const steps = quiz.querySelectorAll('.quiz-step');
  const bars = quiz.querySelectorAll('.quiz-progress__bar');
  let current = 1;
  const answers = {};

  function showStep(n) {
    steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === n));
    bars.forEach(b => b.classList.toggle('done', Number(b.dataset.step) <= n));
    current = n;
    window.scrollTo({ top: quiz.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  }

  quiz.addEventListener('change', (e) => {
    if (e.target.matches('input[type="radio"]')) {
      answers[e.target.name] = e.target.value;
    }
  });

  quiz.addEventListener('click', (e) => {
    if (e.target.matches('[data-next]')) {
      if (current < 5) showStep(current + 1);
    }
    if (e.target.matches('[data-prev]')) {
      if (current > 1) showStep(current - 1);
    }
    if (e.target.id === 'quizSubmit') {
      const name = document.getElementById('qName')?.value.trim();
      const phone = document.getElementById('qPhone')?.value.trim();
      const digits = (phone || '').replace(/\D/g, '');
      if (!name || name.length < 2) { alert('Укажите имя.'); return; }
      if (digits.length !== 11) { alert('Укажите телефон в формате +7 (___) ___-__-__.'); return; }

      answers.name = name;
      answers.phone = phone;
      answers.email = document.getElementById('qEmail')?.value.trim() || '';

      // Расчёт вилки (упрощённо)
      const area = Number(answers.area) || 150;
      const fuel = answers.fuel || 'gas';
      const system = answers.system || 'rad';
      let low = area * 3200;
      let high = area * 4600;
      if (fuel === 'hp') { low *= 1.8; high *= 1.8; }
      if (fuel === 'electric') { low *= 0.75; high *= 0.85; }
      if (system === 'floor') { low *= 1.1; high *= 1.15; }
      if (system === 'both') { low *= 1.2; high *= 1.25; }

      const fmt = n => new Intl.NumberFormat('ru-RU').format(Math.round(n / 1000) * 1000);
      const range = document.getElementById('resultRange');
      if (range) range.innerHTML = `${fmt(low)} – <span>${fmt(high)}</span> ₽`;

      console.log('QUIZ LEAD:', answers);
      showStep('result');
      // Здесь: fetch('/api/lead', ...)
    }
  });

  // Маска телефона в квизе
  const phone = document.getElementById('qPhone');
  if (phone) {
    phone.addEventListener('input', (e) => {
      let d = e.target.value.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (!d.startsWith('7')) d = '7' + d;
      d = d.slice(0, 11);
      let o = '+7';
      if (d.length > 1) o += ' (' + d.slice(1, 4);
      if (d.length >= 5) o += ') ' + d.slice(4, 7);
      if (d.length >= 8) o += '-' + d.slice(7, 9);
      if (d.length >= 10) o += '-' + d.slice(9, 11);
      e.target.value = o;
    });
  }
}

/* ФИЛЬТРЫ КАТАЛОГА (демо) */
function initCatalogFilters() {
  const filters = document.querySelector('.filters');
  if (!filters) return;
  filters.addEventListener('change', () => {
    // Заглушка: здесь — фильтрация карточек по data-атрибутам
    console.log('Filters changed');
  });
}

/* ФИЛЬТРЫ ПОРТФОЛИО (демо) */
function initPortfolioFilters() {
  const wrap = document.querySelector('.portfolio-filters');
  if (!wrap) return;
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    wrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
}

/* Старт всех новых компонентов */
const origBoot = window.__terratermBoot;
window.addEventListener('DOMContentLoaded', () => {
  initQuizPage();
  initCatalogFilters();
  initPortfolioFilters();
});