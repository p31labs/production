import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as v}from"./iframe-DUMvxUKi.js";import"./preload-helper-Dp1pzeXC.js";function d({label:l,hideLabel:c,options:p,error:a,id:m,className:u="",...b}){const f=v.useId(),s=m??`p31-select-${f}`;return e.jsxs("div",{className:u,children:[l&&e.jsx("label",{htmlFor:s,className:`field-label ${c?"sr-only":""}`,style:{display:"block",marginBottom:6},children:l}),e.jsx("select",{id:s,className:"select","aria-invalid":a?!0:void 0,"aria-describedby":a?`${s}-error`:void 0,...b,children:p.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))}),a&&e.jsx("p",{id:`${s}-error`,className:"field-error",role:"alert",children:a})]})}d.__docgenInfo={description:"Native select styled with the glass recipe — keyboard/mobile behavior intact.",methods:[],displayName:"Select",props:{label:{required:!1,tsType:{name:"ReactNode"},description:""},hideLabel:{required:!1,tsType:{name:"boolean"},description:""},options:{required:!0,tsType:{name:"unknown"},description:""},error:{required:!1,tsType:{name:"string"},description:"Validation message"},id:{required:!1,tsType:{name:"string"},description:""},className:{defaultValue:{value:"''",computed:!1},required:!1}},composes:["Omit"]};const x={title:"Primitives/Select",component:d,tags:["autodocs"]},r={args:{label:"Tier",options:[{value:"1",label:"One"},{value:"2",label:"Two"}]}};var i,o,n;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    "label": "Tier",
    "options": [{
      "value": "1",
      "label": "One"
    }, {
      "value": "2",
      "label": "Two"
    }]
  } as never
}`,...(n=(o=r.parameters)==null?void 0:o.docs)==null?void 0:n.source}}};const T=["Default"];export{r as Default,T as __namedExportsOrder,x as default};
