import{j as a}from"./jsx-runtime-D_zvdyIk.js";import{r as b}from"./iframe-DUMvxUKi.js";import"./preload-helper-Dp1pzeXC.js";function u({name:c,value:p,onChange:i,options:m,ariaLabel:v,className:g=""}){const f=b.useId(),y=c??`p31-radio-${f}`;return a.jsx("div",{role:"radiogroup","aria-label":v,className:g,style:{display:"flex",flexDirection:"column",gap:4},children:m.map(e=>{const n=e.value===p,t=`${y}-${e.value}`;return a.jsxs("div",{style:{display:"flex",alignItems:"center",gap:2},children:[a.jsx("span",{role:"radio",id:t,tabIndex:n?0:-1,"aria-checked":n,className:"radio",onClick:()=>i(e.value),onKeyDown:s=>{(s.key===" "||s.key==="Enter")&&(s.preventDefault(),i(e.value))},children:a.jsx("span",{className:"radio-dot","aria-hidden":"true"})}),a.jsxs("label",{htmlFor:t,className:"field-label",children:[e.label,e.description&&a.jsx("span",{style:{display:"block",color:"var(--p31-text-tertiary)",fontSize:"var(--p31-scale-xs)"},children:e.description})]})]},e.value)})})}u.__docgenInfo={description:'Radiogroup rendered with the spoon-dial pattern: large touch targets,\nvisible focus rings, `role="radiogroup"` semantics.',methods:[],displayName:"RadioGroup",props:{name:{required:!1,tsType:{name:"string"},description:""},value:{required:!0,tsType:{name:"string"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},options:{required:!0,tsType:{name:"unknown"},description:""},ariaLabel:{required:!1,tsType:{name:"string"},description:"Group-level accessible label (visually hidden)"},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const k={title:"Primitives/RadioGroup",component:u,tags:["autodocs"]},r={args:{value:"a",ariaLabel:"Choice",options:[{value:"a",label:"Alpha"},{value:"b",label:"Beta"}]}};var l,o,d;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    "value": "a",
    "ariaLabel": "Choice",
    "options": [{
      "value": "a",
      "label": "Alpha"
    }, {
      "value": "b",
      "label": "Beta"
    }]
  } as never
}`,...(d=(o=r.parameters)==null?void 0:o.docs)==null?void 0:d.source}}};const q=["Default"];export{r as Default,q as __namedExportsOrder,k as default};
