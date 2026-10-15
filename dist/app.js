(() => {
  'use strict';
  // Интерфейс получает все формулы и расчёты из solver.js; алгоритмы здесь не дублируются.
  const {variants,methods,solve,reference}=Optimization;
  const $=id=>document.getElementById(id);
  const format=(n,digits=6)=>Number.isFinite(n)?n.toLocaleString('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits,useGrouping:false}):'—';
  const compact=n=>Math.abs(n)>0&&Math.abs(n)<.00001?n.toExponential(3).replace('.',','):format(n);
  // Текущее состояние страницы: вариант, режим, выбранный метод и просмотренный шаг.
  let current=variants[0],mode='budget',method='golden',results=[],ref,stepIndex=0,allSteps=false,plotScales=window.OptimizationPlotScales||{};
  // 1. Выбор варианта: обновляем условие, независимый минимум и все результаты.
  // Номер в адресе #variant=N позволяет открыть нужное решение по прямой ссылке.
  function chooseVariant(id) {
    current=variants.find(v=>v.id===Number(id))||variants[0];
    mode=current.budget?'budget':'epsilon';
    $('variant-number').textContent=current.id;
    document.title=`Вариант ${current.id} · Лабораторная №1 · Оптимизация`;
    document.querySelectorAll('.variant-button').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.id)===current.id)));
    $('mobile-variant').value=current.id;
    $('formula').innerHTML=`<span class="function-prefix">f(x) = </span>${current.formula}`;
    $('interval').textContent=`[${current.a}; ${current.b}]`;
    $('parameter-label').textContent=current.budget?'Число экспериментов':'Точность решения';
    $('parameter-value').textContent=current.budget?`N = ${current.budget}`:`ε = ${format(current.epsilon,4)}`;
    $('condition-label').textContent=current.budget?'Задано число экспериментов N':'Задана точность ε';
    $('plot-interval').textContent=`x ∈ [${current.a}; ${current.b}]`;
    ref=reference(current);
    $('reference-x').textContent=format(ref.x,8);
    $('reference-y').textContent=format(ref.y,8);
    const notice=current.id===10?'Особенность варианта 10: функция сначала возрастает, затем убывает и снова возрастает. Она не унимодальна на [0; 3]. Глобальный минимум подтверждается сравнением стационарных точек и концов отрезка; стандартная гарантия интервальных методов на исходном отрезке не действует.':current.id===6?'Вариант 6: в x = 0,2 функция имеет излом. Интервальные методы применимы к этой выпуклой функции; метод касательных из методички требует дифференцируемости и здесь не применяется.':'';
    $('variant-notice').hidden=!notice;$('variant-notice').textContent=notice;
    renderPlot();renderAnalytic();updateMode();calculate();
    if(location.hash!==`#variant=${current.id}`)history.replaceState(null,'',`#variant=${current.id}`);
  }
  // 2. Настройка поля ввода: целое N либо положительная точность ε.
  function updateMode() {
    $('budget-mode').setAttribute('aria-pressed',String(mode==='budget'));
    $('epsilon-mode').setAttribute('aria-pressed',String(mode==='epsilon'));
    $('setting-label').textContent=mode==='budget'?'N =':'ε =';
    const input=$('setting-value');input.value=mode==='budget'?current.budget||22:current.epsilon||.001;
    input.min=mode==='budget'?3:.0000001;input.max=mode==='budget'?10000:1;input.step=mode==='budget'?1:'any';
  }
  // 3. Запускаем все восемь методов с одинаковыми параметрами сравнения.
  // Ошибку ввода показываем рядом с формой, сохраняя ранее выведенную таблицу.
  function calculate() {
    const value=Number($('setting-value').value),options=mode==='budget'?{mode,budget:value}:{mode,epsilon:value};
    try {results=methods.map(m=>solve(current,m.id,options));$('settings-error').textContent='';}
    catch(e){$('settings-error').textContent=e.message;return;}
    $('comparison-caption').textContent=mode==='budget'?`При N = ${value} сравниваем длину оставшегося интервала.`:`При ε = ${compact(value)} сравниваем количество вычислений функции.`;
    // Недоступные методы и результаты без достигнутой точности не участвуют в выборе.
    // При фиксированном N лучше меньший L, при фиксированном ε — меньше вызовов f.
    const eligible=results.filter(r=>!r.unavailable&&r.converged);
    const score=r=>mode==='budget'?r.length:r.evaluations;
    const best=Math.min(...eligible.map(score));
    const winners=eligible.filter(r=>Math.abs(score(r)-best)<=Math.max(1e-14,Math.abs(best)*1e-10));
    $('results-body').innerHTML=results.map((r,i)=>{
      const m=methods[i],selected=r.method===method,isBest=winners.includes(r);
      const button=`<button type="button" class="method-button" data-method="${m.id}" aria-pressed="${selected}"><span class="letter">${m.letter}</span><span>${m.short}</span>${isBest?'<span class="best-tag">лучший результат</span>':''}</button>`;
      if(r.unavailable)return `<tr class="unavailable-row ${selected?'selected-row':''}"><td>${button}</td><td colspan="5">${r.reason}</td></tr>`;
      return `<tr class="${selected?'selected-row':''}"><td>${button}</td><td class="result-number">${format(r.x)}</td><td class="result-number">${format(r.y)}</td><td class="result-number">${compact(r.length)}</td><td class="result-number">${r.evaluations}${r.numericalStop?' *':''}</td><td class="result-number">${r.derivatives||'—'}</td></tr>`;
    }).join('');
    const names=winners.map(r=>methods.find(m=>m.id===r.method).short).join(', ');
    $('comparison-conclusion').textContent=mode==='budget'?`Наименьший интервал: ${names}. L = ${compact(best)}.${winners.some(r=>r.derivatives)?' У касательных дополнительно учитывайте вычисления производной.':''}`:`Меньше всего вызовов f: ${names} (${best}).${winners.some(r=>r.derivatives)?' Для касательных нужны также вызовы f′.':''}`;
    if(current.nonunimodal)$('comparison-conclusion').textContent+=' Для этого варианта учитывайте отсутствие гарантии унимодальности.';
    showMethod(method);
  }
  // 4. Подробное решение выбранного метода: формула, итоговый интервал и счётчики.
  // При переключении сначала показываем последний шаг, затем можно пройти весь поиск.
  function showMethod(id) {
    method=id;const m=methods.find(m=>m.id===id),r=results.find(r=>r.method===id);
    document.querySelectorAll('.method-button').forEach(button=>{const active=button.dataset.method===id;button.setAttribute('aria-pressed',String(active));button.closest('tr').classList.toggle('selected-row',active);});
    $('method-select').value=id;
    $('method-letter').textContent=`МЕТОД ${m.letter.toUpperCase()}`;
    $('method-title').textContent=m.name;$('method-description').textContent=m.description;$('method-equation').textContent=m.equation;
    $('steps-details').hidden=!!r.unavailable;
    if(r.unavailable){$('method-result').textContent=r.reason;$('plot-points').innerHTML='';return;}
    let text=`Итоговый интервал: <code>[${format(r.a,8)}; ${format(r.b,8)}]</code>. Берём его середину: <code>x̃ = ${format(r.x,8)}</code>, <code>f(x̃) = ${format(r.y,8)}</code>.`;
    text+=`<br>Вызовов функции: <b>${r.evaluations}</b>${r.derivatives?`, производной: <b>${r.derivatives}</b>`:''}. ${current.nonunimodal?'Половина длины интервала': 'Граница погрешности L/2'}: <code>${compact(r.errorBound)}</code>.`;
    if(r.method==='dichotomy'||r.method==='passive'||r.method==='fibonacci')text+=` δ = ${r.delta.toExponential(3).replace('.',',')}.`;
    if(r.numericalStop)text+='<br>* Поиск остановлен: различие значений функции достигло машинной точности. Интервал сохранён без недостоверного сужения.';
    if(!r.converged)text+='<br>Заданная точность не достигнута; учитывайте ограничение вычислительной точности.';
    $('method-result').innerHTML=text;
    stepIndex=Math.max(0,r.steps.length-1);allSteps=false;
    $('step-count').textContent=`${r.steps.length} шагов`;
    $('step-slider').max=Math.max(1,r.steps.length);$('step-slider').value=stepIndex+1;
    renderSteps();renderStep();
  }
  // 5. Таблица журнала из solver.js. Первые 35 строк ограничивают размер страницы;
  // остальные раскрываются кнопкой без повторного расчёта.
  // Ползунок меняет только просмотр журнала, а не повторяет вычисления метода.
  // Координаты полосы интервала выражены в процентах исходного отрезка варианта.
  function renderSteps() {
    const r=results.find(r=>r.method===method),rows=allSteps?r.steps:r.steps.slice(0,35);
    $('steps-body').innerHTML=rows.map((s,i)=>`<tr class="${i===stepIndex?'step-active':''}" data-step="${i}"><td>${s.iteration}</td><td>${format(s.a)}</td><td>${format(s.b)}</td><td>${compact(s.length)}</td><td>${s.points.map(p=>`x = ${format(p.x)}<br>f = ${format(p.y)}`).join('<br>')}</td><td>${s.evaluations}</td></tr>`).join('');
    $('more-steps').hidden=allSteps||r.steps.length<=35;
    if(!$('more-steps').hidden)$('more-steps').textContent=`Показать все ${r.steps.length} шагов`;
  }
  function renderStep() {
    const r=results.find(r=>r.method===method);if(!r||r.unavailable||!r.steps.length)return;
    stepIndex=Math.min(Math.max(0,stepIndex),r.steps.length-1);const s=r.steps[stepIndex];
    $('step-slider').value=stepIndex+1;$('step-label').textContent=`${stepIndex+1} / ${r.steps.length}`;
    $('step-explanation').textContent=`${s.note}. Интервал: [${format(s.a)}; ${format(s.b)}], L = ${compact(s.length)}.`;
    const position=x=>(x-current.a)/(current.b-current.a)*100,left=position(s.a),right=position(s.b);
    $('step-interval').innerHTML=`<div class="interval-band" style="left:${left}%;width:${right-left}%"></div><div class="interval-bound" style="left:0"><span>${current.a}</span></div><div class="interval-bound" style="left:100%"><span>${current.b}</span></div><div class="interval-bound" style="left:${left}%"></div><div class="interval-bound" style="left:${right}%"></div><div class="interval-ref" style="left:${position(ref.x)}%" title="x* = ${format(ref.x)}"></div>`;
    document.querySelectorAll('#steps-body tr').forEach(row=>row.classList.toggle('step-active',Number(row.dataset.step)===stepIndex));
    $('previous-step').disabled=stepIndex===0;$('next-step').disabled=stepIndex===r.steps.length-1;
    renderPlotPoints();
  }
  // 6. Загружаем подготовленный Python-график и накладываем фактические точки поиска.
  function renderPlot() {
    $('plot-image').src=`plots/variant-${String(current.id).padStart(2,'0')}.svg`;
    $('plot-image').alt=`График ${current.plain} на отрезке [${current.a}; ${current.b}] с точкой минимума x* = ${format(ref.x,6)}`;
    renderPlotPoints();
  }
  function renderPlotPoints() {
    const result=results.find(item=>item.method===method),scale=plotScales[current.id];
    $('plot-points').innerHTML=result&&!result.unavailable?OptimizationPlot.renderSearchPoints(result.steps,stepIndex,scale):'';
  }
  // 7. Контрольное решение через аналитическую производную, границы и изломы.
  // Оно объясняет эталонный ответ отдельно от приближений восьми методов.
  function renderAnalytic() {
    const v=current;
    let explanation=v.id===6?'На [0; 0,2) производная −4 − e^(0,2−x) отрицательна. На (0,2; 2] уравнение производной даёт x* = 0,2 + ln 4. Проверяем также точку излома x = 0,2.':v.id===7?'На [0; 2] имеем |x−2| = 2−x. Производная обращается в ноль при x* = 2 − ln 1,4, а вторая производная положительна.':v.id===9?'На [−1; 0] имеем |x| = −x. Производная обращается в ноль при x* = −ln 10 / 10. Вторая производная 100e^(10x) положительна.':v.id===10?'У производной две стационарные точки: локальный максимум и локальный минимум. Сравниваем значения в обеих точках и на концах [0; 3]. Минимальное из них определяет глобальное решение.': 'Функция строго выпукла на заданном отрезке. Производная меняет знак с минуса на плюс, поэтому её единственный ноль — точка глобального минимума. Корень найден бисекцией аналитической производной; проверяем значения на концах отрезка.';
    let candidates=ref.candidates.slice().sort((a,b)=>a.x-b.x).filter((p,i,a)=>i===0||Math.abs(p.x-a[i-1].x)>1e-9);
    $('analytic-solution').innerHTML=`<div class="analytic"><p>${explanation}</p><div class="derivative">f′(x) = ${v.derivative}</div>${v.exact?`<p><code>${v.exact}</code>.</p>`:''}<div class="candidates">${candidates.map(p=>`<div class="candidate ${Math.abs(p.x-ref.x)<1e-9?'winner':''}">x = ${format(p.x,6)}<b>f(x) = ${format(p.y,8)}</b></div>`).join('')}</div><p>Получаем <code>x* ≈ ${format(ref.x,10)}</code> и <code>f(x*) ≈ ${format(ref.y,10)}</code>. Это независимая проверка для сопоставления с приближениями численных методов.</p></div>`;
  }
  // 8. Создаём элементы выбора и связываем действия пользователя с функциями выше.
  $('variants').innerHTML=variants.map(v=>`<button class="variant-button" type="button" data-id="${v.id}" aria-current="false"><span class="number">${String(v.id).padStart(2,'0')}</span><span>Вариант ${v.id}</span><span class="variant-type">${v.budget?'N':'ε'}</span></button>`).join('');
  $('mobile-variant').innerHTML=variants.map(v=>`<option value="${v.id}">${v.id}</option>`).join('');
  $('method-select').innerHTML=methods.map(m=>`<option value="${m.id}">${m.short}</option>`).join('');
  $('variants').addEventListener('click',e=>{const button=e.target.closest('[data-id]');if(button)chooseVariant(button.dataset.id);});
  $('mobile-variant').addEventListener('change',e=>chooseVariant(e.target.value));
  $('results-body').addEventListener('click',e=>{const button=e.target.closest('[data-method]');if(button)showMethod(button.dataset.method);});
  $('method-select').addEventListener('change',e=>showMethod(e.target.value));
  $('settings').addEventListener('submit',e=>{e.preventDefault();calculate();});
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;updateMode();calculate();}));
  $('step-slider').addEventListener('input',e=>{stepIndex=Number(e.target.value)-1;renderStep();});
  $('previous-step').addEventListener('click',()=>{stepIndex--;renderStep();});
  $('next-step').addEventListener('click',()=>{stepIndex++;renderStep();});
  $('more-steps').addEventListener('click',()=>{allSteps=true;renderSteps();});
  window.addEventListener('hashchange',()=>chooseVariant(Number(location.hash.match(/variant=(\d+)/)?.[1]||1)));
  chooseVariant(Number(location.hash.match(/variant=(\d+)/)?.[1]||1));
  // Необязательная интеграция WebMCP: выбор варианта меняет состояние страницы,
  // чтение результатов возвращает уже рассчитанную таблицу без нового поиска.
  if(document.modelContext?.registerTool) {
    const controller=new AbortController();
    const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}};
    register({name:'show_optimization_variant',title:'Показать вариант',description:'Выбрать один из десяти вариантов лабораторной и показать его решение.',inputSchema:{type:'object',properties:{variant:{type:'integer',minimum:1,maximum:10}},required:['variant'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!Number.isInteger(input?.variant)||input.variant<1||input.variant>10)throw new Error('Номер варианта должен быть от 1 до 10');chooseVariant(input.variant);return{variant:current.id,minimum:ref.x,value:ref.y,mode};}});
    register({name:'read_optimization_results',title:'Результаты оптимизации',description:'Прочитать результаты уже выбранного варианта и режима сравнения.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({variant:current.id,mode,results:results.map(({method,x,y,length,evaluations,derivatives,unavailable,reason})=>({method,x,y,length,evaluations,derivatives,unavailable,reason}))})});
    window.addEventListener('pagehide',()=>controller.abort(),{once:true});
  }
})();
