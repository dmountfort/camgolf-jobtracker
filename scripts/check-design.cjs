const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');

function load(file){
 const mod={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',source)(require,mod,mod.exports);
 return mod.exports;
}

const Filter=load('app/components/status-filter.tsx').default;
for(const value of ['all','open','closed']){
 let changed;
 const element=Filter({value,onChange:v=>{changed=v}});
 const buttons=element.props.children;
 assert.equal(buttons.length,3);
 assert.equal(buttons.filter(b=>b.props['aria-pressed']).length,1);
 buttons.forEach((button,i)=>{assert.equal(button.props.type,'button');button.props.onClick();assert.equal(changed,['all','open','closed'][i])});
 const html=renderToStaticMarkup(element);
 assert.match(html,/aria-label="Filter job status"/);
 assert.doesNotMatch(html,/Draft|Awaiting review/);
}
const Title=load('app/components/section-title.tsx').default;
assert.match(renderToStaticMarkup(React.createElement(Title,{number:2,title:'Golf cars',detail:'2 cars added'})),/2 cars added/);

const {firstInvalidField}=load('lib/field-validation.ts');
let checks=[];
const control=(name,valid)=>({checkValidity(){checks.push(name);return valid}});
const first=control('customer',false),second=control('cart',false);
const mockForm={querySelectorAll(selector){assert.equal(selector,'input,textarea,select');return [first,second]}};
assert.equal(firstInvalidField(mockForm),first);
assert.deepEqual(checks,['customer'],'Only the first invalid field should be revealed, never multiple steps');
assert.equal(firstInvalidField({querySelectorAll:()=>[control('date',true)]}),undefined);
let usedSelector='';
assert.equal(firstInvalidField({querySelectorAll:s=>{usedSelector=s;return [second]}},1),second);
assert.equal(usedSelector,'[data-step="1"] input,[data-step="1"] textarea,[data-step="1"] select');

const field=fs.readFileSync('app/components/field-editor.tsx','utf8');
assert.match(field,/noValidate onSubmit=\{save\}/);
assert.match(field,/if\(!validateFields\(\)\)return/);
assert.match(field,/if\(saving\|\|photosBusy\|\|closed\)return/);
assert.match(field,/await photos\.current\?\.upload/);
assert.doesNotMatch(field,/SpeechRecognition|invoiceNumber|setStatus|Saved automatically/);
for(let step=0;step<4;step++)assert.match(field,new RegExp('data-step="'+step+'"'));
const shell=fs.readFileSync('app/components/admin-shell.tsx','utf8');
assert.doesNotMatch(shell,/href:"\/vehicles"|href:"\/team"/);
for(const font of ['archivo-regular.ttf','archivo-bold.ttf'])assert.ok(fs.statSync('public/fonts/'+font).size>10000);
console.log('PASS: status controls, section labels, first-invalid-field navigation, role UI guards and local fonts.');
