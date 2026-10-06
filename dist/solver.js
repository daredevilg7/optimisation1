(function(root) {
  'use strict';
  const variants = [
    {id:1,formula:'x² + 6e<sup>0,15x</sup>',plain:'x² + 6 exp(0.15x)',a:-1,b:0,budget:22,f:x=>x*x+6*Math.exp(.15*x),d:x=>2*x+.9*Math.exp(.15*x),derivative:'2x + 0,9e<sup>0,15x</sup> = 0'},
    {id:2,formula:'x² + 4e<sup>−0,25x</sup>',plain:'x² + 4 exp(−0.25x)',a:0,b:1,budget:23,f:x=>x*x+4*Math.exp(-.25*x),d:x=>2*x-Math.exp(-.25*x),derivative:'2x − e<sup>−0,25x</sup> = 0'},
    {id:3,formula:'x⁴ + 0,4 arctg(5x)',plain:'x⁴ + 0.4 arctg(5x)',a:-1,b:0,budget:20,f:x=>x**4+.4*Math.atan(5*x),d:x=>4*x**3+2/(1+25*x*x),derivative:'4x³ + 2/(1 + 25x²) = 0'},
    {id:4,formula:'x⁴ − 1,5 arctg(x)',plain:'x⁴ − 1.5 arctg(x)',a:0,b:1,budget:21,f:x=>x**4-1.5*Math.atan(x),d:x=>4*x**3-1.5/(1+x*x),derivative:'4x³ − 1,5/(1 + x²) = 0'},
    {id:5,formula:'x² + 8e<sup>0,55x</sup>',plain:'x² + 8 exp(0.55x)',a:-2,b:0,epsilon:.001,f:x=>x*x+8*Math.exp(.55*x),d:x=>2*x+4.4*Math.exp(.55*x),derivative:'2x + 4,4e<sup>0,55x</sup> = 0'},
    {id:6,formula:'−4x + e<sup>|x−0,2|</sup>',plain:'−4x + exp(|x−0.2|)',a:0,b:2,epsilon:.0015,f:x=>-4*x+Math.exp(Math.abs(x-.2)),d:x=>-4+(x<.2?-1:1)*Math.exp(Math.abs(x-.2)),derivative:'x > 0,2: −4 + e<sup>x−0,2</sup> = 0',exact:'x* = 0,2 + ln 4',kinks:[.2]},
    {id:7,formula:'1,4x + e<sup>|x−2|</sup>',plain:'1.4x + exp(|x−2|)',a:0,b:2,epsilon:.005,f:x=>1.4*x+Math.exp(Math.abs(x-2)),d:x=>1.4-Math.exp(2-x),derivative:'x < 2: 1,4 − e<sup>2−x</sup> = 0',exact:'x* = 2 − ln 1,4'},
    {id:8,formula:'x² + e<sup>x</sup>',plain:'x² + exp(x)',a:-1,b:0,budget:18,f:x=>x*x+Math.exp(x),d:x=>2*x+Math.exp(x),derivative:'2x + e<sup>x</sup> = 0'},
    {id:9,formula:'|x| + e<sup>10x</sup>',plain:'|x| + exp(10x)',a:-1,b:0,epsilon:.001,f:x=>Math.abs(x)+Math.exp(10*x),d:x=>-1+10*Math.exp(10*x),derivative:'x < 0: −1 + 10e<sup>10x</sup> = 0',exact:'x* = −ln 10 / 10'},
    {id:10,formula:'10 cos(x) + e<sup>x</sup>',plain:'10 cos(x) + exp(x)',a:0,b:3,epsilon:.0005,f:x=>10*Math.cos(x)+Math.exp(x),d:x=>-10*Math.sin(x)+Math.exp(x),derivative:'−10 sin(x) + e<sup>x</sup> = 0',nonunimodal:true}
  ];
  const methods = [
    {id:'passive',letter:'а',name:'Пассивный оптимальный поиск',short:'Пассивный',description:'Все точки выбираются заранее. Для нечётного N — равномерная сетка; для чётного — близкие пары точек. Минимум локализуется между соседями лучшей точки.',equation:'Нечётное N: xᵢ = a + i(b−a)/(N+1). Чётное N=2k: x₂ᵢ = a + i(b−a)/(k+1), x₂ᵢ₋₁ = x₂ᵢ − δ.'},
    {id:'block',letter:'б',name:'Равномерный блочный поиск',short:'Блочный (n = 5)',description:'В каждом блоке пять равномерных внутренних точек. Для следующего интервала выбираются соседи лучшей точки; значение в середине переиспользуется.',equation:'xᵢ = a + i(b−a)/6, i = 1,…,5. Новый отрезок: [xⱼ₋₁, xⱼ₊₁].'},
    {id:'halving',letter:'в',name:'Деление интервала пополам',short:'Деление пополам',description:'Сравниваем середину и две четверти интервала. Сохраняем половину с минимумом; центральное значение используется повторно.',equation:'x₁ = (a+c)/2, c = (a+b)/2, x₃ = (c+b)/2. Lₖ = L₀ / 2ᵏ.'},
    {id:'dichotomy',letter:'г',name:'Метод дихотомии',short:'Дихотомия',description:'Два эксперимента около середины позволяют выбрать левую или правую половину. Малое δ сохраняет различие между точками.',equation:'x₁ = (a+b)/2 − δ; x₂ = (a+b)/2 + δ. Если f(x₁) ≤ f(x₂), b = x₂; иначе a = x₁.'},
    {id:'golden',letter:'д',name:'Метод золотого сечения',short:'Золотое сечение',description:'Точки делят интервал в золотом отношении. После первых двух экспериментов каждый следующий шаг требует одного нового вычисления функции.',equation:'τ = (√5−1)/2. x₁ = b − τ(b−a), x₂ = a + τ(b−a).'},
    {id:'fibonacci',letter:'е',name:'Метод Фибоначчи',short:'Фибоначчи',description:'Бюджет определяется до начала поиска. Расположение точек задают числа Фибоначчи. На последнем шаге совпадающие точки разделяются малым δ.',equation:'F₀ = F₁ = 1; Fₙ = Fₙ₋₁ + Fₙ₋₂. x₁ = a + (Fₙ₋₂/Fₙ)(b−a), x₂ = a + (Fₙ₋₁/Fₙ)(b−a).'},
    {id:'tangent',letter:'ж',name:'Метод касательных',short:'Касательные',description:'Для выпуклой дифференцируемой функции находим пересечение касательных в концах интервала. Знак производной в новой точке определяет следующий интервал.',equation:'c = [f(a)−f(b)−af′(a)+bf′(b)] / [f′(b)−f′(a)].'},
    {id:'parabolic',letter:'з',name:'Метод парабол',short:'Параболы',description:'Строим параболу через три точки с внутренней лучшей точкой и проверяем её вершину. При совпадении вершины и средней точки берём точку в более длинной половине.',equation:'t = c + ½[(b−c)²(f(a)−f(c)) − (c−a)²(f(b)−f(c))] / [(b−c)(f(a)−f(c)) + (c−a)(f(b)−f(c))].'}
  ];

  function bisectDerivative(v,a,b) {
    for(let i=0;i<80;i++) { const c=(a+b)/2; if(v.d(c)<0) a=c; else b=c; }
    return (a+b)/2;
  }
  function reference(v) {
    const candidates=[v.a,v.b,...(v.kinks||[])];
    let prev=v.a, dp=v.d(prev);
    for(let i=1;i<=1000;i++) {
      const x=v.a+(v.b-v.a)*i/1000, dx=v.d(x);
      if(dp<=0 && dx>=0) candidates.push(bisectDerivative(v,prev,x));
      if(dp>0 && dx<0 && !(v.kinks||[]).some(k=>k>=prev&&k<=x)) {
        let a=prev,b=x;
        for(let j=0;j<80;j++){const c=(a+b)/2;if(v.d(c)>0)a=c;else b=c;}
        candidates.push((a+b)/2);
      }
      prev=x;dp=dx;
    }
    const x=candidates.reduce((best,x)=>v.f(x)<v.f(best)?x:best,candidates[0]);
    return {x,y:v.f(x),candidates:candidates.map(x=>({x,y:v.f(x)}))};
  }

  function solve(v,method,options={}) {
    const mode=options.mode || (v.budget?'budget':'epsilon');
    const epsilon=options.epsilon??v.epsilon??.001, budget=options.budget??v.budget??22;
    if(!methods.some(m=>m.id===method))throw new Error('Неизвестный метод');
    if(!['budget','epsilon'].includes(mode))throw new Error('Неизвестный режим');
    if(mode==='epsilon'&&(!Number.isFinite(epsilon)||epsilon<=0||epsilon<1e-7))throw new Error('Точность должна быть от 0,0000001');
    if(mode==='budget'&&(!Number.isInteger(budget)||budget<3||budget>10000))throw new Error('N должно быть целым числом от 3 до 10 000');
    if(method==='tangent'&&[6,10].includes(v.id)) return {method,unavailable:true,reason:v.id===6?'В x = 0,2 производная не существует. Метод из методички требует дифференцируемости на всём отрезке.':'Функция не выпукла на всём [0; 3]: f″(0) = −9. Предпосылки метода не выполнены.'};
    let a=v.a,b=v.b,count=0,derivatives=0,numericalStop=false;
    const steps=[],samples=[];
    const max=mode==='budget'?budget:100000;
    const target=mode==='epsilon'?2*epsilon:0;
    const delta=mode==='epsilon'?epsilon*.001:(v.b-v.a)*1e-8;
    function evalf(x){if(count>=max)throw new Error('Превышен бюджет поиска');const y=v.f(x);count++;samples.push({x,y});return y;}
    function evald(x){derivatives++;return v.d(x);}
    function log(points,note){steps.push({iteration:steps.length+1,a,b,length:b-a,evaluations:count,points:points.map(p=>({x:p.x,y:p.y})),note});}
    const done=()=>b-a<=target || b-a<=1e-14 || steps.length>=10000;

    if(method==='passive') {
      let N=mode==='budget'?budget:Math.max(3,Math.ceil((b-a)/epsilon)-1);
      if(mode==='epsilon'&&N%2===0)N++;
      if(N>100000)throw new Error('Слишком много экспериментов для пассивного поиска. Увеличьте ε.');
      const points=[];
      if(N%2) for(let i=1;i<=N;i++){const x=a+i*(b-a)/(N+1);points.push({x,y:evalf(x)});}
      else {const k=N/2;for(let i=1;i<=k;i++){const x=a+i*(b-a)/(k+1);points.push({x:x-delta,y:evalf(x-delta)},{x,y:evalf(x)});}}
      let j=0;for(let i=1;i<points.length;i++)if(points[i].y<points[j].y)j=i;
      const left=j?points[j-1].x:a,right=j+1<points.length?points[j+1].x:b;
      // One row per actual experiment; show the final bracket only on the last row.
      points.forEach((p,i)=>steps.push({iteration:i+1,a,b,length:b-a,evaluations:i+1,points:[p],note:'Эксперимент на заранее заданной сетке'}));
      a=left;b=right;
      Object.assign(steps[steps.length-1],{a,b,length:b-a,note:'Соседи лучшей точки образуют итоговый интервал'});
    } else if(method==='block'||method==='halving') {
      const n=method==='block'?5:3;
      let c=(a+b)/2,yc=evalf(c);
      while(!done()&&count+n-1<=max) {
        const points=[{x:a,y:Infinity}];
        for(let i=1;i<=n;i++){const x=a+i*(b-a)/(n+1);points.push(i===(n+1)/2?{x:c,y:yc}:{x,y:evalf(x)});}
        points.push({x:b,y:Infinity});
        let j=1;for(let i=2;i<=n;i++)if(points[i].y<points[j].y)j=i;
        a=points[j-1].x;b=points[j+1].x;c=points[j].x;yc=points[j].y;
        log(points.slice(1,-1),'Сохраняем соседей точки с наименьшим значением');
      }
    } else if(method==='dichotomy') {
      while(!done()&&count+2<=max) {
        const c=(a+b)/2,d=Math.min(delta,(b-a)/8),x1=c-d,x2=c+d,y1=evalf(x1),y2=evalf(x2);
        if(y1<=y2)b=x2;else a=x1;
        log([{x:x1,y:y1},{x:x2,y:y2}],y1<=y2?'f(x₁) ≤ f(x₂): сохраняем левый интервал':'f(x₁) > f(x₂): сохраняем правый интервал');
      }
    } else if(method==='golden'||method==='fibonacci') {
      const tau=(Math.sqrt(5)-1)/2;
      const fib=[1,1];let horizon=mode==='budget'?budget:3;
      while(fib.length<=horizon)fib.push(fib.at(-1)+fib.at(-2));
      if(method==='fibonacci'&&mode==='epsilon') while((b-a)/fib[horizon]+delta>target){horizon++;fib.push(fib.at(-1)+fib.at(-2));}
      const limit=method==='fibonacci'?Math.min(max,horizon):max;
      let remaining=horizon;
      let x1=method==='golden'?b-tau*(b-a):a+fib[remaining-2]/fib[remaining]*(b-a);
      let x2=method==='golden'?a+tau*(b-a):a+fib[remaining-1]/fib[remaining]*(b-a);
      let y1=evalf(x1),y2=evalf(x2);
      while(!done()) {
        const points=[{x:x1,y:y1},{x:x2,y:y2}],left=y1<=y2;
        if(left)b=x2;else a=x1;
        log(points,left?'f(x₁) ≤ f(x₂): сохраняем [a; x₂]':'f(x₁) > f(x₂): сохраняем [x₁; b]');
        if(done()||count>=limit)break;
        remaining--;
        if(left){x2=x1;y2=y1;x1=method==='golden'?b-tau*(b-a):a+fib[remaining-2]/fib[remaining]*(b-a);if(x1>=x2-1e-14)x1=Math.max(a+(b-a)*1e-10,x2-Math.min(delta,(x2-a)/2));y1=evalf(x1);}
        else{x1=x2;y1=y2;x2=method==='golden'?a+tau*(b-a):a+fib[remaining-1]/fib[remaining]*(b-a);if(x2<=x1+1e-14)x2=Math.min(b-(b-a)*1e-10,x1+Math.min(delta,(b-x1)/2));y2=evalf(x2);}
      }
    } else if(method==='tangent') {
      let ya=evalf(a),yb=evalf(b),da=evald(a),db=evald(b);
      while(!done()&&count<max) {
        let c=(ya-yb-a*da+b*db)/(db-da);
        if(!Number.isFinite(c)||c<=a||c>=b)c=(a+b)/2;
        const y=evalf(c),d=evald(c);
        if(d===0){a=c;b=c;log([{x:c,y}],'f′(c) = 0: точный минимум');break;}
        if(d<0){a=c;ya=y;da=d;}else{b=c;yb=y;db=d;}
        log([{x:c,y}],d<0?'f′(c) < 0: минимум правее c':'f′(c) > 0: минимум левее c');
      }
    } else if(method==='parabolic') {
      let ya=evalf(a),yb=evalf(b),c=(a+b)/2,yc=evalf(c);
      while((yc>ya||yc>yb)&&count<max) {
        if(ya<yb){b=c;yb=yc;}else{a=c;ya=yc;}
        c=(a+b)/2;yc=evalf(c);
        log([{x:c,y:yc}],'Предварительная локализация тройки: f(c) ≤ f(a), f(c) ≤ f(b)');
      }
      while(!done()&&count<max) {
        const ac=c-a,bc=b-c,den=bc*(ya-yc)+ac*(yb-yc);
        let x=c+.5*(bc*bc*(ya-yc)-ac*ac*(yb-yc))/den,guard=false;
        // A vanishing displacement cannot shrink a finite bracket reliably.
        const minMove=Math.max(1e-6*(1+Math.abs(c)),mode==='epsilon'?epsilon*.02:1e-6);
        if(!Number.isFinite(x)||x<=a||x>=b||Math.abs(x-c)<minMove){x=ac>=bc?(a+c)/2:(c+b)/2;guard=true;}
        const y=evalf(x);
        if(Math.abs(y-yc)<=8*Number.EPSILON*Math.max(1,Math.abs(y),Math.abs(yc))){
          numericalStop=true;
          log([{x,y},{x:c,y:yc}],'Различие значений меньше машинной точности: сохраняем последний достоверный интервал');
          break;
        }
        if(x<c){if(y<yc){b=c;yb=yc;c=x;yc=y;}else{a=x;ya=y;}}
        else {if(y<yc){a=c;ya=yc;c=x;yc=y;}else{b=x;yb=y;}}
        log([{x,y},{x:c,y:yc}],guard?'Вершина почти совпала с c: берём середину более длинной половины':'Обновляем тройку по положению и значению вершины параболы');
      }
    }
    const x=(a+b)/2;
    return {method,a,b,x,y:v.f(x),length:b-a,errorBound:(b-a)/2,evaluations:count,derivatives,steps,samples,delta,numericalStop,horizon:method==='fibonacci'?count:undefined,converged:mode==='budget'||b-a<=target+1e-13,warning:v.nonunimodal?'На исходном отрезке нет гарантии унимодальности. Интервал проверен относительно независимого глобального решения.':null};
  }
  const api={variants,methods,solve,reference};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.Optimization=api;
})(typeof globalThis!=='undefined'?globalThis:this);
