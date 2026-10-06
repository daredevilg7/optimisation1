const test = require('node:test');
const assert = require('node:assert/strict');
let core;
try { core = require('../dist/solver.js'); } catch { core = {}; }
const expected = [-.422374121267,.447120435731,-.440478597143,.642635911106,-1.161443363440,1.586294361120,1.663527763379,-.351733711249,-.230258509299,2.134500043775];

test('Все варианты дают независимо проверенные глобальные минимумы', () => {
  assert.equal(core.variants?.length,10,'Нужны 10 функций из PDF');
  core.variants.forEach((v,i) => {
    const ref = core.reference(v);
    assert.ok(Math.abs(ref.x - expected[i]) < 1e-9,`Вариант ${v.id}`);
    assert.ok(Math.abs(v.d(ref.x)) < 1e-9,`Производная в минимуме ${v.id}`);
    assert.ok(ref.y <= v.f(v.a) && ref.y <= v.f(v.b),`Концы интервала ${v.id}`);
  });
});
test('Все применимые методы достигают ε и сохраняют истинный минимум', () => {
  assert.equal(typeof core.solve,'function');
  for (const v of core.variants) for (const m of core.methods) {
    const r=core.solve(v,m.id,{mode:'epsilon',epsilon:v.epsilon||.001});
    if(r.unavailable) { assert.equal(m.id,'tangent'); assert.ok([6,10].includes(v.id)); continue; }
    const ref=core.reference(v);
    assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.y),`${v.id}/${m.id} finite`);
    assert.ok(r.b-r.a<=2*(v.epsilon||.001)+1e-12,`${v.id}/${m.id}: width ${r.b-r.a}`);
    assert.ok(ref.x>=r.a-1e-9 && ref.x<=r.b+1e-9,`${v.id}/${m.id}: bracket [${r.a},${r.b}] vs ${ref.x}`);
    assert.ok(r.evaluations>0 && r.evaluations<10000,`${v.id}/${m.id}: count`);
  }
});
test('Фиксированный N никогда не превышается и каждый интервал содержит минимум', () => {
  assert.equal(typeof core.solve,'function');
  for(const v of core.variants) for(const m of core.methods) for(const N of [18,21,22,23]) {
    const r=core.solve(v,m.id,{mode:'budget',budget:N});
    if(r.unavailable) continue;
    assert.ok(r.evaluations<=N,`${v.id}/${m.id}: ${r.evaluations}>${N}`);
    const x=core.reference(v).x;
    assert.ok(x>=r.a-1e-9&&x<=r.b+1e-9,`${v.id}/${m.id}/N=${N}: bracket`);
  }
});
test('Недопустимые параметры вызывают понятную ошибку',()=>{
  assert.equal(typeof core.solve,'function');
  for(const options of [{mode:'budget',budget:2},{mode:'budget',budget:20.5},{mode:'epsilon',epsilon:0},{mode:'epsilon',epsilon:NaN}]) assert.throws(()=>core.solve(core.variants[0],'golden',options));
});
